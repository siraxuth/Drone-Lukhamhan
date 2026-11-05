'use client';

import { DRONE_MODEL } from '@/lib/drone-assets';

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useGLTF, useTexture } from '@react-three/drei';
import { baseAt } from '@/lib/scenarios';
import { PlainMat, SceneLayer3D, type SceneSpec } from './SceneObjects';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { FIELD } from './layout';
import { heading, type DroneState } from './aim';
import { balloonId } from './layout';
import type { RuleEvent } from '@/rules/types';
import type { Measurement } from '@/flight/measurements';
import { FieldDimensions3D, FieldMeasurements3D } from './FieldMeasurements3D';

export type ViewPreset = 'top' | 'chase';
export type Shot = { from: [number, number, number]; to: [number, number, number]; ok: boolean; mount?: 'front' | 'back'; id?: number; t?: number; terminal?: boolean; speed?: number } | null;
export type ShotHighlight = { id: number; from: [number, number, number]; to: [number, number, number] } | null;

/** ท่าโดรนขณะเล่นการบินจำลอง (เมตร/องศา) — เขียนจากนอก Canvas ทุกเฟรมโดยไม่ผ่าน React state */
export type LivePose = { x: number; y: number; alt: number; yaw: number; pitch: number; roll: number; spin: number };
/** สิ่งที่เปลี่ยนบนสนามระหว่างบิน (เปลี่ยนเฉพาะตอนเกิดเหตุการณ์) */
export type Marks = { popped: string[]; balls: Array<{ x: number; y: number }>; darts: Array<NonNullable<Shot>> };
export const NO_MARKS: Marks = { popped: [], balls: [], darts: [] };

type Props = {
  event: RuleEvent;
  drone: DroneState;
  onDrone: (patch: Partial<DroneState>) => void;
  view: ViewPreset;
  shot: Shot;
  low: boolean;
  live?: boolean;
  poseRef?: React.RefObject<LivePose>;
  playheadRef?: React.RefObject<number>;
  marks?: Marks;
  highlight?: ShotHighlight;
  dartInventory?: { front: number; back: number };
  /** เปลี่ยนค่าทุกครั้งที่เกิด poshold → เล่นเอฟเฟกต์วงล็อกตำแหน่ง */
  holdKey?: number;
  /** บอลที่บรรจุอยู่บนตัวโดรน (ชุดซ้าย/ขวา) */
  loaded?: { L: number; R: number };
  /** โจทย์ฝึก: ลายสนามและวัตถุ (ไม่ใส่ = สนามแข่งจริงตามประเภท) */
  scene?: SceneSpec;
  measurements?: Measurement[];
  showDimensions?: boolean;
  dimensionFrom?: string;
  dimensionTo?: string;
};

/** สนามอยู่ในพิกัดเมตร: field(x,y) → three(x, 0, -y) เพื่อให้ "เหนือ" อยู่ไกลจากกล้องเริ่มต้น */
const p3 = (x: number, y: number, z = 0): [number, number, number] => [x, z, -y];

const C = {
  orange: '#c2641a',
  orangeDark: '#8a4510',
  blue: '#1d3fae',
  green: '#1f9d3a',
  red: '#c8202f',
  steel: '#2a2f3a',
};

export function Mat({ low }: { low: boolean }) {
  const tex = useTexture(low ? '/field/mat-1024.webp' : '/field/mat-2048.webp');
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = low ? 2 : 8;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
      <planeGeometry args={[FIELD.size, FIELD.size]} />
      <meshStandardMaterial map={tex} roughness={0.9} metalness={0} />
    </mesh>
  );
}

function Surround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#111318" roughness={1} />
    </mesh>
  );
}

export function Takeoff({ color, hoop = true }: { color: 'green' | 'red'; hoop?: boolean }) {
  const s = FIELD.takeoff.size, h = FIELD.takeoff.height;
  const { size: hs, bottom, top } = FIELD.hoop;
  const t = 0.065;
  const col = color === 'green' ? C.green : C.red;
  const bars: Array<[[number, number, number], [number, number, number]]> = [];
  const half = hs / 2;
  const hy = top / 2;
  // 4 เสา
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bars.push([[sx * half, hy, sz * half], [t, top, t]]);
  // วงบนและวงล่าง
  for (const y of [bottom, top]) {
    for (const sz of [-1, 1]) bars.push([[0, y, sz * half], [hs, t, t]]);
    for (const sx of [-1, 1]) bars.push([[sx * half, y, 0], [t, t, hs]]);
  }
  return (
    <group>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[s, h, s]} />
        <meshStandardMaterial color={col} roughness={0.7} />
      </mesh>
      <mesh position={[0, h + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[s * 0.62, s * 0.62]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>
      {hoop && bars.map(([pos, size], i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={size} />
          <meshStandardMaterial color={C.orange} roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

export function Platforms() {
  const { radius, height, approx } = FIELD.platform;
  return (
    <>
      {FIELD.platform.positions.map(([x, y], i) => (
        <group key={i} position={p3(x, y)}>
          <mesh position={[0, height / 2, 0]}>
            <cylinderGeometry args={[radius, radius, height, 48]} />
            <meshStandardMaterial color={C.blue} roughness={0.55} />
          </mesh>
          <mesh position={[0, height + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius * 0.92, radius * 0.96, 64]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, height + approx.coverHeight / 2, 0]}>
            <cylinderGeometry args={[radius, radius, approx.coverHeight, 48, 1, true]} />
            <meshStandardMaterial color="#cfe3ff" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export function Balloons({ popped }: { popped: string[] }) {
  const { pillar, totalHeight, spacing, groups } = FIELD.balloons;
  const items: Array<[number, number, string]> = [];
  groups.forEach((g, gi) => {
    for (let k = -1; k <= 1; k++) items.push([g.center[0] + (g.along === 'x' ? k * spacing : 0), g.center[1] + (g.along === 'y' ? k * spacing : 0), balloonId(gi, k)]);
  });
  return (
    <>
      {items.map(([x, y, id], i) => (
        <BalloonUnit key={i} x={x} y={y} popped={popped.includes(id)} pillarHeight={pillar.height} pillarSize={pillar.size} radius={(totalHeight - pillar.height) / 2} />
      ))}
    </>
  );
}

function BalloonUnit({ x, y, popped, pillarHeight, pillarSize, radius }: { x: number; y: number; popped: boolean; pillarHeight: number; pillarSize: number; radius: number }) {
  const skin = useRef<THREE.Mesh>(null);
  const shards = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const start = useRef<number | null>(null);
  const { invalidate } = useThree();
  useFrame((state) => {
    if (!popped) {
      start.current = null;
      if (skin.current) { skin.current.visible = true; skin.current.scale.set(1, 1.15, 1); }
      if (shards.current) shards.current.visible = false;
      if (ring.current) ring.current.visible = false;
      return;
    }
    if (start.current === null) start.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - start.current;
    const shrink = Math.min(1, elapsed / 0.24);
    if (skin.current) {
      skin.current.visible = shrink < 1;
      skin.current.scale.setScalar(shrink < 0.22 ? 1 + shrink * 1.3 : Math.max(0.01, (1 - shrink) * 1.6));
    }
    if (shards.current) {
      shards.current.visible = elapsed < 0.55;
      shards.current.children.forEach((piece, i) => {
        const angle = i * Math.PI / 4;
        piece.position.set(Math.cos(angle) * elapsed * 0.45, Math.sin(i * 3) * elapsed * 0.28, Math.sin(angle) * elapsed * 0.45);
        piece.rotation.set(elapsed * (i + 1) * 7, elapsed * 9, angle);
        ((piece as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - elapsed / 0.55);
      });
    }
    if (ring.current) {
      ring.current.visible = elapsed < 0.4;
      ring.current.scale.setScalar(0.3 + elapsed * 5);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 - elapsed * 2.2);
    }
    if (elapsed < 0.55) invalidate();
  });
  return (
    <group position={p3(x, y)}>
      <mesh position={[0, pillarHeight / 2, 0]}>
        <boxGeometry args={[pillarSize, pillarHeight, pillarSize]} />
        <meshStandardMaterial color={C.orange} roughness={0.6} />
      </mesh>
      <group position={[0, pillarHeight + radius, 0]}>
        <mesh ref={skin} scale={[1, 1.15, 1]}>
          <sphereGeometry args={[radius, 20, 16]} />
          <meshStandardMaterial color={C.red} roughness={0.25} metalness={0.2} />
        </mesh>
        <group ref={shards} visible={false}>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i}>
              <coneGeometry args={[0.022, 0.055, 3]} />
              <meshBasicMaterial color={i % 2 ? '#f0444f' : '#ae1826'} transparent opacity={1} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
        <mesh ref={ring} visible={false}>
          <torusGeometry args={[0.1, 0.008, 8, 32]} />
          <meshBasicMaterial color="#ff8a83" transparent opacity={0.85} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

/** เป้ายิง Ø1 ม. 6 วง (20,18,16,14,12,10) วาดด้วย canvas texture ลูกเดียว */
function useTargetTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d')!;
    // วาดจากวงนอกสุดเข้ามา: 10 น้ำเงิน, 12 ฟ้า, 14 เขียว, 16 เหลือง, 18 ส้ม, 20 แดง (ตามภาพกติกา)
    const order = ['#1b2f9c', '#1f6feb', '#2a9d3a', '#e6c200', '#f28c00', '#d62828'];
    g.fillStyle = '#f2f2f2';
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(256, 256, 250 - i * (250 / 6), 0, Math.PI * 2);
      g.fillStyle = order[i];
      g.fill();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 3;
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

export function Targets() {
  const tex = useTargetTexture();
  const { diameter, centerHeight, positions } = FIELD.target;
  return (
    <>
      {positions.map(([x, y], i) => {
        const facing = y > 0 ? 0 : Math.PI; // ด้านบนหันหน้าเข้าหากลางสนาม (ใต้) → +z ของ three
        return (
          <group key={i} position={p3(x, y)} rotation={[0, facing, 0]}>
            <mesh position={[0, centerHeight, 0.01]}>
              <circleGeometry args={[diameter / 2, 64]} />
              <meshStandardMaterial map={tex} roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
            {[-1, 1].map((s) => (
              <group key={s}>
                <mesh position={[s * (diameter / 2 + 0.03), centerHeight / 2, -0.02]}>
                  <boxGeometry args={[0.05, centerHeight + 0.5, 0.05]} />
                  <meshStandardMaterial color={C.orange} />
                </mesh>
                <mesh position={[s * (diameter / 2 + 0.03), 0.025, -0.02]}>
                  <boxGeometry args={[0.07, 0.05, 0.5]} />
                  <meshStandardMaterial color={C.orangeDark} />
                </mesh>
              </group>
            ))}
            <mesh position={[0, centerHeight - 0.2, -0.02]}>
              <boxGeometry args={[diameter + 0.1, 0.04, 0.04]} />
              <meshStandardMaterial color={C.orange} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/** วงห้ามยิง: ห่างเป้าน้อยกว่า 1 ม. */
function ShootZones({ drone }: { drone: DroneState }) {
  return (
    <>
      {FIELD.target.positions.map(([x, y], i) => {
        const d = Math.hypot(drone.x - x, drone.y - y);
        const near = d < FIELD.target.minShootDistance;
        return (
          <mesh key={i} position={p3(x, y, 0.012)} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[FIELD.target.minShootDistance - 0.025, FIELD.target.minShootDistance, 64]} />
            <meshBasicMaterial color={near ? '#ef4466' : '#4aa3ff'} transparent opacity={0.85} />
          </mesh>
        );
      })}
    </>
  );
}

function Surroundings() {
  const { bannerHeight, poleHeight } = FIELD.approx;
  const h = FIELD.size / 2;
  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * h, bannerHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[FIELD.size, bannerHeight, 0.04]} />
            <meshStandardMaterial color="#0f1c3a" roughness={0.7} />
          </mesh>
          {[-1, 1].map((z) => (
            <mesh key={z} position={[s * h, poleHeight / 2, z * h]}>
              <cylinderGeometry args={[0.03, 0.03, poleHeight, 10]} />
              <meshStandardMaterial color={C.orange} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

export function DroneModel({ low, propsRef }: { low: boolean; propsRef?: React.MutableRefObject<THREE.Object3D[]> }) {
  const { scene } = useGLTF(low ? DRONE_MODEL.low : DRONE_MODEL.high);
  const model = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const recolor = (source: THREE.Material) => {
        const material = source.clone();
        const standard = material as THREE.MeshStandardMaterial;
        if (standard.color) {
          if (material.name === 'Black' || material.name === 'White battery wrap') standard.color.set('#111317');
          else if (material.name === 'White motor index') standard.color.set('#262a30');
          else standard.color.set('#1b1e23');
        }
        if ('metalness' in standard) { standard.metalness = 0.04; standard.roughness = 0.62; }
        return material;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(recolor) : recolor(mesh.material);
    });
    return copy;
  }, [scene]);
  useEffect(() => {
    if (!propsRef) return;
    propsRef.current = [1, 2, 3, 4].map((n) => model.getObjectByName(`Prop_${n}`)).filter(Boolean) as THREE.Object3D[];
  }, [model, propsRef]);
  // 1 หน่วยโมเดล = 160 มม.
  return <primitive object={model} scale={0.16} />;
}

/** ความสูงพื้นผิวใต้โดรน: บนแท่น Takeoff/แท่นวงกลมสูง 20 ซม. นอกนั้นคือพื้นสนาม */
function groundY(x: number, y: number, platforms: boolean) {
  if (Math.abs(x) <= FIELD.takeoff.size / 2 && Math.abs(y) <= FIELD.takeoff.size / 2) return FIELD.takeoff.height + 0.004;
  if (platforms && FIELD.platform.positions.some(([px, py]) => Math.hypot(px - x, py - y) <= FIELD.platform.radius)) return FIELD.platform.height + 0.004;
  return 0.016;
}

function Drone({ drone, onDrone, setDragging, low, live, poseRef, platforms, loaded, dartInventory, needle }: { drone: DroneState; onDrone: Props['onDrone']; setDragging: (v: boolean) => void; low: boolean; live: boolean; poseRef?: React.RefObject<LivePose>; platforms: boolean; loaded: { L: number; R: number }; dartInventory: { front: number; back: number }; needle: boolean }) {
  const dragging = useRef(false);
  const lim = FIELD.size / 2 - 0.15;
  const clamp = (v: number) => Math.max(-lim, Math.min(lim, v));
  const yawGroup = useRef<THREE.Group>(null);
  const tiltGroup = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const beacon = useRef<THREE.Mesh>(null);
  const plumb = useRef<THREE.Mesh>(null);
  const aim = useRef<THREE.Mesh>(null);
  const propNodes = useRef<THREE.Object3D[]>([]);
  const spinAngle = useRef(0);
  const h = heading(drone.yaw);
  const { invalidate } = useThree();

  // ระหว่างบินจำลอง: อ่านท่าจาก poseRef ทุกเฟรมแล้วตั้งค่าตรงๆ (ไม่ผ่าน React)
  useFrame((_, rawDt) => {
    if (!live || !poseRef?.current) return;
    const p = poseRef.current;
    const dt = Math.min(rawDt, 1 / 20);
    const [px, py, pz] = p3(p.x, p.y, p.alt);
    yawGroup.current?.position.set(px, py, pz);
    if (yawGroup.current) yawGroup.current.rotation.y = Math.PI - (p.yaw * Math.PI) / 180;
    if (tiltGroup.current) tiltGroup.current.rotation.set((p.pitch * Math.PI) / 180, 0, (p.roll * Math.PI) / 180, 'XYZ');
    const gy = groundY(p.x, p.y, platforms);
    beacon.current?.position.set(px, gy + 0.004, pz);
    if (shadow.current) { shadow.current.position.set(px, gy, pz); (shadow.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0.12, 0.5 - p.alt * 0.25); }
    if (plumb.current) { plumb.current.position.set(px, (p.alt + gy) / 2, -p.y); plumb.current.scale.y = Math.max(0.01, p.alt - gy); }
    if (aim.current) {
      aim.current.visible = false;
      const hx = Math.sin((p.yaw * Math.PI) / 180), hy = Math.cos((p.yaw * Math.PI) / 180);
      aim.current.position.set(p.x + hx * 2.5, p.alt, -(p.y + hy * 2.5));
      aim.current.rotation.set(Math.PI / 2, 0, -(p.yaw * Math.PI) / 180);
    }
    spinAngle.current += p.spin * dt * Math.PI * 2 * 9; // รอบต่อวินาทีสูงสุด ~9 (ภาพจะเห็นเป็นใบพัดหมุนเร็ว)
    propNodes.current.forEach((n, idx) => { n.rotation.y = (idx % 2 === 0 ? -1 : 1) * spinAngle.current; });
    invalidate();
  });

  const base = live && poseRef?.current ? poseRef.current : null;
  const ax = base ? base.x : drone.x, ay = base ? base.y : drone.y, aalt = base ? base.alt : drone.alt, ayaw = base ? base.yaw : drone.yaw;
  return (
    <>
      {/* เงาจุดใต้โดรน (ราคาถูกกว่าเงาจริง) */}
      <mesh ref={shadow} position={p3(ax, ay, groundY(ax, ay, platforms))} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={Math.max(0.12, 0.5 - aalt * 0.25)} depthWrite={false} />
      </mesh>
      {/* วงสีฟ้ารอบจุดใต้โดรน ให้เห็นตำแหน่งแม้โดรนสีดำบนพื้นมืด */}
      <mesh ref={beacon} position={p3(ax, ay, groundY(ax, ay, platforms) + 0.004)} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.34, 40]} />
        <meshBasicMaterial color="#4aa3ff" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      {/* เส้นดิ่งลงพื้น (สูง 1 ม. แล้วยืดตามความสูง) */}
      <mesh ref={plumb} position={p3(ax, ay, (aalt + groundY(ax, ay, platforms)) / 2)} scale={[1, Math.max(0.01, aalt - groundY(ax, ay, platforms)), 1]}>
        <cylinderGeometry args={[0.004, 0.004, 1, 6]} />
        <meshBasicMaterial color="#9aa3b2" transparent opacity={0.6} />
      </mesh>
      {/* เส้นเล็งไปข้างหน้า */}
      <mesh ref={aim} position={p3(ax + h.x * 2.5, ay + h.y * 2.5, aalt)} rotation={[Math.PI / 2, 0, -(ayaw * Math.PI) / 180]}>
        <cylinderGeometry args={[0.006, 0.006, 5, 6]} />
        <meshBasicMaterial color="#ef4466" transparent opacity={0.55} />
      </mesh>
      <group
        ref={yawGroup}
        position={p3(ax, ay, aalt)}
        rotation={[0, Math.PI - (ayaw * Math.PI) / 180, 0]}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          if (live) return;
          e.stopPropagation();
          (e.target as Element).setPointerCapture?.(e.pointerId);
          dragging.current = true;
          setDragging(true);
        }}
        onPointerUp={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          dragging.current = false;
          setDragging(false);
        }}
      >
        {/* พื้นที่จับให้ใหญ่ขึ้นบนจอสัมผัส */}
        <mesh visible={false}>
          <sphereGeometry args={[0.35, 8, 8]} />
        </mesh>
        <pointLight position={[0, 0.5, 0.2]} intensity={2.2} distance={3} color="#cfe0ff" />
        <group ref={tiltGroup}>
          <DroneModel low={low} propsRef={propNodes} />
          <DroneBalls loaded={loaded} />
          {dartInventory.front + dartInventory.back > 0 && <DroneDartRack inventory={dartInventory} />}
          {needle && <DroneNeedle />}
        </group>
      </group>
      {/* ระนาบรับการลาก/แตะ ครอบทั้งสนามที่ระดับพื้น */}
      {!live && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, 0]}
          onPointerMove={(e: ThreeEvent<PointerEvent>) => {
            if (!dragging.current) return;
            onDrone({ x: clamp(e.point.x), y: clamp(-e.point.z) });
          }}
          onPointerUp={() => { dragging.current = false; setDragging(false); }}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            if (e.delta > 4) return; // ลากกล้อง ไม่ใช่แตะ
            onDrone({ x: clamp(e.point.x), y: clamp(-e.point.z) });
          }}
        >
          <planeGeometry args={[FIELD.size, FIELD.size]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </>
  );
}

/** ลูกดอกสองคู่: หัวโดรนหัน +Z และท้ายโดรนหัน -Z */
function DroneDartRack({ inventory }: { inventory: { front: number; back: number } }) {
  return (
    <group>
      <mesh position={[0, 0.048, 0]}>
        <boxGeometry args={[0.16, 0.014, 0.2]} />
        <meshStandardMaterial color="#151e29" metalness={0.8} roughness={0.25} />
      </mesh>
      {(['front', 'back'] as const).flatMap((side) =>
        Array.from({ length: Math.min(2, inventory[side]) }, (_, i) => (
          <group key={`${side}-${i}`} position={[(i - 0.5) * 0.07, 0.065, side === 'front' ? 0.085 : -0.085]} rotation={[side === 'front' ? Math.PI / 2 : -Math.PI / 2, 0, 0]} scale={0.72}>
            <DartModel />
          </group>
        ))
      )}
    </group>
  );
}

/** เข็มปลายโดรนยื่นถึงระยะตรวจชน 12 ซม. จากกึ่งกลางลำตัว */
function DroneNeedle() {
  return (
    <group>
      <mesh position={[0, 0.008, 0.082]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.003, 0.005, 0.055, 8]} />
        <meshStandardMaterial color="#dbe5ed" metalness={0.95} roughness={0.12} />
      </mesh>
      <mesh position={[0, 0.008, 0.118]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.006, 0.03, 8]} />
        <meshStandardMaterial color="#f7fbff" metalness={0.95} roughness={0.08} />
      </mesh>
      <mesh position={[0, 0.008, 0.052]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.013, 0.013, 0.018, 10]} />
        <meshStandardMaterial color="#e34b42" metalness={0.4} roughness={0.25} />
      </mesh>
    </group>
  );
}

/** บอลที่บรรจุอยู่บนตัวโดรน: ถังใสสองข้าง (ซ้าย = ประตู 1&4, ขวา = 2&3) ซ้อนบอลเป็นชั้น ชั้นละ 6 ลูก */
function DroneBalls({ loaded }: { loaded: { L: number; R: number } }) {
  const R = 0.01, gap = 0.022; // เส้นผ่านศูนย์กลาง 2 ซม.
  const cells: Array<[number, number, number, number]> = []; // x,y,z,side
  for (const [sd, sx] of [['L', 1], ['R', -1]] as const) { // โมเดลหันหน้า +Z: ซ้ายของโดรนคือ +X
    const n = Math.min(loaded[sd], 20);
    for (let i = 0; i < n; i++) {
      const layer = Math.floor(i / 6), k = i % 6;
      cells.push([sx * 0.046 + ((k % 2) - 0.5) * gap, 0.014 + layer * gap, (Math.floor(k / 2) - 1) * gap, sx]);
    }
  }
  return (
    <group>
      {[1, -1].map((sx) => (
        <mesh key={sx} position={[sx * 0.046, 0.045, 0]}>
          <boxGeometry args={[0.05, 0.09, 0.072]} />
          <meshStandardMaterial color="#bcd6ff" transparent opacity={0.16} depthWrite={false} />
        </mesh>
      ))}
      {cells.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[R, 8, 6]} />
          <meshBasicMaterial color="#ffd23f" />
        </mesh>
      ))}
    </group>
  );
}

/** เอฟเฟกต์ poshold: วงคลื่นแผ่ออกจากโดรน 2 ชั้น แล้วจางหาย (โดรนล็อกตำแหน่งนิ่ง) */
function HoldPulse({ k, poseRef }: { k: number; poseRef?: React.RefObject<LivePose> }) {
  const g = useRef<THREE.Group>(null);
  const t0 = useRef(-1);
  const last = useRef(0);
  useFrame(() => {
    const grp = g.current;
    if (!grp || !poseRef?.current) return;
    if (k !== last.current) { last.current = k; t0.current = performance.now(); }
    const e = (performance.now() - t0.current) / 1500;
    if (t0.current < 0 || e > 1.4) { grp.visible = false; return; }
    grp.visible = true;
    const p = poseRef.current;
    grp.position.set(p.x, p.alt, -p.y);
    grp.children.forEach((c, i) => {
      const ee = Math.min(1, Math.max(0, e - i * 0.2));
      c.scale.setScalar(0.12 + ee * 0.85);
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - ee) * 0.85;
    });
  });
  return (
    <group ref={g} visible={false}>
      {[0, 1].map((i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.93, 1, 56]} />
          <meshBasicMaterial color={i ? '#ef4466' : '#4aa3ff'} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** ลูกบอลที่ทิ้งลงแท่น + ร่องรอยลูกดอก */
function MarksLayer({ marks, playheadRef }: { marks: Marks; playheadRef?: React.RefObject<number> }) {
  return (
    <>
      {marks.balls.map((b, i) => (
        <mesh key={`b${i}`} position={p3(b.x, b.y, FIELD.platform.height + 0.011 + (i % 3) * 0.002)}>
          <sphereGeometry args={[0.01, 10, 8]} />
          <meshBasicMaterial color="#ffe66d" />
        </mesh>
      ))}
      {marks.darts.map((d, i) => <DartFlight key={`d${i}`} shot={d} playheadRef={playheadRef} />)}
    </>
  );
}

/** ลูกดอกยาว 28 ซม. พุ่งจากโดรน แล้วปักค้างที่เป้าเมื่อยิงถูก */
function DartFlight({ shot, playheadRef }: { shot: NonNullable<Shot>; playheadRef?: React.RefObject<number> }) {
  const dart = useRef<THREE.Group>(null);
  const trail = useRef<THREE.Mesh>(null);
  const impact = useRef<THREE.Group>(null);
  const flash = useRef<THREE.Mesh>(null);
  const born = useRef<number | null>(null);
  const { invalidate } = useThree();
  const { a, b, direction, orientation } = useMemo(() => {
    const a = new THREE.Vector3(...p3(...shot.from));
    const b = new THREE.Vector3(...p3(...shot.to));
    const direction = b.clone().sub(a).normalize();
    const orientation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    return { a, b, direction, orientation };
  }, [shot]);
  const duration = shot.terminal ? 220 / (shot.speed ?? 1) : 220;

  useFrame((state) => {
    if (born.current === null) born.current = state.clock.elapsedTime * 1000;
    const elapsed = shot.t !== undefined && playheadRef && !shot.terminal
      ? Math.max(0, playheadRef.current - shot.t)
      : state.clock.elapsedTime * 1000 - born.current;
    const flight = Math.min(1, elapsed / duration);
    const tip = a.clone().lerp(b, flight);
    if (dart.current) {
      dart.current.visible = shot.ok || elapsed < duration + 450;
      dart.current.position.copy(tip).addScaledVector(direction, -0.14);
      dart.current.quaternion.copy(orientation);
      if (flight < 1) dart.current.rotateY(elapsed * 0.035);
    }
    if (trail.current) {
      const length = a.distanceTo(tip);
      trail.current.visible = flight < 1 && length > 0.01;
      trail.current.position.copy(a).lerp(tip, 0.5);
      trail.current.quaternion.copy(orientation);
      trail.current.scale.y = length;
      (trail.current.material as THREE.MeshBasicMaterial).opacity = (1 - flight) * 0.68;
    }
    if (impact.current) {
      const pulse = Math.max(0, 1 - (elapsed - duration) / 550);
      impact.current.visible = flight >= 1 && pulse > 0;
      impact.current.scale.setScalar(0.45 + (1 - pulse) * 2.3);
      (impact.current.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.opacity = pulse * 0.9;
      if (flash.current) (flash.current.material as THREE.MeshBasicMaterial).opacity = pulse * pulse * 0.55;
    }
    if (!playheadRef && elapsed < duration + 600) invalidate();
  });

  return (
    <group>
      <mesh ref={trail} visible={false}>
        <cylinderGeometry args={[0.003, 0.025, 1, 8]} />
        <meshBasicMaterial color={shot.ok ? '#72f7e8' : '#ff775c'} transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={dart}><DartModel /></group>
      <group ref={impact} position={b} quaternion={orientation} visible={false}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.065, 0.007, 8, 32]} />
          <meshBasicMaterial color={shot.ok ? '#6ef5df' : '#ff765e'} transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh ref={flash}>
          <sphereGeometry args={[0.055, 12, 8]} />
          <meshBasicMaterial color="#fff7df" transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function DartModel() {
  return (
    <group>
      <mesh position={[0, 0.002, 0]}>
        <cylinderGeometry args={[0.008, 0.009, 0.17, 10]} />
        <meshStandardMaterial color="#242d38" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.086, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.025, 10]} />
        <meshStandardMaterial color="#dbe7ee" metalness={0.9} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0.118, 0]}>
        <coneGeometry args={[0.012, 0.044, 10]} />
        <meshStandardMaterial color="#f4f8fa" metalness={0.95} roughness={0.12} />
      </mesh>
      <mesh position={[0, -0.09, 0]}>
        <cylinderGeometry args={[0.012, 0.011, 0.025, 10]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.55} roughness={0.3} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[0, i * Math.PI * 2 / 3, 0]}>
          <mesh position={[0, -0.082, 0.024]}>
            <boxGeometry args={[0.004, 0.085, 0.055]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.2} roughness={0.48} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** กล้อง: ตั้งตำแหน่งตามมุมที่เลือก แล้วให้ผู้ใช้หมุน/ซูมต่อได้ */
function CameraRig({ view, topH, drone, dragging, live, poseRef, highlight }: { view: ViewPreset; topH: number; drone: DroneState; dragging: boolean; live: boolean; poseRef?: React.RefObject<LivePose>; highlight?: ShotHighlight }) {
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera, invalidate } = useThree();
  const droneRef = useRef(drone);
  const cinematic = useRef<{ view: ViewPreset; position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  droneRef.current = drone;

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const cam = camera as THREE.PerspectiveCamera;
    if (view === 'top') { cam.position.set(0, topH, 0.01); c.target.set(0, 0, 0); }
    c.update();
    invalidate();
  }, [view, topH, camera, invalidate]);

  // มุม "ตามโดรน" (ขณะแก้ตำแหน่งเอง)
  useEffect(() => {
    if (view !== 'chase' || live) return;
    const c = controls.current;
    if (!c) return;
    const d = droneRef.current, hd = heading(d.yaw);
    const back = 0.9;
    camera.position.set(d.x - hd.x * back, d.alt + 0.45, -(d.y - hd.y * back));
    c.target.set(d.x + hd.x * 1.5, d.alt, -(d.y + hd.y * 1.5));
    c.update();
    invalidate();
  }, [view, live, drone.x, drone.y, drone.yaw, drone.alt, camera, invalidate]);

  // ขณะบินจำลอง: กล้องตามหลังโดรน — หน่วงที่ "จุดที่ตาม" ไม่ใช่ตัวกล้อง จึงไม่แกว่ง และเริ่มต้นที่หลังโดรนทันที
  const follow = useRef({ x: 0, y: 0, alt: 0, yaw: 0, init: false });
  // ตำแหน่งกล้องเทียบกับหัวโดรน (หน้า/ข้าง/สูง) ผู้ใช้หมุนหรือซูมแล้วค่านี้เปลี่ยน กล้องจึงยังตามโดรนต่อโดยคงมุมที่เลือก
  const rel = useRef({ a: -2.1, b: 0, h: 0.9 });
  const lastChase = useRef<{ target: THREE.Vector3; hd: { x: number; y: number } } | null>(null);
  useFrame((_, rawDt) => {
    const c = controls.current;
    if (!c) return;
    const dt = Math.min(rawDt, 1 / 20);
    const cam = camera as THREE.PerspectiveCamera;
    let chasePosition: THREE.Vector3 | null = null;
    let chaseTarget: THREE.Vector3 | null = null;
    let chaseHd: { x: number; y: number } | null = null;
    // OrbitControls (drei) อัปเดตกล้องตามการลาก/ซูมก่อน useFrame นี้ จึงอ่านกลับก่อนจะวางกล้องใหม่ แล้วเก็บเป็นตำแหน่งสัมพัทธ์กับหัวโดรน
    const lc = lastChase.current;
    if (lc && live && view === 'chase' && !highlight) {
      const ox = cam.position.x - lc.target.x, oz = cam.position.z - lc.target.z;
      rel.current = { a: ox * lc.hd.x - oz * lc.hd.y, b: -ox * lc.hd.y - oz * lc.hd.x, h: cam.position.y - lc.target.y };
    }
    if (live && view === 'chase' && poseRef?.current) {
      const p = poseRef.current, f = follow.current;
      const k = f.init ? 1 - Math.exp(-dt * 5) : 1;
      let dyaw = ((p.yaw - f.yaw + 540) % 360) - 180;
      if (!f.init) dyaw = p.yaw - f.yaw;
      f.x += (p.x - f.x) * k; f.y += (p.y - f.y) * k; f.alt += (p.alt - f.alt) * k; f.yaw += dyaw * k;
      f.init = true;
      const hd = heading(f.yaw);
      chaseTarget = new THREE.Vector3(f.x + hd.x * 0.5, f.alt - 0.05, -(f.y + hd.y * 0.5));
      const r = rel.current;
      chasePosition = new THREE.Vector3(chaseTarget.x + hd.x * r.a - hd.y * r.b, chaseTarget.y + r.h, chaseTarget.z - hd.y * r.a - hd.x * r.b);
      chaseHd = hd;
    } else { lastChase.current = null; follow.current.init = false; rel.current = { a: -2.1, b: 0, h: 0.9 }; }

    if (highlight) {
      lastChase.current = null;
      if (!cinematic.current) cinematic.current = { view, position: cam.position.clone(), target: c.target.clone() };
      const from = new THREE.Vector3(...p3(...highlight.from));
      const to = new THREE.Vector3(...p3(...highlight.to));
      const direction = to.clone().sub(from).normalize();
      const side = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(0.35);
      const close = to.clone().addScaledVector(direction, -1.15).add(side).add(new THREE.Vector3(0, 0.36, 0));
      const k = 1 - Math.exp(-dt * 13);
      cam.position.lerp(close, k);
      c.target.lerp(to, k);
      cam.fov += (32 - cam.fov) * k;
      cam.updateProjectionMatrix();
      c.update();
      if (!live) invalidate();
      return;
    }

    if (cinematic.current) {
      lastChase.current = null;
      const saved = cinematic.current;
      const presetPosition = view === 'top' ? new THREE.Vector3(0, topH, 0.01) : new THREE.Vector3(0, 1.7, 6.6);
      const presetTarget = view === 'top' ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(0, 0.9, -1.5);
      const position = chasePosition ?? (saved.view === view ? saved.position : presetPosition);
      const target = chaseTarget ?? (saved.view === view ? saved.target : presetTarget);
      const k = 1 - Math.exp(-dt * 6);
      cam.position.lerp(position, k);
      c.target.lerp(target, k);
      cam.fov += (42 - cam.fov) * k;
      cam.updateProjectionMatrix();
      c.update();
      if (cam.position.distanceTo(position) < 0.04 && c.target.distanceTo(target) < 0.04 && Math.abs(cam.fov - 42) < 0.2) cinematic.current = null;
      if (!live && cinematic.current) invalidate();
      return;
    }

    if (chasePosition && chaseTarget && chaseHd) {
      cam.position.copy(chasePosition); c.target.copy(chaseTarget); c.update();
      lastChase.current = { target: chaseTarget.clone(), hd: chaseHd };
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={!dragging && !highlight}
      enableDamping={false}
      minDistance={0.8}
      maxDistance={22}
      maxPolarAngle={Math.PI / 2 - 0.02}
      onChange={() => invalidate()}
    />
  );
}

export default function Field3D({ event, drone, onDrone, view, shot, low, live = false, poseRef, playheadRef, marks = NO_MARKS, highlight = null, dartInventory = { front: 2, back: 2 }, holdKey = 0, loaded = { L: 0, R: 0 }, scene, measurements = [], showDimensions = false, dimensionFrom = 'start', dimensionTo }: Props) {
  const [dragging, setDragging] = useState(false);
  // โจทย์ฝึกบนกริด/พื้นว่าง: วาดวัตถุจาก scene แทนของตามกติกา และให้โดรนมีเข็ม/ลูกดอกตามวัตถุที่วางไว้
  const custom = !!scene && scene.pattern !== 'standard';
  const has = (t: string) => !!scene && scene.objects.some((o) => o.type === t);
  const hasBalloons = custom ? has('balloon') : event.field.balloons;
  const hasTargets = custom ? has('target') : event.field.targets;
  return (
    <Canvas
      frameloop={live ? 'always' : 'demand'}
      dpr={low ? 1 : [1, 1.5]}
      camera={{ position: [0, 15.5, 0.01], fov: 42, near: 0.05, far: 80 }}
      gl={{ antialias: !low, powerPreference: low ? 'low-power' : 'high-performance', stencil: false }}
      style={{ touchAction: 'none' }}
      aria-label="สนามแข่งขัน 3 มิติ"
    >
      <color attach="background" args={['#0b0d12']} />
      <ambientLight intensity={1.15} />
      <hemisphereLight args={['#dbe7ff', '#202530', 0.9]} />
      <directionalLight position={[5, 9, 6]} intensity={2.2} />
      <Surround />
      {scene && scene.pattern !== 'standard' ? <PlainMat pattern={scene.pattern} low={low} /> : <Mat low={low} />}
      <Surroundings />
      {scene && <SceneLayer3D spec={scene} popped={marks.popped} playheadRef={playheadRef} />}
      {(() => {
        const pb = custom ? baseAt(scene) : { x: 0, y: 0 };
        return pb ? <group position={[pb.x, 0, -pb.y]}><Takeoff color={event.field.takeoffColor} hoop={!custom} /></group> : null;
      })()}
      {!custom && event.field.platforms && <Platforms />}
      {!custom && event.field.balloons && <Balloons popped={marks.popped} />}
      {!custom && event.field.targets && (<><Targets /><ShootZones drone={drone} /></>)}
      <Drone drone={drone} onDrone={onDrone} setDragging={setDragging} low={low} live={live} poseRef={poseRef} platforms={event.field.platforms && !custom} loaded={loaded} dartInventory={hasTargets ? dartInventory : { front: 0, back: 0 }} needle={hasBalloons} />
      {showDimensions && <FieldDimensions3D scene={scene} fromId={dimensionFrom} toId={dimensionTo} />}
      {measurements.some((item) => item.points.length > 0) && <FieldMeasurements3D measurements={measurements} />}
      <MarksLayer marks={marks} playheadRef={playheadRef} />
      {live && <HoldPulse k={holdKey} poseRef={poseRef} />}
      {shot && <DartFlight key={shot.id ?? 0} shot={shot} />}
      <CameraRig view={view} topH={custom && scene!.pattern === 'grid5' ? 8.4 : 15.5} drone={drone} dragging={dragging} live={live} poseRef={poseRef} highlight={highlight} />
    </Canvas>
  );
}
