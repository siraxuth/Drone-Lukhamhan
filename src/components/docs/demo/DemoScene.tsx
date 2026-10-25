'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Line, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { paintForTheme } from '@/scene/paint';
import { sample, WORLD, type St, type Step } from './script';

export type Clock = { t: number; playing: boolean; total: number; segs: { t0: number; len: number }[] };

const TAU = Math.PI * 2;
const D2R = THREE.MathUtils.degToRad;
const PROP_R = 0.238;

type Props = {
  steps: Step[];
  states: St[];
  clock: Clock;
  cur: number;
  dark: boolean;
  active: boolean;
  onStep: (i: number) => void;
};

function Drone({ steps, states, clock, onStep, hasBall, dark }: Pick<Props, 'steps' | 'states' | 'clock' | 'onStep' | 'dark'> & { hasBall: boolean }) {
  const { scene } = useGLTF('/models/drone-lite.glb');
  const pos = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Mesh>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const head = useRef<THREE.Group>(null);
  const pole = useRef<THREE.Mesh>(null);
  const last = useRef(-1);

  const rig = useMemo(() => {
    const model = scene.clone(true);
    const props = [1, 2, 3, 4].map((n) => {
      const node = model.getObjectByName(`Prop_${n}`);
      const blurMat = new THREE.MeshBasicMaterial({ color: '#9aa3b2', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const blur = new THREE.Mesh(new THREE.RingGeometry(0.03, PROP_R, 40), blurMat);
      blur.rotation.x = -Math.PI / 2;
      node?.add(blur);
      return { node, cw: n % 2 === 1, blurMat };
    });
    const box = new THREE.Box3().setFromObject(model);
    return { model, props, rest: -box.min.y };
  }, [scene]);

  useEffect(() => { paintForTheme(rig.model, dark); }, [rig, dark]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    if (clock.playing) clock.t += dt;
    if (clock.t > clock.total + 1.1) { clock.t = 0; }
    let i = 0;
    while (i < steps.length - 1 && clock.t >= clock.segs[i + 1].t0) i++;
    const seg = clock.segs[i];
    const u = Math.min(1, Math.max(0, (clock.t - seg.t0) / seg.len));
    if (i !== last.current) { last.current = i; onStep(i); }
    const p = sample(states[i], steps[i], u);

    const y = p.h * WORLD + rig.rest;
    pos.current?.position.set(p.x * WORLD, y, p.z * WORLD);
    if (pos.current) pos.current.rotation.y = -D2R(p.yaw) + Math.PI;
    tilt.current?.rotation.set(D2R(p.pitch), 0, D2R(p.roll));

    rig.props.forEach((pr) => {
      if (pr.node) pr.node.rotation.y += (pr.cw ? -1 : 1) * p.spin * 4 * TAU * dt;
      pr.blurMat.opacity = p.spin * 0.42;
    });

    if (ball.current) {
      ball.current.visible = hasBall && p.ball !== 'none';
      if (p.by !== 0) ball.current.position.set(p.bx * WORLD, Math.max(0.1, y + p.by * WORLD - 0.06), p.bz * WORLD);
      else ball.current.position.set(p.bx * WORLD, 0.1, p.bz * WORLD);
    }
    if (shadow.current) {
      shadow.current.position.set(p.x * WORLD, 0.012, p.z * WORLD);
      const k = Math.max(0.55, 1 - p.h * 0.0016);
      shadow.current.scale.setScalar(k);
      (shadow.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0.1, 0.34 - p.h * 0.0012);
    }
    if (head.current) {
      head.current.position.set(p.x * WORLD, 0.02, p.z * WORLD);
      head.current.rotation.y = -D2R(p.yaw);
    }
    if (pole.current) {
      pole.current.visible = p.h > 6;
      pole.current.position.set(p.x * WORLD, (y - 0.12) / 2, p.z * WORLD);
      pole.current.scale.set(1, Math.max(0.001, y - 0.12), 1);
    }
  });

  return (
    <>
      <group ref={pos}>
        <group ref={tilt}>
          <primitive object={rig.model} scale={0.78} />
        </group>
      </group>
      <mesh ref={shadow} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.52, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      {/* เส้นบอกความสูง: จากพื้นขึ้นมาถึงท้องโดรน */}
      <mesh ref={pole}>
        <cylinderGeometry args={[0.008, 0.008, 1, 6]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.65} />
      </mesh>
      {/* ลูกศรบนพื้นบอกทิศหัว */}
      <group ref={head}>
        <mesh position={[0, 0, -0.95]} rotation-x={-Math.PI / 2}>
          <coneGeometry args={[0.12, 0.28, 3]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.85} />
        </mesh>
      </group>
      <mesh ref={ball} visible={false}>
        <sphereGeometry args={[0.1, 20, 14]} />
        <meshStandardMaterial color="#ef4444" roughness={0.45} />
      </mesh>
    </>
  );
}

/** เส้นทางบนพื้น: ช่วงที่บินผ่านแล้วทึบ ช่วงนี้ประ ช่วงต่อไปจาง */
function Trails({ steps, states, cur }: Pick<Props, 'steps' | 'states' | 'cur'>) {
  return (
    <>
      {steps.map((s, i) => {
        if (s.kind !== 'move' && s.kind !== 'dir') return null;
        const a = states[i], b = states[i + 1];
        const A: [number, number, number] = [a.x * WORLD, 0.02, a.z * WORLD];
        const B: [number, number, number] = [b.x * WORLD, 0.02, b.z * WORLD];
        const now = i === cur;
        return (
          <group key={i}>
            <Line points={[A, B]} color="#3b82f6" lineWidth={now ? 3 : 2} dashed={now} dashSize={0.14} gapSize={0.1} transparent opacity={i < cur ? 0.85 : now ? 1 : 0.25} />
            {(now || i < cur) && (
              <mesh position={B} rotation-x={-Math.PI / 2}>
                <ringGeometry args={[0.2, 0.27, 32]} />
                <meshBasicMaterial color="#3b82f6" transparent opacity={now ? 0.9 : 0.5} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

function Frame({ states }: { states: St[] }) {
  const { camera } = useThree();
  const f = useMemo(() => {
    const xs = states.map((s) => s.x * WORLD), zs = states.map((s) => s.z * WORLD), hs = states.map((s) => s.h * WORLD);
    const minx = Math.min(...xs), maxx = Math.max(...xs), minz = Math.min(...zs), maxz = Math.max(...zs);
    const ext = Math.max(maxx - minx, maxz - minz, 0);
    return { cx: (minx + maxx) / 2, cz: (minz + maxz) / 2, ext, hmax: Math.max(...hs) };
  }, [states]);
  useEffect(() => {
    const d = Math.max(4.4, f.ext * 1.55 + 3.2 + f.hmax * 0.6);
    camera.position.set(f.cx, d * 0.6 + f.hmax * 0.3, f.cz + d * 0.8);
    camera.lookAt(f.cx, 0.3 + f.hmax * 0.42, f.cz);
    camera.updateProjectionMatrix();
  }, [camera, f]);
  return null;
}

export default function DemoScene(props: Props) {
  const { steps, states, dark, active } = props;
  const hasBall = steps.some((s) => s.kind === 'drop');
  const size = useMemo(() => {
    const m = Math.max(...states.map((s) => Math.max(Math.abs(s.x), Math.abs(s.z)))) * WORLD;
    return Math.ceil(Math.max(6, m * 2 + 8));
  }, [states]);
  const cx = useMemo(() => (Math.min(...states.map((s) => s.x)) + Math.max(...states.map((s) => s.x))) / 2 * WORLD, [states]);
  const cz = useMemo(() => (Math.min(...states.map((s) => s.z)) + Math.max(...states.map((s) => s.z))) / 2 * WORLD, [states]);

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: 32, near: 0.1, far: 80, position: [0, 4, 6] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power', stencil: false }}
      frameloop={active ? 'always' : 'never'}
      aria-hidden
    >
      <Frame states={states} />
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#c7d7ff', '#1a1a22', 0.7]} />
      <directionalLight position={[4, 6, 5]} intensity={2.6} />
      <directionalLight position={[-5, 2, -3]} intensity={1.6} color="#6aa8ff" />
      <Environment resolution={48}>
        <Lightformer form="rect" intensity={3} position={[0, 5, 3]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={2} color="#3b82f6" position={[-6, 0, 2]} scale={[2, 8, 1]} />
        <Lightformer form="rect" intensity={2} color="#ef4466" position={[6, 1, -2]} scale={[2, 8, 1]} />
      </Environment>

      <mesh rotation-x={-Math.PI / 2} position={[cx, -0.002, cz]}>
        <circleGeometry args={[size / 2, 64]} />
        <meshStandardMaterial color={dark ? '#27272a' : '#e4e4e7'} roughness={1} metalness={0} />
      </mesh>
      <gridHelper args={[size, size * 2, dark ? '#52525b' : '#a1a1aa', dark ? '#3f3f46' : '#d4d4d8']} position={[Math.round(cx), 0.003, Math.round(cz)]} />

      <Trails steps={steps} states={states} cur={props.cur} />
      <Drone steps={steps} states={states} clock={props.clock} onStep={props.onStep} hasBall={hasBall} dark={dark} />
    </Canvas>
  );
}

useGLTF.preload('/models/drone-lite.glb');
