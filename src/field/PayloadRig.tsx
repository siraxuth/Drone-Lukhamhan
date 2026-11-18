'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { MathUtils, Quaternion, Vector2, Vector3, type Group, type Mesh } from 'three';
import { countsFor, DEFAULT_GATE, SIDE_CHANNELS, type GatePositions, type Payload } from '@/flight/payload';

const OUTER = 0.012;
const INNER = 0.0105;
const BALL = 0.01;
const PIVOT = 0.01475;
const GATE_Y = -0.0485;
const OPEN_ANGLE = MathUtils.degToRad(DEFAULT_GATE.open);

function Tube({ bottom, top, outer = OUTER, inner = INNER, color = "#378592" }: { bottom: number; top: number; outer?: number; inner?: number; color?: string }) {
  const profile = useMemo(() => [
    new Vector2(outer, bottom), new Vector2(outer, top),
    new Vector2(inner, top), new Vector2(inner, bottom), new Vector2(outer, bottom),
  ], [bottom, top, outer, inner]);
  return <mesh>
    <latheGeometry args={[profile, 24]} />
    <meshStandardMaterial color={color} roughness={0.45} />
  </mesh>;
}

export function PayloadChute({ count, opening, direction = 1, actuator = true }: { count: number; opening: number; direction?: number; actuator?: boolean }) {
  const gate = useRef<Group>(null);
  const falling = useRef<Mesh>(null);
  const previous = useRef(count);
  const pending = useRef(0);
  const elapsed = useRef(0);
  useFrame(({ invalidate }, dt) => {
    if (!gate.current || !falling.current) return;
    const target = direction * opening * OPEN_ANGLE;
    // Latch snaps closed near the target to let the demand-rendered field go idle.
    const moving = Math.abs(target - gate.current.rotation.y) > 0.002;
    gate.current.rotation.y = moving ? MathUtils.damp(gate.current.rotation.y, target, 20, dt) : target;
    if (count < previous.current) pending.current += previous.current - count;
    previous.current = count;
    falling.current.visible = pending.current > 0;
    if (pending.current > 0) {
      elapsed.current += dt;
      falling.current.position.y = -0.044 - 4.9 * elapsed.current ** 2;
      if (elapsed.current >= 0.13) {
        elapsed.current = 0;
        pending.current--;
      }
    }
    if (moving || pending.current > 0 || falling.current.visible) invalidate();
  });

  return <group>
    {/* 90 mm including the open slot and the separate outlet collar. */}
    <Tube bottom={-0.0465} top={0.036} />
    <Tube bottom={-0.054} top={-0.0505} />
    <Tube bottom={0.0528} top={0.0544} />
    {[Math.PI / 6, Math.PI * 5 / 6, Math.PI * 1.5].map(angle => (
      <mesh key={angle} position={[0.0116 * Math.cos(angle), 0.0445, 0.0116 * Math.sin(angle)]}>
        <cylinderGeometry args={[0.00085, 0.00085, 0.0182, 8]} />
        <meshStandardMaterial color="#378592" />
      </mesh>
    ))}
    {[-0.003, 0.003].map(x => (
      <mesh key={x} position={[x, GATE_Y, -direction * 0.0116]}>
        <boxGeometry args={[0.0028, 0.008, 0.00125]} />
        <meshStandardMaterial color="#52616c" />
      </mesh>
    ))}
    <group ref={gate} position={[0, GATE_Y, direction * PIVOT]}>
      <mesh position={[0, 0, -direction * PIVOT]}>
        <cylinderGeometry args={[0.0106, 0.0106, 0.0018, 20]} />
        <meshStandardMaterial color="#e78643" roughness={0.42} />
      </mesh>
      <mesh position={[0, 0, -direction * PIVOT / 2]}>
        <boxGeometry args={[0.004, 0.0018, PIVOT]} />
        <meshStandardMaterial color="#e78643" />
      </mesh>
    </group>
    <mesh position={[0, -0.0445, direction * PIVOT]}>
      <cylinderGeometry args={[0.00235, 0.00235, 0.012, 12]} />
      <meshStandardMaterial color="#9ca7af" metalness={0.55} />
    </mesh>
    {actuator && <mesh position={[0.005, -0.031, direction * 0.020]}>
      <boxGeometry args={[0.020, 0.015, 0.010]} />
      <meshStandardMaterial color="#263a51" />
    </mesh>}
    {Array.from({ length: count }, (_, i) => (
      <mesh key={i} position={[0, -0.0375 + i * 2 * BALL, 0]}>
        <sphereGeometry args={[BALL, 12, 8]} />
        <meshStandardMaterial color="#f1cd44" roughness={0.6} />
      </mesh>
    ))}
    <mesh ref={falling} visible={false}>
      <sphereGeometry args={[BALL, 12, 8]} />
      <meshStandardMaterial color="#f1cd44" roughness={0.6} />
    </mesh>
  </group>;
}

function Rail({ from, to, radius = 0.0015 }: { from: [number, number, number]; to: [number, number, number]; radius?: number }) {
  const start = new Vector3(...from);
  const end = new Vector3(...to);
  const vector = end.clone().sub(start);
  return <mesh position={start.lerp(end, 0.5)} quaternion={new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), vector.clone().normalize())}>
    <cylinderGeometry args={[radius, radius, vector.length(), 8]} />
    <meshStandardMaterial color="#52616c" />
  </mesh>;
}

export function PayloadRig({ payload, gates }: { payload: Payload; gates: GatePositions }) {
  const counts = countsFor(payload);
  const installed = payload.installed ?? counts;
  return <group>{(['L', 'R'] as const).map(side => {
    const sign = side === 'L' ? 1 : -1;
    const channels = SIDE_CHANNELS[side];
    const first = Math.ceil(installed[channels[0]] / 5);
    const second = Math.ceil(installed[channels[1]] / 5);
    const total = first + second;
    if (!total) return null;

    return <group key={side}>
      {channels.flatMap((channel, row) => {
        const number = row === 0 ? first : second;
        return Array.from({ length: number }, (_, index) => {
          const direction = second ? (row === 0 ? 1 : -1) : (index === 0 ? 1 : -1);
          const x = sign * (second && index === 1 ? 0.096 : 0.062);
          const z = total === 1 ? 0 : direction * 0.014;
          const count = Math.max(0, Math.ceil((counts[channel] - index) / number));
          return <group key={`${channel}-${index}`} position={[x, 0, z]}>
            <PayloadChute count={count} opening={gates[channel] ?? 0} direction={direction} actuator={!second || index === 0} />
            <Tube bottom={0.0045} top={0.0075} outer={0.01275} inner={OUTER} color="#52616c" />
          </group>;
        });
      })}
      {([1, -1] as const).map(direction => {
        const rowCount = direction === 1 ? first : second;
        const endX = sign * (second && rowCount === 2 ? 0.100 : 0.066);
        const trackZ = direction * (total === 1 ? 0.0123 : 0.0263);
        return <group key={direction}>
          <group position={[sign * 0.053, 0.009, direction * 0.053]} rotation={[0, -Math.atan2(direction, sign), 0]}>
            <mesh position={[0, -0.004, 0]}><boxGeometry args={[0.009, 0.002, 0.0094]} /><meshStandardMaterial color="#52616c" /></mesh>
            {[-0.004, 0.004].map(edge => <mesh key={edge} position={[0, 0.001, edge]}><boxGeometry args={[0.009, 0.008, 0.0013]} /><meshStandardMaterial color="#52616c" /></mesh>)}
          </group>
          <Rail from={[sign * 0.053, 0.005, direction * 0.053]} to={[sign * 0.054, 0.006, trackZ]} />
          <Rail from={[sign * 0.054, 0.006, trackZ]} to={[endX, 0.006, trackZ]} />
        </group>;
      })}
    </group>;
  })}</group>;
}
