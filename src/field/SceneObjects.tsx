'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cellName, type BaseSpec, type SceneObject, type ScenarioPattern, type StartPoint } from '@/lib/scenarios';

/** ข้อมูลที่ส่งเข้า 3D/2D: ลายสนาม + วัตถุ + เวลาที่แต่ละจุด/ห่วงถูกทำสำเร็จ (มิลลิวินาที จากผลจำลอง) */
export type SceneSpec = { pattern: ScenarioPattern; objects: SceneObject[]; visits: Record<string, number>; start?: StartPoint; base?: BaseSpec };

const p3 = (x: number, y: number, z = 0): [number, number, number] => [x, z, -y];
const BLUE = '#3b82f6', GREEN = '#22c55e', ORANGE = '#f59e0b';

/** พื้นสนามสำหรับลายกริด/พื้นว่าง วาดด้วย canvas: เส้นทุก 1 ม. และกริด 5×5 ม. ตรงกลางพร้อมชื่อช่อง A1–E5 */
export function PlainMat({ pattern, low }: { pattern: ScenarioPattern; low: boolean }) {
  const tex = useMemo(() => {
    const S = low ? 1024 : 2048, k = S / 10; // พิกเซลต่อเมตร
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d')!;
    g.fillStyle = '#212839'; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(255,255,255,0.11)'; g.lineWidth = Math.max(1, k * 0.012);
    for (let i = 0; i <= 10; i++) { g.beginPath(); g.moveTo(i * k, 0); g.lineTo(i * k, S); g.stroke(); g.beginPath(); g.moveTo(0, i * k); g.lineTo(S, i * k); g.stroke(); }
    if (pattern === 'grid5') {
      // กริด 5×5 ม. กึ่งกลางสนาม (ช่องกลางคือแท่นฐาน): พิกัด -2.5…2.5 ม.
      const o = 2.5 * k, cx = S / 2, cy = S / 2;
      g.fillStyle = 'rgba(59,130,246,0.16)'; g.fillRect(cx - o, cy - o, o * 2, o * 2);
      g.strokeStyle = 'rgba(147,197,253,1)'; g.lineWidth = Math.max(3, k * 0.035);
      for (let i = 0; i <= 5; i++) {
        g.beginPath(); g.moveTo(cx - o + i * k, cy - o); g.lineTo(cx - o + i * k, cy + o); g.stroke();
        g.beginPath(); g.moveTo(cx - o, cy - o + i * k); g.lineTo(cx + o, cy - o + i * k); g.stroke();
      }
      g.fillStyle = 'rgba(219,234,254,0.8)'; g.font = `bold ${Math.round(k * 0.34)}px ui-monospace, monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let xi = -2; xi <= 2; xi++) for (let yi = -2; yi <= 2; yi++) {
        if (xi === 0 && yi === 0) continue;
        g.fillText(cellName(xi, yi), cx + xi * k, cy - yi * k);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = low ? 2 : 8;
    return t;
  }, [pattern, low]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial map={tex} roughness={0.95} metalness={0} />
    </mesh>
  );
}

/** ป้ายตัวเลข/ข้อความเล็กๆ เป็นสไปรต์ (ใช้บอกลำดับจุดผ่าน) */
function useLabel(text: string, color = '#ffffff') {
  return useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = 'rgba(15,23,42,0.85)'; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
    g.strokeStyle = color; g.lineWidth = 6; g.stroke();
    g.fillStyle = color; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 64, 68);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [text, color]);
}

/** ดูเวลาเล่น แล้วเปลี่ยนสีเป็นเขียวเมื่อทำสำเร็จ (ไม่ผ่าน React state เพื่อไม่ให้ render ทุกเฟรม) */
function useVisited(id: string, spec: SceneSpec, playheadRef?: React.RefObject<number>) {
  const mats = useRef<THREE.MeshBasicMaterial[]>([]);
  const state = useRef(false);
  useFrame(() => {
    const t = spec.visits[id];
    const done = t !== undefined && (playheadRef?.current ?? 0) >= t;
    if (done === state.current) return;
    state.current = done;
    mats.current.forEach((m) => m.color.set(done ? GREEN : (m.userData.base as string)));
  });
  return (m: THREE.MeshBasicMaterial | null, base: string) => { if (m) { m.userData.base = base; if (!mats.current.includes(m)) mats.current.push(m); } };
}

function Waypoint({ o, spec, playheadRef }: { o: Extract<SceneObject, { type: 'waypoint' }>; spec: SceneSpec; playheadRef?: React.RefObject<number> }) {
  const reg = useVisited(o.id, spec, playheadRef);
  const r = (o.r ?? 45) / 100;
  const label = useLabel(o.order ? String(o.order) : '●');
  const top = (o.zMax ?? 250) > 200 ? 1.8 : (o.zMax ?? 250) / 100;
  return (
    <group position={p3(o.x, o.y)}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <ringGeometry args={[r * 0.82, r, 48]} />
        <meshBasicMaterial ref={(m) => reg(m, BLUE)} color={BLUE} transparent opacity={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[r * 0.82, 48]} />
        <meshBasicMaterial ref={(m) => reg(m, BLUE)} color={BLUE} transparent opacity={0.18} />
      </mesh>
      <mesh position={[0, top / 2, 0]}>
        <cylinderGeometry args={[r, r, top, 32, 1, true]} />
        <meshBasicMaterial ref={(m) => reg(m, BLUE)} color={BLUE} transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <sprite position={[0, Math.min(top, 1.5) + 0.12, 0]} scale={[0.34, 0.34, 1]}>
        <spriteMaterial map={label} depthWrite={false} />
      </sprite>
    </group>
  );
}

function Hoop({ o, spec, playheadRef }: { o: Extract<SceneObject, { type: 'hoop' }>; spec: SceneSpec; playheadRef?: React.RefObject<number> }) {
  const reg = useVisited(o.id, spec, playheadRef);
  const w = o.size ?? 1, bottom = Math.max(0, ((o.zMin ?? 55) - 12) / 100), top = ((o.zMax ?? 150) + 12) / 100, h = top - bottom, t = 0.045;
  return (
    <group position={p3(o.x, o.y)} rotation={[0, -((o.yaw ?? 0) * Math.PI) / 180, 0]}>
      {[[0, bottom + h / 2, -w / 2 - t / 2, t, h + t * 2], [0, bottom + h / 2, w / 2 + t / 2, t, h + t * 2]].map(([x, y, z, tt, hh], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[tt, hh, tt]} />
          <meshBasicMaterial ref={(m) => reg(m, ORANGE)} color={ORANGE} />
        </mesh>
      ))}
      {[bottom - t / 2, top + t / 2].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[t, t, w + t * 2]} />
          <meshBasicMaterial ref={(m) => reg(m, ORANGE)} color={ORANGE} />
        </mesh>
      ))}
      <mesh position={[0, bottom + h / 2, 0]}>
        <planeGeometry args={[0.001, 0.001]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}

function Platform({ o }: { o: Extract<SceneObject, { type: 'platform' }> }) {
  const r = o.r ?? 0.5;
  return (
    <group position={p3(o.x, o.y)}>
      <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[r, r, 0.2, 48]} /><meshStandardMaterial color="#1d3fae" roughness={0.55} /></mesh>
      <mesh position={[0, 0.202, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[r * 0.92, r * 0.96, 64]} /><meshBasicMaterial color="#ffffff" /></mesh>
    </group>
  );
}

function Balloon({ o, popped }: { o: Extract<SceneObject, { type: 'balloon' }>; popped: boolean }) {
  const z = (o.z ?? 145) / 100;
  return (
    <group position={p3(o.x, o.y)}>
      <mesh position={[0, (z - 0.17) / 2, 0]}><boxGeometry args={[0.04, z - 0.17, 0.04]} /><meshStandardMaterial color="#c2641a" /></mesh>
      {!popped && <mesh position={[0, z, 0]}><sphereGeometry args={[0.16, 24, 18]} /><meshStandardMaterial color="#ef4466" roughness={0.35} /></mesh>}
    </group>
  );
}

function useBoardTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const order = ['#1b2f9c', '#1f6feb', '#2a9d3a', '#e6c200', '#f28c00', '#d62828'];
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(128, 128, 125 - i * (125 / 6), 0, Math.PI * 2); g.fillStyle = order[i]; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
}

function Target({ o }: { o: Extract<SceneObject, { type: 'target' }> }) {
  const tex = useBoardTexture();
  const cz = (o.cz ?? 140) / 100, r = (o.r ?? 50) / 100;
  // หันหน้าเข้าหากลางสนาม (โดรนยิงจากฐานมาทางเป้า)
  const facing = o.y > 0 ? 0 : Math.PI;
  return (
    <group position={p3(o.x, o.y)} rotation={[0, facing, 0]}>
      <mesh position={[0, cz, 0.01]}><circleGeometry args={[r, 64]} /><meshStandardMaterial map={tex} roughness={0.8} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, cz / 2, -0.03]}><boxGeometry args={[0.05, cz, 0.05]} /><meshStandardMaterial color="#c2641a" /></mesh>
    </group>
  );
}

/** วาดวัตถุของโจทย์ฝึกทั้งหมด (จุดผ่าน ห่วง แท่น ลูกโป่ง เป้า) · ถ้าเป็นสนามแข่งจริง วาดเฉพาะจุดผ่านและห่วงที่เพิ่ม */
export function SceneLayer3D({ spec, popped, playheadRef }: { spec: SceneSpec; popped: string[]; playheadRef?: React.RefObject<number> }) {
  const custom = spec.pattern !== 'standard';
  return (
    <>
      {spec.objects.map((o) => {
        if (o.type === 'waypoint') return <Waypoint key={o.id} o={o} spec={spec} playheadRef={playheadRef} />;
        if (o.type === 'hoop') return <Hoop key={o.id} o={o} spec={spec} playheadRef={playheadRef} />;
        if (!custom) return null;
        if (o.type === 'platform') return <Platform key={o.id} o={o} />;
        if (o.type === 'balloon') return <Balloon key={o.id} o={o} popped={popped.includes(o.id)} />;
        return <Target key={o.id} o={o} />;
      })}
    </>
  );
}
