'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Sparkles, useGLTF } from '@react-three/drei';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { sceneState } from './store';
import { paintForTheme, useDarkTheme } from './paint';
import { poses, type Pose } from './poses';
import type { Quality } from './quality';

const MODEL = { high: '/models/drone.glb', low: '/models/drone-lite.glb' } as const;

type Seg = { name: string; center: number; top: number; height: number };

/** ตำแหน่งของทุก [data-pose] ในหน้า (วัดใหม่เมื่อ layout เปลี่ยน) */
function useSegments() {
  const segs = useRef<Seg[]>([]);
  useEffect(() => {
    const measure = () => {
      segs.current = [...document.querySelectorAll<HTMLElement>('[data-pose]')].map((el) => {
        const r = el.getBoundingClientRect();
        const top = r.top + scrollY;
        return { name: el.dataset.pose!, top, height: r.height, center: top + r.height / 2 };
      }).sort((a, b) => a.center - b.center);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    const t = setTimeout(measure, 1200); // หลังฟอนต์/รูปโหลด
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);
  return segs;
}

const TAU = Math.PI * 2;
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = THREE.MathUtils.lerp;
const D2R = THREE.MathUtils.degToRad;
const PROP_R = 0.238; // รัศมีใบพัด 38.1 มม. ในหน่วยโมเดล (1 หน่วย = 160 มม.)
const MAX_REV = 4.2; // รอบ/วินาทีที่ "ตาเห็น" สูงสุด: เร็วกว่านี้ใบ 3 แฉกจะดูกระตุก (wagon-wheel) จึงใช้ภาพเบลอแทน

const spinsOf = (p: Pose) => p.spins ?? [p.spin, p.spin, p.spin, p.spin];

function mix(a: Pose, b: Pose, t: number): Pose {
  const sa = spinsOf(a), sb = spinsOf(b);
  return {
    ...(t < 0.5 ? a : b),
    x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), s: lerp(a.s, b.s, t),
    rx: lerp(a.rx, b.rx, t), ry: lerp(a.ry, b.ry, t),
    explode: lerp(a.explode, b.explode, t), spin: lerp(a.spin, b.spin, t),
    my: lerp(a.my, b.my, t), ms: lerp(a.ms, b.ms, t), slot: lerp(a.slot, b.slot, t),
    spins: [0, 1, 2, 3].map((i) => lerp(sa[i], sb[i], t)) as Pose['spins'],
    arrows: lerp(a.arrows, b.arrows, t), alt: lerp(a.alt, b.alt, t),
  };
}

/** ลูกศรโค้งบอกทิศการหมุน (ทวนเข็มเมื่อมองจากด้านบน; ตามเข็มใช้ภาพสะท้อน) */
function makeArrow(color: string, clockwise: boolean) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
  const g = new THREE.Group();
  const ARC = 4.6, R = PROP_R + 0.02;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.011, 8, 64, ARC), mat);
  ring.rotation.x = -Math.PI / 2;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 16), mat);
  head.position.set(Math.cos(ARC) * R, 0, -Math.sin(ARC) * R);
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-Math.sin(ARC), 0, -Math.cos(ARC)));
  g.add(ring, head);
  if (clockwise) g.scale.x = -1;
  return { g, mat };
}

function Drone({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const root = useRef<THREE.Group>(null);
  const view = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const segs = useSegments();
  const slotEl = useRef<HTMLElement | null>(null);
  const { viewport } = useThree();
  const dark = useDarkTheme();

  const rig = useMemo(() => {
    const model = scene.clone(true);
    paintForTheme(model, false);
    const byName: Record<string, THREE.Object3D> = {};
    model.traverse((o) => { if (o.name) byName[o.name] = o; });
    const home: Record<string, THREE.Vector3> = {};
    Object.entries(byName).forEach(([k, o]) => { home[k] = o.position.clone(); });

    const props = [1, 2, 3, 4].map((n) => {
      const node = byName[`Prop_${n}`];
      const cw = n % 2 === 1; // ใบ 1, 3 หมุนตามเข็ม
      // วัสดุแยกรายใบ เพื่อจางใบพัดได้ไม่เท่ากัน
      const blades: THREE.MeshStandardMaterial[] = [];
      node?.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          const mat = (m.material as THREE.MeshStandardMaterial).clone();
          mat.transparent = true;
          m.material = mat;
          blades.push(mat);
        }
      });
      // แผ่นเบลอ: สิ่งที่ตาคนเห็นจริงเมื่อใบพัดหมุนเร็ว
      const blurMat = new THREE.MeshBasicMaterial({ color: '#9aa3b2', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const blur = new THREE.Mesh(new THREE.RingGeometry(0.03, PROP_R, 48), blurMat);
      blur.rotation.x = -Math.PI / 2;
      node?.add(blur);
      const arrow = makeArrow(cw ? '#3b82f6' : '#f43f5e', cw);
      arrow.g.position.copy(home[`Prop_${n}`] ?? new THREE.Vector3()).add(new THREE.Vector3(0, 0.07, 0));
      model.add(arrow.g);
      return { node, cw, blades, blurMat, arrow, level: 0.7 };
    });
    return { model, byName, home, props };
  }, [scene]);

  useEffect(() => { paintForTheme(rig.model, dark); }, [rig, dark]);

  const cur = useRef({ x: 0, y: 0, s: 1, rx: 20, ry: -30, pitch: 0, roll: 0, yaw: 0, explode: 0, arrows: 0, vel: 0, alt: 110 });

  useFrame((state, rawDt) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(rawDt, 1 / 20); // กันเฟรมกระโดดหลังสลับแท็บ
    const y = scrollY + innerHeight * 0.5;
    const list = segs.current;

    // 1) หาท่าเป้าหมาย: ผสมระหว่าง section ที่อยู่ติดกันตามระยะเลื่อน
    let target: Pose = poses.hero;
    let local = 0;
    let active = 'hero';
    if (list.length) {
      let i = 0;
      while (i < list.length - 1 && list[i + 1].center <= y) i++;
      const a = list[i], b = list[Math.min(i + 1, list.length - 1)];
      const f = a === b ? 0 : THREE.MathUtils.clamp((y - a.center) / (b.center - a.center), 0, 1);
      // ค้างท่าไว้เกือบทั้งช่วง แล้วค่อยเปลี่ยนตรงรอยต่อ (ช่วงกลาง 40% ระหว่างจุดกึ่งกลางของสองฉาก)
      const hold = smooth(THREE.MathUtils.clamp((f - 0.3) / 0.4, 0, 1));
      target = mix(poses[a.name] ?? poses.hero, poses[b.name] ?? poses.hero, hold);
      const inside = list.find((s) => y >= s.top && y <= s.top + s.height) ?? a;
      active = inside.name;
      local = THREE.MathUtils.clamp((y - inside.top) / inside.height, 0, 1);
    }
    sceneState.active = active;
    sceneState.local = local;

    // 2) ท่าเฉพาะฉาก: ทุกค่าเป็นศูนย์ที่ต้นและท้ายฉาก จึงต่อกันลื่นไม่กระโดด
    const move = (poses[active] ?? target).move;
    // โดรนอยู่กับที่เสมอ (ไม่เลื่อน ไม่ลอยขึ้นลง) เหลือแค่ท่าเอียง/หมุน ให้ SVG รอบตัวเป็นคนเล่าว่าไปทางไหน
    let pitch = 0, roll = 0, yaw = 0;
    const hold = Math.sin(Math.min(1, local * 1.6) * Math.PI / 2) * (1 - smooth(Math.max(0, (local - 0.75) / 0.25))); // ค่อยๆ เข้าท่า ค้าง แล้วค่อยๆ คืน
    if (move === 'forward') pitch = 16 * hold;  // ก้มหัว
    if (move === 'side') roll = -16 * hold;     // เอียงขวาลง
    if (move === 'turn') yaw = 180 * smooth(local);
    if (move === 'push') roll = 26 * Math.exp(-4 * local) * Math.sin(local * 22);

    // 3) ทุกอย่างวิ่งเข้าหาเป้าแบบหน่วง (critically-damped) ไม่กระโดดแม้ท่าเปลี่ยนกะทันหัน
    const c = cur.current;
    const k = 1 - Math.exp(-dt * 5);
    const kv = 1 - Math.exp(-dt * 3);
    c.vel += (sceneState.velocity - c.vel) * kv;
    sceneState.smoothVelocity = c.vel;

    const narrow = viewport.width < viewport.height * 0.9;
    const half = viewport.width / 2;
    let tx = narrow ? 0 : target.x * half;
    let ty = narrow ? viewport.height * target.my : target.y * (viewport.height / 2);
    let ts = narrow ? target.s * viewport.width * target.ms : target.s * Math.min(1.5, viewport.width / 8);
    // ฉากอธิบาย: โดรนไปอยู่กึ่งกลางกล่อง SVG (วัดจาก DOM จริง จึงตรงกันทุกขนาดจอ) กว้าง ≈ slot × กล่อง
    const w = THREE.MathUtils.clamp(target.slot / 0.5, 0, 1);
    if (w > 0.001) {
      if (!slotEl.current?.isConnected) slotEl.current = document.querySelector<HTMLElement>('[data-drone-slot]');
      const r = slotEl.current?.getBoundingClientRect();
      if (r && r.width > 0) {
        const wpp = viewport.width / innerWidth; // หน่วยโลก 3 มิติต่อพิกเซล
        tx = lerp(tx, (r.left + r.width / 2 - innerWidth / 2) * wpp, w);
        ty = lerp(ty, -(r.top + r.height / 2 - innerHeight / 2) * wpp, w);
        ts = lerp(ts, (0.5 * r.width * wpp) / 1.67, w); // โมเดลกว้าง ≈ 1.24 หน่วย × scale 1.35
      }
    }
    const lean = THREE.MathUtils.clamp(c.vel / 2500, -1, 1) * 10;

    c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.s += (ts - c.s) * k;
    c.rx += (target.rx - c.rx) * k; c.ry += (target.ry - c.ry) * k;
    c.pitch += (pitch + lean - c.pitch) * k; c.roll += (roll - c.roll) * k; c.yaw += (yaw - c.yaw) * k;
    c.explode += (target.explode - c.explode) * k;
    c.arrows += (target.arrows - c.arrows) * k;
    c.alt += (target.alt - c.alt) * k;

    g.position.set(c.x, c.y, 0);
    g.scale.setScalar(c.s * 1.35);
    // แยก 2 ชั้น: ชั้นนอก = มุมกล้องที่ก้มมอง (คงที่ในฉาก) · ชั้นใน = ท่าของโดรนเอง
    // (หันหัว → ก้ม/เงยรอบแกนข้างของตัวเอง → เอียงรอบแกนหัว-ท้าย) โดรนจึงหมุนบนพื้นราบเสมอ ไม่พลิกตะแคง
    if (view.current) view.current.rotation.x = D2R(c.rx);
    body.current?.rotation.set(D2R(c.pitch), D2R(c.ry + c.yaw), D2R(c.roll), 'YXZ');

    // 4) ใบพัด: หมุนตามระดับแรง และเปลี่ยนเป็นภาพเบลอเมื่อเร็ว
    const levels = spinsOf(target);
    const boost = Math.min(0.3, Math.abs(c.vel) / 6000);
    rig.props.forEach((p, i) => {
      p.level += (Math.min(1, levels[i] + boost) - p.level) * kv;
      const lv = p.level;
      if (p.node) p.node.rotation.y += (p.cw ? -1 : 1) * lv * MAX_REV * TAU * dt;
      const blur = smooth(THREE.MathUtils.clamp((lv - 0.3) / 0.6, 0, 1));
      p.blurMat.opacity = blur * 0.32;
      p.blades.forEach((m) => { m.opacity = 1 - blur * 0.8; });
      p.arrow.mat.opacity = c.arrows * 0.95;
      p.arrow.g.rotation.y += (p.cw ? -1 : 1) * (0.6 + lv) * dt;
      p.arrow.g.visible = c.arrows > 0.01;
    });

    // 5) แยกชิ้นส่วน (ฉาก "รู้จักเครื่อง")
    const e = c.explode;
    const place = (name: string, ox: number, oy: number, oz: number) => {
      const o = rig.byName[name], h = rig.home[name];
      if (o && h) o.position.set(h.x + ox * e, h.y + oy * e, h.z + oz * e);
    };
    for (let n = 1; n <= 4; n++) {
      const sx = n === 1 || n === 4 ? 1 : -1, sz = n <= 2 ? 1 : -1;
      place(`Prop_${n}`, sx * 0.08, 0.42, sz * 0.08);
      place(`MotorCap_${n}`, 0, 0.26, 0); place(`Motor_${n}`, 0, 0.1, 0);
      place(`Guard_${n}`, sx * 0.16, 0, sz * 0.16); place(`Arm_${n}`, sx * 0.1, -0.12, sz * 0.1);
      place(`Leg_${n}`, sx * 0.1, -0.4, sz * 0.1);
    }
    place('Battery', 0, 0.6, 0); place('BatteryLabel', 0, 0.6, 0); place('Pods', 0, -0.2, 0);
    place('Camera', 0, 0, 0.35); place('Lens', 0, 0, 0.42);
    place('LED_Front', 0, 0, 0.28); place('LED_Back', 0, 0, -0.28);

    // 6) ค่าให้ HUD (หน่วยที่คนอ่านเข้าใจ)
    const tel = sceneState.telemetry;
    tel.alt = c.alt;
    tel.roll = Math.round(c.roll);
    tel.pitch = Math.round(c.pitch);
    tel.yaw = Math.round((((c.ry + c.yaw) % 360) + 360) % 360);
    tel.rpm = Math.round((rig.props.reduce((s, p) => s + p.level, 0) / 4) * 100);
  });

  return (
    <group ref={root}>
      <group ref={view}>
        <group ref={body}><primitive object={rig.model} /></group>
      </group>
    </group>
  );
}

function Rig() {
  // กล้องขยับตามเมาส์เล็กน้อย และมุมกว้างขึ้นเมื่อเลื่อนเร็ว
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const cam = state.camera as THREE.PerspectiveCamera;
    const k = 1 - Math.exp(-dt * 2.5);
    cam.position.x += (state.pointer.x * 0.4 - cam.position.x) * k;
    cam.position.y += (state.pointer.y * 0.25 - cam.position.y) * k;
    cam.lookAt(0, 0, 0);
    const fov = 38 + Math.min(8, Math.abs(sceneState.smoothVelocity) / 400);
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov += (fov - cam.fov) * k;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

/**
 * วัด FPS จริงหลังโหลดเสร็จ (ข้าม 4 วินาทีแรกที่โมเดลกำลังแกะไฟล์) ทีละช่วง 3 วินาที
 * - ช่วงที่มีเฟรมค้างนานกว่า 0.25 วินาที (สลับแอป, เครื่องแวบไปทำงานอื่น) ไม่นับ เพราะไม่ใช่ความช้าต่อเนื่อง
 * - ต่ำกว่า 28 fps → ลดคุณภาพหนึ่งขั้น
 * - ลดจนสุดแล้วยังต่ำกว่า 20 fps สามช่วงติด → ใช้ภาพนิ่งแทน
 */
function AdaptiveQuality({ onDecline, onFail, atMin }: { onDecline: () => void; onFail: () => void; atMin: boolean }) {
  const w = useRef({ born: -1, start: -1, last: 0, frames: 0, stalled: false, bad: 0 });
  useFrame((state) => {
    const now = state.clock.elapsedTime;
    const m = w.current;
    if (m.born < 0) m.born = now;
    if (now - m.born < 4 || document.visibilityState !== 'visible') { m.start = -1; return; }
    if (m.start < 0) { m.start = m.last = now; m.frames = 0; m.stalled = false; return; }
    if (now - m.last > 0.25) m.stalled = true;
    m.last = now;
    m.frames++;
    const span = now - m.start;
    if (span < 3) return;
    const fps = m.frames / span;
    const stalled = m.stalled;
    m.start = now; m.frames = 0; m.stalled = false;
    if (stalled) return;
    if (fps < 28 && !atMin) { onDecline(); m.bad = 0; return; }
    m.bad = atMin && fps < 20 ? m.bad + 1 : 0;
    if (m.bad >= 3) onFail();
  });
  return null;
}

/** ให้ 3D วาดในจังหวะเดียวกับ Lenis (gsap.ticker) — ตำแหน่ง scroll กับภาพจึงตรงกันทุกเฟรม ไม่สั่น */
function SyncedLoop() {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    const tick = (time: number) => advance(time); // frameloop="never": r3f ใช้ค่านี้เป็นวินาทีโดยตรง
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [advance]);
  return null;
}

export default function Drone3D({ quality, onFail }: { quality: Exclude<Quality, 'off'>; onFail: () => void }) {
  const high = quality === 'high';
  const steps = high ? [1.5, 1.25, 1] : [1, 0.8];
  const [step, setStep] = useState(0);
  const dpr = steps[step];
  const fx = high && step === 0; // แสงสะท้อน + ละอองฝุ่น เฉพาะเครื่องแรงที่ยังไม่ต้องลด
  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 7], fov: 38 }}
      gl={{ antialias: high, alpha: true, powerPreference: high ? 'high-performance' : 'low-power', stencil: false }}
      frameloop="never"
      style={{ pointerEvents: 'none' }}
      aria-hidden
    >
      <AdaptiveQuality atMin={step === steps.length - 1} onDecline={() => setStep((s) => Math.min(steps.length - 1, s + 1))} onFail={onFail} />
      <SyncedLoop />
      <ambientLight intensity={fx ? 0.9 : 1.6} />
      <hemisphereLight args={['#c7d7ff', '#1a1a22', fx ? 0.4 : 1.2]} />
      <directionalLight position={[4, 6, 5]} intensity={3.2} />
      <directionalLight position={[-5, 2, -3]} intensity={2.4} color="#6aa8ff" />
      <directionalLight position={[5, -1, -4]} intensity={1.8} color="#ff5a7a" />
      {fx && (
        <Environment resolution={64}>
          <Lightformer form="rect" intensity={4} position={[0, 5, 3]} scale={[10, 3, 1]} />
          <Lightformer form="rect" intensity={3} color="#3b82f6" position={[-6, 0, 2]} scale={[2, 8, 1]} />
          <Lightformer form="rect" intensity={3} color="#ef4466" position={[6, 1, -2]} scale={[2, 8, 1]} />
        </Environment>
      )}
      <Drone url={MODEL[quality]} />
      {fx && <Sparkles count={40} scale={[14, 8, 6]} size={2} speed={0.3} opacity={0.45} color="#7cc4ff" />}
      <Rig />
    </Canvas>
  );
}
