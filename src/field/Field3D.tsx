'use client';

import { DRONE_MODEL } from '@/lib/drone-assets';

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, RoundedBox, useGLTF, useTexture } from '@react-three/drei';
import { baseAt } from '@/lib/scenarios';
import { PlainMat, SceneLayer3D, type SceneSpec } from './SceneObjects';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { FIELD } from './layout';
import { heading, type DroneState } from './aim';
import { balloonId } from './layout';
import type { RuleEvent } from '@/rules/types';
import type { Measurement } from '@/flight/measurements';
import type { CeilingLights, FieldLights } from '@/flight/environment';
import { FieldDimensions3D, FieldMeasurements3D } from './FieldMeasurements3D';

export type ViewPreset = 'top' | 'chase' | 'walk';
export type WalkPose = { x: number; y: number; yaw: number; pitch: number };
export type WalkInput = { forward: number; right: number; lookX: number; lookY: number };
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
  lights?: FieldLights;
  ceilingLights?: CeilingLights;
  walkPoseRef?: React.RefObject<WalkPose>;
  walkInputRef?: React.RefObject<WalkInput>;
  walkControlsEnabled?: boolean;
  onWalk?: (pose: WalkPose) => void;
  placement?: { center: { x: number; y: number }; target: { x: number; y: number }; aligned: boolean; onRotate: (yaw: number) => void };
  carryingDrone?: boolean;
  rescuePose?: LivePose | null;
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

const CORNERS: Array<[number, number]> = [[-4.85, 4.85], [4.85, 4.85], [-4.85, -4.85], [4.85, -4.85]];
const LED_COLORS = { cyan: '#5cc6e8', blue: '#355bd4', ice: '#b5e9ff' } as const;

function fixtureTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d')!;
  const pixels = context.createImageData(64, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const grain = Math.sin(x * 47.3 + y * 19.7) * Math.cos(x * 9.1 - y * 31.3);
    const shade = Math.round(64 + grain * 10 + (y % 8 === 0 ? 7 : 0));
    const index = (y * 64 + x) * 4;
    pixels.data[index] = shade;
    pixels.data[index + 1] = shade + 4;
    pixels.data[index + 2] = shade + 12;
    pixels.data[index + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function softBeamTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 256;
  const context = canvas.getContext('2d')!;
  const pixels = context.createImageData(128, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 128; x++) {
    const across = (x - 63.5) / 63.5, along = (y - 127.5) / 127.5;
    const fade = Math.max(0, 1 - across * across) ** 2 * Math.max(0, 1 - along * along) ** 1.7;
    const index = (y * 128 + x) * 4;
    pixels.data[index] = 255; pixels.data[index + 1] = 255; pixels.data[index + 2] = 255;
    pixels.data[index + 3] = Math.round(fade * 170);
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function GroundLed({ x, y, light, low, metal, wash }: { x: number; y: number; light: FieldLights[number]; low: boolean; metal: THREE.Texture; wash: THREE.Texture }) {
  const color = LED_COLORS[light.color];
  const target = useMemo(() => {
    const object = new THREE.Object3D();
    object.position.set(-x, 0.32, y);
    return object;
  }, [x, y]);
  const length = Math.hypot(x, y);
  const washCenter: [number, number, number] = [(-x / length) * 2.7, 0.008, (y / length) * 2.7];
  return <group position={[x, 0, -y]}>
    <mesh position={[0, 0.045, 0]}><cylinderGeometry args={[0.19, 0.21, 0.09, 16]} /><meshStandardMaterial map={metal} metalness={0.55} roughness={0.35} /></mesh>
    <mesh position={[0, 0.091, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.125, 0.17, 24]} /><meshStandardMaterial color="#a4adba" metalness={0.8} roughness={0.25} /></mesh>
    <mesh position={[0, 0.105, 0]}><cylinderGeometry args={[0.14, 0.17, 0.045, 16]} /><meshStandardMaterial color={light.enabled ? color : '#44505c'} emissive={light.enabled ? color : '#000000'} emissiveIntensity={light.enabled ? light.intensity * 2.2 : 0} toneMapped={false} /></mesh>
    <primitive object={target} />
    {light.enabled && <>
      <spotLight position={[0, 0.19, 0]} target={target} color={color} angle={0.44} penumbra={1} intensity={light.intensity * (low ? 18 : 28)} distance={10} decay={2} />
      {!low && <pointLight position={[0, 0.18, 0]} color={color} intensity={light.intensity * 1.8} distance={1.5} decay={2} />}
      <group position={washCenter} rotation={[0, Math.atan2(x, -y), 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <planeGeometry args={[low ? 2.1 : 2.8, 5.4]} />
          <meshBasicMaterial map={wash} color={color} transparent opacity={light.intensity * 0.55} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>
    </>}
  </group>;
}

function CeilingLed({ x, y, enabled, low, metal }: { x: number; y: number; enabled: boolean; low: boolean; metal: THREE.Texture }) {
  const target = useMemo(() => {
    const object = new THREE.Object3D();
    object.position.set(-x, -5.1, y);
    return object;
  }, [x, y]);
  return <group position={[x, 5.45, -y]}>
    <mesh><boxGeometry args={[0.78, 0.16, 0.56]} /><meshStandardMaterial map={metal} metalness={0.48} roughness={0.4} /></mesh>
    <mesh position={[0, -0.095, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.65, 0.44]} />
      <meshBasicMaterial color={enabled ? '#f0f8ff' : '#59616c'} toneMapped={false} />
    </mesh>
    <primitive object={target} />
    {enabled && <>
      <spotLight position={[0, -0.12, 0]} target={target} color="#e9f4ff" angle={1.08} penumbra={1} intensity={low ? 28 : 42} distance={16} decay={2} />
      {!low && <pointLight position={[0, -0.15, 0]} color="#e9f4ff" intensity={5} distance={4} decay={2} />}
    </>}
  </group>;
}

function CornerLeds({ lights, ceilingLights, low }: { lights: FieldLights; ceilingLights: CeilingLights; low: boolean }) {
  const metal = useMemo(fixtureTexture, []);
  const wash = useMemo(softBeamTexture, []);
  useEffect(() => () => { metal.dispose(); wash.dispose(); }, [metal, wash]);
  return <>
    {CORNERS.map(([x, y], index) => <GroundLed key={`floor-${index}`} x={x} y={y} light={lights[index]} low={low} metal={metal} wash={wash} />)}
    {CORNERS.map(([x, y], index) => <CeilingLed key={`ceiling-${index}`} x={x} y={y} enabled={ceilingLights[index]} low={low} metal={metal} />)}
  </>;
}

function WalkCameraRig({ poseRef, inputRef, onWalk, scene, enabled }: { poseRef: React.RefObject<WalkPose>; inputRef: React.RefObject<WalkInput>; onWalk?: (pose: WalkPose) => void; scene?: SceneSpec; enabled: boolean }) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  const lastReport = useRef(0);
  const dragLook = useRef<{ id: number; x: number; y: number } | null>(null);
  const padCenter = useMemo(() => scene ? baseAt(scene) : { x: 0, y: 0 }, [scene]);
  const obstacles = useMemo(() => scene?.pattern !== 'standard' && scene
    ? scene.objects.flatMap(o => {
        if (o.type === 'hoop') {
          const half = (o.size ?? 1) / 2;
          const angle = ((o.yaw ?? 0) * Math.PI) / 180;
          const sideX = Math.cos(angle) * half, sideY = -Math.sin(angle) * half;
          return [[o.x - sideX, o.y - sideY, 0.24], [o.x + sideX, o.y + sideY, 0.24]];
        }
        return ['platform', 'balloon', 'target'].includes(o.type) ? [[o.x, o.y, o.type === 'platform' ? 0.58 : 0.28]] : [];
      })
    : [...FIELD.platform.positions.map(([x, y]) => [x, y, 0.58]), ...[-0.5, 0.5].flatMap(x => [-0.5, 0.5].map(y => [x, y, 0.18]))], [scene]);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (!enabled) return;
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,[contenteditable="true"]')) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) { keys.current.add(event.code); event.preventDefault(); }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.code);
    const look = (dx: number, dy: number) => {
      poseRef.current.yaw += dx * 0.12;
      poseRef.current.pitch = THREE.MathUtils.clamp(poseRef.current.pitch - dy * 0.12, -75, 75);
    };
    const move = (event: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      look(event.movementX, event.movementY);
    };
    const lock = (event: PointerEvent) => {
      if (!enabled || event.pointerType !== 'mouse') return;
      dragLook.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      try { void gl.domElement.requestPointerLock().catch(() => { /* use drag-to-look instead */ }); }
      catch { /* use drag-to-look instead */ }
    };
    const drag = (event: PointerEvent) => {
      const previous = dragLook.current;
      if (!enabled || !previous || previous.id !== event.pointerId || document.pointerLockElement === gl.domElement || !event.buttons) return;
      look(event.clientX - previous.x, event.clientY - previous.y);
      previous.x = event.clientX; previous.y = event.clientY;
    };
    const endDrag = (event: PointerEvent) => { if (dragLook.current?.id === event.pointerId) dragLook.current = null; };
    gl.domElement.addEventListener('pointerdown', lock);
    gl.domElement.addEventListener('pointermove', drag);
    gl.domElement.addEventListener('pointerup', endDrag);
    gl.domElement.addEventListener('pointercancel', endDrag);
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('mousemove', move);
    return () => { keys.current.clear(); dragLook.current = null; gl.domElement.removeEventListener('pointerdown', lock); gl.domElement.removeEventListener('pointermove', drag); gl.domElement.removeEventListener('pointerup', endDrag); gl.domElement.removeEventListener('pointercancel', endDrag); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('mousemove', move); if (document.pointerLockElement === gl.domElement) document.exitPointerLock(); };
  }, [gl, poseRef, enabled]);
  useFrame((state, delta) => {
    const pose = poseRef.current, input = inputRef.current;
    const dt = Math.min(delta, 0.05);
    pose.yaw += input.lookX; pose.pitch = THREE.MathUtils.clamp(pose.pitch + input.lookY, -75, 75);
    input.lookX = 0; input.lookY = 0;
    const forward = enabled ? Math.max(-1, Math.min(1, input.forward + Number(keys.current.has('KeyW')) - Number(keys.current.has('KeyS')))) : 0;
    const right = enabled ? Math.max(-1, Math.min(1, input.right + Number(keys.current.has('KeyD')) - Number(keys.current.has('KeyA')))) : 0;
    const radians = pose.yaw * Math.PI / 180;
    const speed = 2.1 * dt / Math.max(1, Math.hypot(forward, right));
    const nextX = THREE.MathUtils.clamp(pose.x + (Math.sin(radians) * forward + Math.cos(radians) * right) * speed, -4.72, 4.72);
    const nextY = THREE.MathUtils.clamp(pose.y + (Math.cos(radians) * forward - Math.sin(radians) * right) * speed, -4.72, 4.72);
    const blocked = obstacles.some(([x, y, radius]) => Math.hypot(nextX - x, nextY - y) < radius)
      || !!padCenter && Math.abs(nextX - padCenter.x) < FIELD.takeoff.size / 2 + 0.18 && Math.abs(nextY - padCenter.y) < FIELD.takeoff.size / 2 + 0.18;
    if (!blocked) { pose.x = nextX; pose.y = nextY; }
    camera.position.set(pose.x, 1.7, -pose.y);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(pose.pitch * Math.PI / 180, -radians, 0);
    if (state.clock.elapsedTime - lastReport.current >= 0.15) { lastReport.current = state.clock.elapsedTime; onWalk?.({ ...pose }); }
  });
  return null;
}

function PlacementMarkers({ center, target, drone, aligned, onRotate, scene }: { center: { x: number; y: number }; target: { x: number; y: number }; drone: DroneState; aligned: boolean; onRotate: (yaw: number) => void; scene?: SceneSpec }) {
  const turning = useRef(false);
  const base = scene ? baseAt(scene) : { x: 0, y: 0 };
  const surfaceY = base && Math.abs(base.x - center.x) <= 0.75 && Math.abs(base.y - center.y) <= 0.75 ? 0.235 : 0.035;
  const targetY = base && Math.abs(base.x - target.x) <= 0.75 && Math.abs(base.y - target.y) <= 0.75 ? 0.235 : 0.035;
  const turn = (event: ThreeEvent<PointerEvent>) => {
    if (!turning.current) return;
    event.stopPropagation();
    const point = event.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    if (!point) return;
    const dx = point.x - drone.x, dy = -point.z - drone.y;
    if (Math.hypot(dx, dy) < 0.12) return;
    onRotate((Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360);
  };
  return <>
    <group position={[center.x, surfaceY, -center.y]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.26, 1.26]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.09} depthWrite={false} /></mesh>
      {[-0.63, 0.63].map(side => <group key={side}>
        <mesh position={[side, 0, 0]}><boxGeometry args={[0.018, 0.008, 1.26]} /><meshBasicMaterial color="#ffffff" /></mesh>
        <mesh position={[0, 0, side]}><boxGeometry args={[1.26, 0.008, 0.018]} /><meshBasicMaterial color="#ffffff" /></mesh>
      </group>)}
    </group>
    <mesh position={[target.x, targetY + 0.015, -target.y]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.17, 32]} />
      <meshBasicMaterial color={aligned ? '#4aa3ff' : '#ffffff'} depthWrite={false} />
    </mesh>
    <mesh position={[drone.x, drone.alt + 0.11, -drone.y]} rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={event => { event.stopPropagation(); (event.target as Element).setPointerCapture?.(event.pointerId); turning.current = true; turn(event); }}
      onPointerMove={turn}
      onPointerUp={event => { event.stopPropagation(); turning.current = false; }}
      onPointerCancel={() => { turning.current = false; }}>
      <ringGeometry args={[0.30, 0.37, 48]} />
      <meshBasicMaterial color="#4aa3ff" side={THREE.DoubleSide} transparent opacity={0.85} depthWrite={false} />
    </mesh>
  </>;
}

function WalkerMarker({ poseRef, visible }: { poseRef: React.RefObject<WalkPose>; visible: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => { if (group.current) { group.current.position.set(poseRef.current.x, 0, -poseRef.current.y); group.current.rotation.y = -poseRef.current.yaw * Math.PI / 180; } });
  return <group ref={group} visible={visible}>
    <mesh position={[0, 0.85, 0]}><capsuleGeometry args={[0.18, 1.25, 6, 10]} /><meshStandardMaterial color="#c8d0d9" transparent opacity={0.65} /></mesh>
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.34, 24]} /><meshBasicMaterial color="#8ca1b5" transparent opacity={0.3} /></mesh>
  </group>;
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

function HandDrone({ low }: { low: boolean }) {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!group.current) return;
    group.current.position.copy(camera.localToWorld(new THREE.Vector3(0.15, -0.22, -0.9)));
    group.current.quaternion.copy(camera.quaternion);
  });
  return <group ref={group}>
    <group rotation={[0.45, -0.4, -0.2]} scale={0.6}><DroneModel low={low} /><GripHand /></group>
  </group>;
}

/** Palm, thumb and articulated curled fingers wrapping the battery housing. */
function GripHand() {
  const skin = <meshStandardMaterial color="#bd8b70" roughness={0.82} />;
  return <group position={[0.085, -0.045, 0]} rotation={[0, 0, -0.3]}>
    <group position={[0.038, -0.025, 0]} rotation={[0, 0, 0.55]}>
      <mesh><latheGeometry args={[[new THREE.Vector2(0.025, 0.025), new THREE.Vector2(0.024, 0), new THREE.Vector2(0.029, -0.045), new THREE.Vector2(0.038, -0.12), new THREE.Vector2(0.043, -0.21)], 28]} />{skin}</mesh>
      <mesh position={[0, -0.22, 0]}><cylinderGeometry args={[0.045, 0.048, 0.055, 28]} /><meshStandardMaterial color="#303b45" roughness={0.95} /></mesh>
    </group>
    <mesh scale={[0.8, 0.42, 1]}><sphereGeometry args={[0.065, 20, 14]} />{skin}</mesh>
    {[0, 1, 2, 3].map(i => <group key={i} position={[-0.03, 0, (i - 1.5) * 0.022]} scale={[i === 3 ? 0.78 : i === 1 ? 1.07 : 1, 1, i === 3 ? 0.85 : 1]} rotation={[0, 0, -0.6]}>
      <mesh position={[-0.02, 0.008, 0]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.0105, 0.027, 5, 10]} />{skin}</mesh>
      <group position={[-0.038, 0.018, 0]} rotation={[0, 0, -0.9]}>
        <mesh position={[-0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.0095, 0.019, 5, 10]} />{skin}</mesh>
        <mesh position={[-0.025, 0.008, 0]} rotation={[0, 0, -0.4]}><capsuleGeometry args={[0.0085, 0.014, 5, 10]} />{skin}</mesh>
        <mesh position={[-0.026, 0.016, 0.006]} scale={[0.65, 1, 0.25]}><sphereGeometry args={[0.008, 10, 8]} /><meshStandardMaterial color="#d7ad99" roughness={0.48} /></mesh>
      </group>
    </group>)}
    <mesh position={[-0.012, 0.033, 0.049]} rotation={[0.6, 0, -0.8]}><capsuleGeometry args={[0.014, 0.042, 6, 12]} />{skin}</mesh>
  </group>;
}

function PayloadServo() {
  const wires = useMemo(() => ['#543b29', '#d34a36', '#e6aa35'].map((color, i) => ({ color, curve: new THREE.CatmullRomCurve3([new THREE.Vector3(0.014, 0, i * 0.003), new THREE.Vector3(0.035, 0.012, 0.025), new THREE.Vector3(0.025, 0.025, 0.055), new THREE.Vector3(0, 0.015, 0.07)]) })), []);
  return <group>
    <mesh><boxGeometry args={[0.024, 0.025, 0.013]} /><meshStandardMaterial color="#254871" roughness={0.4} /></mesh>
    <mesh position={[0, 0.016, 0]}><boxGeometry args={[0.034, 0.004, 0.006]} /><meshStandardMaterial color="#e0ded5" /></mesh>
    {wires.map(w => <mesh key={w.color}><tubeGeometry args={[w.curve, 12, 0.0012, 5, false]} /><meshStandardMaterial color={w.color} roughness={0.7} /></mesh>)}
  </group>;
}

/** ยกจากพื้น จับบริเวณแบตเตอรี่ แล้วพลิกทั้งตัวโดรนในมือ */
function RescueDrone({ low, start, walker, view }: { low: boolean; start: LivePose; walker: React.RefObject<WalkPose>; view: ViewPreset }) {
  const { camera } = useThree();
  const carrier = useRef<THREE.Group>(null);
  const grip = useRef<THREE.Group>(null);
  const began = useRef<number | null>(null);
  const origin = useMemo(() => new THREE.Vector3(start.x, start.alt, -start.y), [start]);
  const yaw = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI - start.yaw * Math.PI / 180, 0)), [start.yaw]);
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    if (!carrier.current || !grip.current) return;
    began.current ??= clock.elapsedTime;
    const elapsed = clock.elapsedTime - began.current;
    const lift = THREE.MathUtils.smoothstep(elapsed, 0, 0.62);
    const flip = THREE.MathUtils.smoothstep(elapsed, 0.25, 0.92);
    if (view === 'walk') camera.localToWorld(target.set(0.19, -0.2, -0.82));
    else target.set(walker.current.x + 0.18, 1.28, -walker.current.y - 0.12);
    carrier.current.position.copy(origin).lerp(target, lift);
    carrier.current.quaternion.copy(yaw).slerp(view === 'walk' ? camera.quaternion : yaw, lift);
    grip.current.rotation.x = Math.PI * flip;
  });
  return <group ref={carrier} position={origin} quaternion={yaw}>
    <group ref={grip} scale={1.4}>
      <DroneModel low={low} />
      <GripHand />
    </group>
  </group>;
}

/** ความสูงพื้นผิวใต้โดรน: บนแท่น Takeoff/แท่นวงกลมสูง 20 ซม. นอกนั้นคือพื้นสนาม */
function groundY(x: number, y: number, platforms: boolean) {
  if (Math.abs(x) <= FIELD.takeoff.size / 2 && Math.abs(y) <= FIELD.takeoff.size / 2) return FIELD.takeoff.height + 0.004;
  if (platforms && FIELD.platform.positions.some(([px, py]) => Math.hypot(px - x, py - y) <= FIELD.platform.radius)) return FIELD.platform.height + 0.004;
  return 0.016;
}

function Drone({ drone, onDrone, onRotate, setDragging, low, live, placement, poseRef, platforms, loaded, dartInventory, dartRack, needle }: { drone: DroneState; onDrone: Props['onDrone']; onRotate?: (yaw: number) => void; setDragging: (v: boolean) => void; low: boolean; live: boolean; placement?: boolean; poseRef?: React.RefObject<LivePose>; platforms: boolean; loaded: { L: number; R: number }; dartInventory: { front: number; back: number }; dartRack: boolean; needle: boolean }) {
  const dragging = useRef(false);
  const rotating = useRef(false);
  const lim = placement ? 5.8 : FIELD.size / 2 - 0.15;
  const clamp = (v: number) => Math.max(-lim, Math.min(lim, v));
  const yawGroup = useRef<THREE.Group>(null);
  const tiltGroup = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const beacon = useRef<THREE.Mesh>(null);
  const plumb = useRef<THREE.Mesh>(null);
  const propNodes = useRef<THREE.Object3D[]>([]);
  const spinAngle = useRef(0);
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
      <group
        ref={yawGroup}
        position={p3(ax, ay, aalt)}
        rotation={[0, Math.PI - (ayaw * Math.PI) / 180, 0]}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          if (live) return;
          e.stopPropagation();
          (e.target as Element).setPointerCapture?.(e.pointerId);
          dragging.current = true;
          rotating.current = !!placement && e.button === 2;
          setDragging(true);
        }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          if (!placement || !dragging.current) return;
          e.stopPropagation();
          const point = e.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
          if (!point) return;
          if (rotating.current) {
            const dx = point.x - drone.x, dy = -point.z - drone.y;
            if (Math.hypot(dx, dy) >= 0.12) onRotate?.((Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360);
          } else onDrone({ x: clamp(point.x), y: clamp(-point.z) });
        }}
        onPointerUp={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          dragging.current = false;
          rotating.current = false;
          setDragging(false);
        }}
        onPointerCancel={() => { dragging.current = false; rotating.current = false; setDragging(false); }}
      >
        {/* พื้นที่จับให้ใหญ่ขึ้นบนจอสัมผัส */}
        <mesh visible={false}>
          <sphereGeometry args={[0.35, 8, 8]} />
        </mesh>
        <pointLight position={[0, 0.5, 0.2]} intensity={2.2} distance={3} color="#cfe0ff" />
        <group ref={tiltGroup}>
          <DroneModel low={low} propsRef={propNodes} />
          <DroneBalls loaded={loaded} />
          {dartRack && <DroneDartRack inventory={dartInventory} />}
          {needle && <DroneNeedle />}
        </group>
      </group>
      {/* ระนาบรับการลาก/แตะ ครอบทั้งสนามที่ระดับพื้น */}
      {!live && !placement && (
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
          <planeGeometry args={[placement ? 12 : FIELD.size, placement ? 12 : FIELD.size]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </>
  );
}

/** ลูกดอกสองคู่: หัวโดรนหัน +Z และท้ายโดรนหัน -Z */
/** Toy suction-dart cassette. Local +Y points out of the barrel. */
function SpringLauncher({ loaded }: { loaded: boolean }) {
  const spring = useRef<THREE.Group>(null);
  const piston = useRef<THREE.Mesh>(null);
  const latch = useRef<THREE.Group>(null);
  const travel = useRef(loaded ? 0 : 1);
  const coil = useMemo(() => new THREE.CatmullRomCurve3(Array.from({ length: 145 }, (_, i) => {
    const t = i / 144, angle = t * Math.PI * 16;
    return new THREE.Vector3(Math.cos(angle) * 0.009, t * 0.065, Math.sin(angle) * 0.009);
  })), []);
  useFrame((_, dt) => {
    travel.current = THREE.MathUtils.damp(travel.current, loaded ? 0 : 1, 22, dt);
    const t = travel.current;
    if (spring.current) spring.current.scale.y = 0.32 + t * 0.68;
    if (piston.current) piston.current.position.y = -0.071 + 0.065 * (0.32 + t * 0.68);
    if (latch.current) latch.current.rotation.z = -t * 0.95;
  });
  return <group>
    {/* Transparent cylindrical sleeve exposes the coil and captive pusher. */}
    <mesh><cylinderGeometry args={[0.017, 0.017, 0.16, 24, 1, true]} /><meshStandardMaterial color="#a7c7d4" transparent opacity={0.23} depthWrite={false} roughness={0.18} side={THREE.DoubleSide} /></mesh>
    {[-0.073, 0.066].map(y => <group key={y} position={[0, y, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.017, 0.003, 8, 24]} /><meshStandardMaterial color="#344954" metalness={0.45} roughness={0.4} /></mesh>
    </group>)}
    <mesh position={[0, -0.079, 0]}><cylinderGeometry args={[0.018, 0.018, 0.008, 24]} /><meshStandardMaterial color="#344954" metalness={0.4} roughness={0.45} /></mesh>
    <mesh position={[0, -0.04, 0]}><cylinderGeometry args={[0.0025, 0.0025, 0.07, 10]} /><meshStandardMaterial color="#c1cbd0" metalness={0.8} roughness={0.3} /></mesh>
    <group ref={spring} position={[0, -0.071, 0]} scale={[1, loaded ? 0.32 : 1, 1]}><mesh><tubeGeometry args={[coil, 144, 0.0014, 6, false]} /><meshStandardMaterial color="#b6c0c6" metalness={0.85} roughness={0.26} /></mesh></group>
    <mesh ref={piston} position={[0, loaded ? -0.05 : -0.006, 0]}><cylinderGeometry args={[0.013, 0.013, 0.006, 20]} /><meshStandardMaterial color="#e98745" roughness={0.7} /></mesh>
    <group position={[0.026, -0.048, 0]}>
      <RoundedBox args={[0.022, 0.028, 0.019]} radius={0.004} smoothness={3}><meshStandardMaterial color="#344954" roughness={0.45} /></RoundedBox>
      <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.006, 0.006, 0.006, 16]} /><meshStandardMaterial color="#d3d9da" metalness={0.65} roughness={0.3} /></mesh>
      <group ref={latch} position={[0, 0, 0.016]}>
        <RoundedBox position={[-0.012, 0, 0]} args={[0.03, 0.006, 0.005]} radius={0.002} smoothness={2}><meshStandardMaterial color="#e98745" roughness={0.5} /></RoundedBox>
        <mesh position={[-0.025, -0.003, -0.008]}><capsuleGeometry args={[0.0025, 0.013, 4, 8]} /><meshStandardMaterial color="#c1cbd0" metalness={0.7} roughness={0.3} /></mesh>
      </group>
      {['#543b29', '#d34a36', '#e6aa35'].map((color, i) => <mesh key={color} position={[0.008 + i * 0.003, -0.023, 0]} rotation={[0, 0, -0.35]}><capsuleGeometry args={[0.0012, 0.035, 3, 6]} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>)}
    </group>
    {loaded && <group position={[0, 0.012, 0]} scale={0.48}><DartModel /></group>}
  </group>;
}

function DroneDartRack({ inventory }: { inventory: { front: number; back: number } }) {
  return <group>
    <mesh position={[0, 0.048, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.052, 0.004, 8, 32]} /><meshStandardMaterial color="#344954" metalness={0.45} roughness={0.45} /></mesh>
    {(['front', 'back'] as const).flatMap(side => [0, 1].map(i => <group key={`${side}-${i}`} position={[(i - 0.5) * 0.075, 0.077, side === 'front' ? 0.085 : -0.085]} rotation={[side === 'front' ? Math.PI / 2 : -Math.PI / 2, 0, 0]}>
      <SpringLauncher loaded={i < Math.min(2, inventory[side])} /><group position={[0, -0.015, 0.023]} rotation={[Math.PI / 2, 0, 0]}><MountRail /></group>
    </group>))}
  </group>;
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

/** Central top-loading hopper with a servo-operated outlet beneath the funnel. */
function DroneBalls({ loaded }: { loaded: { L: number; R: number } }) {
  return <group>{(['L', 'R'] as const).map(side => <group key={side} position={[side === 'L' ? 0.048 : -0.048, 0.07, 0]}>
    <group scale={[0.64, 1.25, 0.64]}><BallHopper count={Math.min(20, loaded[side])} /></group>
    <group position={[0, -0.045, 0]} rotation={[0, Math.PI / 2, 0]}><MountRail /></group>
  </group>)}</group>;
}

function MountRail() {
  const shape = useMemo(() => {
    const outline = new THREE.Shape();
    outline.moveTo(-0.06, -0.006); outline.lineTo(0.06, -0.006);
    outline.absarc(0.06, 0, 0.006, -Math.PI / 2, Math.PI / 2, false);
    outline.lineTo(-0.06, 0.006); outline.absarc(-0.06, 0, 0.006, Math.PI / 2, Math.PI * 1.5, false);
    for (let i = 0; i < 11; i++) { const hole = new THREE.Path(); hole.absarc((i - 5) * 0.011, 0, 0.0023, 0, Math.PI * 2, true); outline.holes.push(hole); }
    return outline;
  }, []);
  return <group rotation={[-Math.PI / 2, 0, 0]}>
    <mesh><extrudeGeometry args={[shape, { depth: 0.003, bevelEnabled: true, bevelSize: 0.0005, bevelThickness: 0.0005, bevelSegments: 2, steps: 1, curveSegments: 12 }]} /><meshStandardMaterial color="#344954" metalness={0.45} roughness={0.5} /></mesh>
    {[-0.044, 0.044].map(x => <mesh key={x} position={[x, 0, 0.004]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.0035, 0.0035, 0.004, 12]} /><meshStandardMaterial color="#adb8be" metalness={0.75} roughness={0.3} /></mesh>)}
  </group>;
}

function BallHopper({ count }: { count: number }) {
  const previous = useRef(count);
  const opening = useRef(0);
  const gate = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (count < previous.current) opening.current = 0.8;
    previous.current = count;
    opening.current = Math.max(0, opening.current - dt);
    if (gate.current) gate.current.rotation.y = THREE.MathUtils.damp(gate.current.rotation.y, opening.current > 0.25 ? 1.6 : 0, 14, dt);
  });
  const profile = useMemo(() => [new THREE.Vector2(0.014, -0.045), new THREE.Vector2(0.014, -0.028), new THREE.Vector2(0.05, 0.015), new THREE.Vector2(0.05, 0.13), new THREE.Vector2(0.047, 0.13), new THREE.Vector2(0.047, 0.017), new THREE.Vector2(0.011, -0.027), new THREE.Vector2(0.011, -0.045)], []);
  return <group position={[0, 0.025, 0]}>
    <mesh><latheGeometry args={[profile, 40]} /><meshStandardMaterial color="#b8d4dd" transparent opacity={0.28} depthWrite={false} roughness={0.22} side={THREE.DoubleSide} /></mesh>
    {[0.015, 0.13].map(y => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.049, 0.003, 8, 40]} /><meshStandardMaterial color="#526772" metalness={0.45} roughness={0.45} /></mesh>)}
    {Array.from({ length: count }, (_, i) => {
      const slot = i % 7, layer = Math.floor(i / 7), angle = slot * Math.PI / 3;
      return <mesh key={i} position={[slot === 6 ? 0 : Math.cos(angle) * 0.026, 0.028 + layer * 0.02, slot === 6 ? 0 : Math.sin(angle) * 0.026]}><sphereGeometry args={[0.0095, 12, 10]} /><meshStandardMaterial color="#f1cd44" roughness={0.65} /></mesh>;
    })}
    <group position={[0.028, -0.043, 0]} rotation={[0, 0, Math.PI / 2]}><PayloadServo /></group>
    <group ref={gate} position={[0.028, -0.047, 0]}>
      <mesh position={[-0.014, 0, 0]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.003, 0.024, 4, 10]} /><meshStandardMaterial color="#d0d8da" metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[-0.028, 0, 0]}><cylinderGeometry args={[0.016, 0.016, 0.003, 28]} /><meshStandardMaterial color="#526772" metalness={0.5} roughness={0.4} /></mesh>
    </group>
  </group>;
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
      {/* Open rubber cup: concave inner wall and a rounded sealing lip. */}
      <mesh position={[0, 0.098, 0]}>
        <latheGeometry args={[[new THREE.Vector2(0.008, 0), new THREE.Vector2(0.012, 0.008), new THREE.Vector2(0.027, 0.027), new THREE.Vector2(0.029, 0.032), new THREE.Vector2(0.025, 0.032), new THREE.Vector2(0.022, 0.025), new THREE.Vector2(0.008, 0.008)], 24]} />
        <meshStandardMaterial color="#e96736" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.027, 0.002, 6, 24]} />
        <meshStandardMaterial color="#ed7849" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.09, 0]}>
        <cylinderGeometry args={[0.012, 0.011, 0.025, 10]} />
        <meshStandardMaterial color="#526772" metalness={0.55} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** กล้อง: ตั้งตำแหน่งตามมุมที่เลือก แล้วให้ผู้ใช้หมุน/ซูมต่อได้ */
function CameraRig({ view, topH, drone, dragging, live, poseRef, highlight, placementCenter }: { view: ViewPreset; topH: number; drone: DroneState; dragging: boolean; live: boolean; poseRef?: React.RefObject<LivePose>; highlight?: ShotHighlight; placementCenter?: { x: number; y: number } }) {
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera, invalidate, size } = useThree();
  const droneRef = useRef(drone);
  const cinematic = useRef<{ view: ViewPreset; position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  droneRef.current = drone;

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const cam = camera as THREE.PerspectiveCamera;
    if (placementCenter) {
      const height = Math.max(3.3, 2.5 / (2 * Math.tan((cam.fov * Math.PI) / 360) * cam.aspect));
      cam.position.set(placementCenter.x, height, -placementCenter.y + 0.001);
      c.target.set(placementCenter.x, 0, -placementCenter.y);
    }
    else if (view === 'top') { cam.position.set(0, topH, 0.01); c.target.set(0, 0, 0); }
    c.update();
    invalidate();
  }, [view, topH, placementCenter?.x, placementCenter?.y, camera, invalidate, size.width, size.height]);

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
      enabled={!placementCenter && !dragging && !highlight}
      enableDamping={false}
      minDistance={0.8}
      maxDistance={22}
      maxPolarAngle={Math.PI / 2 - 0.02}
      onChange={() => invalidate()}
    />
  );
}

export default function Field3D({ event, drone, onDrone, view, shot, low, live = false, poseRef, playheadRef, marks = NO_MARKS, highlight = null, dartInventory = { front: 2, back: 2 }, holdKey = 0, loaded = { L: 0, R: 0 }, scene, measurements = [], showDimensions = false, dimensionFrom = 'start', dimensionTo, lights, ceilingLights, walkPoseRef, walkInputRef, walkControlsEnabled = true, onWalk, placement, carryingDrone = false, rescuePose = null }: Props) {
  const [dragging, setDragging] = useState(false);
  // โจทย์ฝึกบนกริด/พื้นว่าง: วาดวัตถุจาก scene แทนของตามกติกา และให้โดรนมีเข็ม/ลูกดอกตามวัตถุที่วางไว้
  const custom = !!scene && scene.pattern !== 'standard';
  const has = (t: string) => !!scene && scene.objects.some((o) => o.type === t);
  const hasBalloons = custom ? has('balloon') : event.field.balloons;
  const hasTargets = custom ? has('target') : event.field.targets;
  const fieldLit = !!(lights?.some(light => light.enabled) || ceilingLights?.some(enabled => enabled));
  return (
    <Canvas
      frameloop={live || view === 'walk' ? 'always' : 'demand'}
      dpr={low ? [1, 1.4] : [1, 2]}
      camera={{ position: [0, 15.5, 0.01], fov: 42, near: 0.05, far: 80 }}
      gl={{ antialias: !low, powerPreference: low ? 'low-power' : 'high-performance', stencil: false }}
      style={{ touchAction: 'none' }}
      onContextMenu={placement ? event => event.preventDefault() : undefined}
      aria-label="สนามแข่งขัน 3 มิติ"
    >
      <color attach="background" args={['#0b0d12']} />
      <ambientLight intensity={fieldLit ? 0.8 : 1.15} />
      <hemisphereLight args={['#dbe7ff', '#202530', fieldLit ? 0.65 : 0.9]} />
      <directionalLight position={[5, 9, 6]} intensity={fieldLit ? 1.65 : 2.2} />
      <Surround />
      {scene && scene.pattern !== 'standard' ? <PlainMat pattern={scene.pattern} low={low} /> : <Mat low={low} />}
      <Surroundings />
      {lights && <CornerLeds lights={lights} ceilingLights={ceilingLights ?? [false, false, false, false]} low={low} />}
      {scene && !placement && <SceneLayer3D spec={scene} popped={marks.popped} playheadRef={playheadRef} />}
      {(() => {
        const pb = custom ? baseAt(scene) : { x: 0, y: 0 };
        return pb ? <group position={[pb.x, 0, -pb.y]}><Takeoff color={event.field.takeoffColor} hoop={!custom && !placement} /></group> : null;
      })()}
      {!placement && !custom && event.field.platforms && <Platforms />}
      {!placement && !custom && event.field.balloons && <Balloons popped={marks.popped} />}
      {!placement && !custom && event.field.targets && (<><Targets /><ShootZones drone={drone} /></>)}
      {!carryingDrone && !rescuePose && <Drone drone={drone} onDrone={onDrone} onRotate={placement?.onRotate} setDragging={setDragging} low={low} live={live && !placement} placement={!!placement} poseRef={poseRef} platforms={event.field.platforms && !custom} loaded={loaded} dartInventory={hasTargets ? dartInventory : { front: 0, back: 0 }} dartRack={hasTargets} needle={hasBalloons} />}
      {rescuePose && walkPoseRef && <RescueDrone low={low} start={rescuePose} walker={walkPoseRef} view={view} />}
      {carryingDrone && view === 'walk' && <HandDrone low={low} />}
      {placement && <PlacementMarkers center={placement.center} target={placement.target} drone={drone} aligned={placement.aligned} onRotate={placement.onRotate} scene={scene} />}
      {walkPoseRef && <WalkerMarker poseRef={walkPoseRef} visible={view !== 'walk' && !placement} />}
      {showDimensions && <FieldDimensions3D scene={scene} fromId={dimensionFrom} toId={dimensionTo} />}
      {measurements.some((item) => item.points.length > 0) && <FieldMeasurements3D measurements={measurements} />}
      {!placement && <MarksLayer marks={marks} playheadRef={playheadRef} />}
      {live && <HoldPulse k={holdKey} poseRef={poseRef} />}
      {shot && <DartFlight key={shot.id ?? 0} shot={shot} />}
      {view === 'walk' && walkPoseRef && walkInputRef
        ? <WalkCameraRig poseRef={walkPoseRef} inputRef={walkInputRef} onWalk={onWalk} scene={scene} enabled={walkControlsEnabled} />
        : <CameraRig view={view} topH={custom && scene!.pattern === 'grid5' ? 8.4 : 15.5} drone={drone} dragging={dragging} live={live} poseRef={poseRef} highlight={highlight} placementCenter={placement?.center} />}
    </Canvas>
  );
}
