'use client';

import { useRef, type Dispatch, type PointerEvent, type SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { FieldPlan2D } from '@/field/FieldPlan2D';
import type { RuleEvent } from '@/rules/types';
import type { SceneSpec } from '@/field/SceneObjects';
import { clampMeasurePoint, measureColor, pathLength, polygonArea, segmentLength, type Measurement, type MeasurePoint } from './measurements';

type Props = {
  event: RuleEvent;
  scene?: SceneSpec;
  measurements: Measurement[];
  onChange: Dispatch<SetStateAction<Measurement[]>>;
  activeId: number;
  onActiveChange: (id: number) => void;
};

/** แผนผังขนาดใหญ่: วัดได้หลายชุด ลากแต่ละจุดเพื่อแก้ และเห็นผลทันทีบนสนาม 3D */
export function FieldMeasure({ event, scene, measurements, onChange, activeId, onActiveChange }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef<{ id: number; index: number } | null>(null);
  const active = measurements.find((item) => item.id === activeId) ?? measurements[0];
  const fromPointer = (event: PointerEvent<SVGSVGElement>): MeasurePoint | null => {
    const matrix = svg.current?.getScreenCTM()?.inverse();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    if (Math.abs(point.x) > 5 || Math.abs(point.y) > 5) return null;
    return clampMeasurePoint({ x: point.x, y: -point.y });
  };
  const updatePoint = (id: number, index: number, point: MeasurePoint) => onChange((current) =>
    current.map((item) => item.id === id ? { ...item, points: item.points.map((old, i) => i === index ? point : old) } : item));
  const addMeasurement = (kind: Measurement['kind']) => {
    const id = Math.max(0, ...measurements.map((item) => item.id)) + 1;
    onChange((current) => [...current, { id, kind, points: [] }]);
    onActiveChange(id);
  };
  const onDown = (event: PointerEvent<SVGSVGElement>) => {
    const target = event.target as SVGElement;
    const id = Number(target.dataset.measureId);
    const index = Number(target.dataset.pointIndex);
    if (target.dataset.measureId && target.dataset.pointIndex && Number.isInteger(index)) {
      dragging.current = { id, index };
      onActiveChange(id);
      svg.current?.setPointerCapture(event.pointerId);
      return;
    }
    const point = fromPointer(event);
    if (!point || !active) return;
    onChange((current) => current.map((item) => item.id === active.id ? { ...item, points: [...item.points, point] } : item));
  };
  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const point = fromPointer(event);
    if (point) updatePoint(dragging.current.id, dragging.current.index, point);
  };

  return (
    <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0">
        <p className="mb-2 text-sm text-muted-foreground">แตะสนามเพื่อเพิ่มจุด · ลากจุดหมายเลขเพื่อย้าย · ระยะทุกช่วงจะขึ้นบนแผนและสนาม 3D</p>
        <div className="relative mx-auto aspect-square w-full max-w-[min(84svh,60rem)] overflow-hidden squircle-2xl border border-line bg-surface">
          <FieldPlan2D event={event} interactive={false} scene={scene} className="absolute inset-0 size-full" />
          <svg ref={svg} viewBox="-6.2 -6.2 12.4 12.4" className="absolute inset-0 size-full cursor-crosshair touch-none" role="img" aria-label="สนามวัดระยะและพื้นที่ ลากจุดหมายเลขเพื่อย้าย" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => { dragging.current = null; }} onPointerCancel={() => { dragging.current = null; }}>
            {measurements.map((item) => {
              const color = measureColor(item.id);
              const points = item.points;
              const polygon = item.kind === 'area' && points.length >= 3;
              return <g key={item.id} opacity={item.id === activeId ? 1 : 0.75}>
                {polygon && <polygon points={points.map((p) => `${p.x},${-p.y}`).join(' ')} fill={color} fillOpacity={0.14} stroke={color} strokeWidth={0.04} />}
                {points.length >= 2 && <polyline points={points.map((p) => `${p.x},${-p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={0.075} strokeLinecap="round" strokeLinejoin="round" />}
                {points.slice(1).map((p, index) => {
                  const first = points[index], mid = { x: (first.x + p.x) / 2, y: (first.y + p.y) / 2 };
                  return <text key={index} x={mid.x} y={-mid.y - 0.1} textAnchor="middle" fontSize={0.3} fontWeight={700} fill="#fff" stroke="#111827" strokeWidth={0.09} paintOrder="stroke">{index + 1}→{index + 2} · {segmentLength(first, p).toFixed(2)} ม.</text>;
                })}
                {polygon && <text x={points.reduce((sum, p) => sum + p.x, 0) / points.length} y={-points.reduce((sum, p) => sum + p.y, 0) / points.length} textAnchor="middle" fontSize={0.33} fontWeight={800} fill="#fff" stroke="#111827" strokeWidth={0.1} paintOrder="stroke">{polygonArea(points).toFixed(2)} ตร.ม.</text>}
                {points.map((p, index) => <g key={index}>
                  <circle data-measure-id={item.id} data-point-index={index} cx={p.x} cy={-p.y} r={0.28} fill="transparent" className="cursor-grab active:cursor-grabbing" />
                  <circle cx={p.x} cy={-p.y} r={0.15} fill={color} stroke="#fff" strokeWidth={0.045} pointerEvents="none" />
                  <text x={p.x + 0.22} y={-p.y - 0.2} fontSize={0.31} fontWeight={700} fill="#fff" stroke="#111827" strokeWidth={0.08} paintOrder="stroke" pointerEvents="none">{index + 1}</text>
                </g>)}
              </g>;
            })}
          </svg>
        </div>
      </div>
      <div className="grid content-start gap-3">
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => addMeasurement('distance')}>+ วัดระยะ</Button><Button type="button" variant="outline" onClick={() => addMeasurement('area')}>+ วัดพื้นที่</Button></div>
        <div className="grid max-h-[45svh] gap-2 overflow-y-auto">
          {measurements.map((item) => <div key={item.id} className={`squircle-xl border p-3 ${item.id === activeId ? 'border-brand-blue bg-brand-blue/10' : 'border-line bg-surface'}`}>
            <button type="button" onClick={() => onActiveChange(item.id)} className="flex w-full items-center gap-2 text-left font-semibold"><span className="size-3 rounded-full" style={{ backgroundColor: measureColor(item.id) }} />{item.kind === 'area' ? 'พื้นที่' : 'ระยะ'}ชุดที่ {item.id}</button>
            <p className="mt-1 text-sm text-muted-foreground">{item.points.length} จุด · {item.kind === 'area' ? `${polygonArea(item.points).toFixed(2)} ตร.ม.` : `${pathLength(item.points).toFixed(2)} ม.`}</p>
            {item.id === activeId && <div className="mt-2 flex flex-wrap gap-2 text-sm">
              <button type="button" disabled={!item.points.length} onClick={() => onChange((current) => current.map((part) => part.id === item.id ? { ...part, points: part.points.slice(0, -1) } : part))} className="text-brand-blue disabled:opacity-40">ย้อนจุดล่าสุด</button>
              <button type="button" onClick={() => {
                if (measurements.length === 1) onChange([{ id: item.id, kind: item.kind, points: [] }]);
                else { onChange((current) => current.filter((part) => part.id !== item.id)); onActiveChange(measurements.find((part) => part.id !== item.id)!.id); }
              }} className="text-brand-red">{measurements.length === 1 ? 'ล้างจุด' : 'ลบชุดนี้'}</button>
            </div>}
          </div>)}
        </div>
        <p className="text-sm text-muted-foreground">ปิดแผนนี้แล้วเส้นและตัวเลขที่วัดไว้จะแสดงบนสนาม 3D โดยอัตโนมัติ</p>
      </div>
    </div>
  );
}
