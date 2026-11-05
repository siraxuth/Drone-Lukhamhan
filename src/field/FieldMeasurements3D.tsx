'use client';

import { Line } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { measureColor, polygonArea, segmentLength, type Measurement } from '@/flight/measurements';
import type { SceneSpec } from './SceneObjects';
import { dimensionTargets } from './dimension-targets';

const point3 = (x: number, y: number, height = 0.13): [number, number, number] => [x, height, -y];

/** ป้ายเป็นภาพในฉาก Three.js โดยตรง ไม่สร้าง React root ซ้อนใน Canvas */
function DimensionLabel({ text, position }: { text: string; position: [number, number, number] }) {
  const { texture, ratio } = useMemo(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    context.font = 'bold 42px "Noto Sans Thai", sans-serif';
    canvas.width = Math.ceil(context.measureText(text).width + 64);
    canvas.height = 78;
    context.fillStyle = 'rgba(9, 17, 30, .92)';
    context.beginPath();
    context.roundRect(1, 1, canvas.width - 2, canvas.height - 2, 14);
    context.fill();
    context.strokeStyle = 'rgba(103, 232, 249, .85)';
    context.lineWidth = 3;
    context.stroke();
    context.font = 'bold 42px "Noto Sans Thai", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#fff';
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 3);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { texture, ratio: canvas.width / canvas.height };
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={position} scale={[0.34 * ratio, 0.34, 1]}><spriteMaterial map={texture} transparent depthTest={false} /></sprite>;
}

/** ขนาดสนามและระยะของสิ่งที่อยู่ในด่าน แสดงให้เห็นทันทีบนสนาม 3D */
export function FieldDimensions3D({ scene, fromId = 'start', toId }: { scene?: SceneSpec; fromId?: string; toId?: string }) {
  const targets = dimensionTargets(scene);
  const from = targets.find((target) => target.id === fromId) ?? targets[0];
  const end = targets.find((target) => target.id === toId && target.id !== from.id)
    ?? targets.find((target) => target.id !== from.id);
  const length = end ? segmentLength(from, end) : 0;
  return <group>
    <Line points={[point3(-5, -4.85), point3(5, -4.85)]} color="#e2e8f0" lineWidth={2} depthTest={false} />
    <Line points={[point3(-4.85, -5), point3(-4.85, 5)]} color="#e2e8f0" lineWidth={2} depthTest={false} />
    {Array.from({ length: 11 }, (_, i) => i - 5).map((n) => <group key={n}>
      <Line points={[point3(n, -4.72), point3(n, -4.98)]} color="#e2e8f0" lineWidth={2} depthTest={false} />
      <Line points={[point3(-4.72, n), point3(-4.98, n)]} color="#e2e8f0" lineWidth={2} depthTest={false} />
    </group>)}
    <DimensionLabel text="กว้าง 10 ม." position={point3(0, -4.9, 0.2)} />
    <DimensionLabel text="ยาว 10 ม." position={point3(-4.9, 0, 0.2)} />
    {end && length > 0.01 && (() => {
      const a = point3(from.x, from.y, 1.2), b = point3(end.x, end.y, 1.2);
      const nx = -(end.y - from.y) / length * 0.11, ny = (end.x - from.x) / length * 0.11;
      return <group>
        <Line points={[point3(from.x, from.y), a]} color="#38bdf8" lineWidth={1.5} depthTest={false} />
        <Line points={[point3(end.x, end.y), b]} color="#38bdf8" lineWidth={1.5} depthTest={false} />
        <Line points={[a, b]} color="#38bdf8" lineWidth={4} depthTest={false} />
        <Line points={[point3(from.x - nx, from.y - ny, 1.2), point3(from.x + nx, from.y + ny, 1.2)]} color="#38bdf8" lineWidth={3} depthTest={false} />
        <Line points={[point3(end.x - nx, end.y - ny, 1.2), point3(end.x + nx, end.y + ny, 1.2)]} color="#38bdf8" lineWidth={3} depthTest={false} />
        <DimensionLabel text={`${from.label} → ${end.label} · ${length.toFixed(2)} ม.`} position={point3((from.x + end.x) / 2, (from.y + end.y) / 2, 1.25)} />
      </group>;
    })()}
  </group>;
}

/** เส้นที่ผู้ใช้ลากในแผนวัดใหญ่ ปรากฏบนสนาม 3D โดยอัตโนมัติ */
export function FieldMeasurements3D({ measurements }: { measurements: Measurement[] }) {
  return <group>
    {measurements.map((item) => {
      const color = measureColor(item.id), points = item.points;
      const xyz = points.map((p) => point3(p.x, p.y, 0.18));
      return <group key={item.id}>
        {xyz.length >= 2 && <Line points={xyz} color={color} lineWidth={3} depthTest={false} />}
        {item.kind === 'area' && xyz.length >= 3 && <Line points={[xyz[xyz.length - 1], xyz[0]]} color={color} lineWidth={2} dashed dashSize={0.15} gapSize={0.1} depthTest={false} />}
        {points.slice(1).map((p, index) => {
          const first = points[index];
          return <DimensionLabel key={index} text={`${index + 1} → ${index + 2} · ${segmentLength(first, p).toFixed(2)} ม.`} position={point3((first.x + p.x) / 2, (first.y + p.y) / 2, 0.26)} />;
        })}
        {item.kind === 'area' && points.length >= 3 && <DimensionLabel text={`พื้นที่ ${polygonArea(points).toFixed(2)} ตร.ม.`} position={point3(points.reduce((s, p) => s + p.x, 0) / points.length, points.reduce((s, p) => s + p.y, 0) / points.length, 0.28)} />}
        {points.map((p, index) => <group key={index} position={point3(p.x, p.y, 0.19)}>
          <mesh><sphereGeometry args={[0.12, 12, 10]} /><meshBasicMaterial color={color} depthTest={false} /></mesh>
          <DimensionLabel text={String(index + 1)} position={[0, 0.2, 0]} />
        </group>)}
      </group>;
    })}
  </group>;
}
