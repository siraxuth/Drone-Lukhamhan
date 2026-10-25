'use client';

import { useRef } from 'react';
import { COMPETITOR, FIELD } from './layout';
import { heading, type DroneState } from './aim';
import type { RuleEvent } from '@/rules/types';
import { cellName } from '@/lib/scenarios';
import type { SceneSpec } from './SceneObjects';
import { BaseStartLayer, ScenePlanLayer } from './ScenePlan';

/**
 * แผนผังสนามมองจากด้านบน (SVG) — ใช้เป็นโหมดประหยัดเครื่อง และเป็นภาพประกอบในหน้าแรก
 * พิกัดตรงกับสนามจริง 1 หน่วย = 1 เมตร, y เหนืออยู่ด้านบน
 */
export function FieldPlan2D({
  event, drone, onDrone, interactive = true, className, scene,
}: { event: RuleEvent; drone?: DroneState; onDrone?: (p: Partial<DroneState>) => void; interactive?: boolean; className?: string; scene?: SceneSpec }) {
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const h = FIELD.size / 2;
  const view = 6.2;

  const toField = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * view * 2 - view;
    const y = -(((e.clientY - r.top) / r.height) * view * 2 - view);
    const lim = h - 0.15;
    return { x: Math.max(-lim, Math.min(lim, x)), y: Math.max(-lim, Math.min(lim, y)) };
  };
  const hd = drone ? heading(drone.yaw) : null;

  return (
    <svg
      ref={svg}
      viewBox={`${-view} ${-view} ${view * 2} ${view * 2}`}
      className={className}
      role="img"
      aria-label={`แผนผังสนาม 10×10 เมตร ประเภท ${event.name}`}
      style={{ touchAction: interactive ? 'none' : undefined, cursor: interactive ? 'crosshair' : undefined }}
      onPointerDown={interactive ? (e) => { dragging.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); onDrone?.(toField(e)); } : undefined}
      onPointerMove={interactive ? (e) => { if (dragging.current) onDrone?.(toField(e)); } : undefined}
      onPointerUp={interactive ? () => { dragging.current = false; } : undefined}
    >
      {/* ตัวสนาม (y กลับด้านเพราะ SVG แกน y ชี้ลง) */}
      <g transform="scale(1,-1)">
        <rect x={-h} y={-h} width={FIELD.size} height={FIELD.size} rx={0.15} fill="var(--surface)" stroke="var(--line)" strokeWidth={0.05} />
        {[-4, -3, -2, -1, 1, 2, 3, 4].map((g) => (
          <g key={g} stroke="var(--line)" strokeWidth={0.015} opacity={0.7}>
            <line x1={g} y1={-h} x2={g} y2={h} />
            <line x1={-h} y1={g} x2={h} y2={g} />
          </g>
        ))}
        <g stroke="var(--line)" strokeWidth={0.03}><line x1={0} y1={-h} x2={0} y2={h} /><line x1={-h} y1={0} x2={h} y2={0} /></g>

        {scene && <ScenePlanLayer pattern={scene.pattern} objects={scene.objects} visits={scene.visits} />}

        {/* แท่นทิ้ง/Check Point วงกลม */}
        {event.field.platforms && FIELD.platform.positions.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={FIELD.platform.radius} fill="#1d3fae" stroke="#fff" strokeWidth={0.04} />
        ))}

        {/* เสาลูกโป่ง */}
        {event.field.balloons && FIELD.balloons.groups.flatMap((g, gi) => [-1, 0, 1].map((k) => {
          const x = g.center[0] + (g.along === 'x' ? k * FIELD.balloons.spacing : 0);
          const y = g.center[1] + (g.along === 'y' ? k * FIELD.balloons.spacing : 0);
          return (
            <g key={`${gi}-${k}`}>
              <rect x={x - 0.125} y={y - 0.125} width={0.25} height={0.25} fill="#c2641a" />
              <circle cx={x} cy={y} r={0.13} fill="#c8202f" />
            </g>
          );
        }))}

        {/* เป้ายิง + วงห้ามยิงในระยะ 1 ม. */}
        {event.field.targets && FIELD.target.positions.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={FIELD.target.minShootDistance} fill="none" stroke="#4aa3ff" strokeWidth={0.03} strokeDasharray="0.12 0.1" />
            <rect x={x - 0.5} y={y - 0.04} width={1} height={0.08} fill="#f28c00" />
            <rect x={x - 0.5} y={y - 0.04} width={0.12} height={0.08} fill="#d62828" />
          </g>
        ))}

        {/* แท่น Takeoff + ห่วง */}
        {scene && scene.pattern !== 'standard' ? (
          <BaseStartLayer cfg={scene} showStart={false} />
        ) : (
          <>
            <rect x={-0.75} y={-0.75} width={1.5} height={1.5} fill={event.field.takeoffColor === 'green' ? '#1f9d3a' : '#c8202f'} />
            <rect x={-0.5} y={-0.5} width={1} height={1} fill="none" stroke="#c2641a" strokeWidth={0.07} />
          </>
        )}

        {/* คนแข่ง: ยืนอยู่ในสนามตลอด (ข้างแท่นฝั่งตะวันตก) */}
        <g>
          <circle cx={COMPETITOR.home.x} cy={COMPETITOR.home.y} r={0.28} fill="#1d4ed8" stroke="#fff" strokeWidth={0.04} />
          <circle cx={COMPETITOR.home.x} cy={COMPETITOR.home.y} r={0.11} fill="#d9a074" />
        </g>
        {/* ทิศหัวโดรน + เส้นเล็ง */}
        {drone && hd && (
          <g>
            <line x1={drone.x} y1={drone.y} x2={drone.x + hd.x * 8} y2={drone.y + hd.y * 8} stroke="var(--brand-red)" strokeWidth={0.03} strokeDasharray="0.12 0.08" opacity={0.8} />
            <g transform={`translate(${drone.x} ${drone.y}) rotate(${-drone.yaw})`}>
              <rect x={-0.2} y={-0.2} width={0.4} height={0.4} rx={0.07} fill="#101216" stroke="var(--brand-blue)" strokeWidth={0.05} />
              <path d="M0 0.32 L0.13 0.08 L-0.13 0.08 Z" fill="var(--brand-red)" />
            </g>
          </g>
        )}
      </g>
      {/* ป้ายทิศ (ไม่กลับด้าน) */}
      <g fontSize={0.38} fill="var(--muted-foreground)" textAnchor="middle" fontWeight={600}>
        <text x={0} y={-h - 0.35}>เหนือ (ไปข้างหน้า)</text>
        <text x={0} y={h + 0.7}>ใต้ — ที่ผู้แข่งขันยืน</text>
      </g>
      <rect x={-1} y={h - 0.02} width={2} height={0.45} fill="#8d939e" rx={0.06} />
      {/* ไม้บรรทัดมาตราส่วน 1 ม. */}
      <g stroke="var(--foreground)" strokeWidth={0.05}><line x1={-h} y1={h + 1.15} x2={-h + 1} y2={h + 1.15} /></g>
      <text x={-h + 0.5} y={h + 1.55} fontSize={0.32} textAnchor="middle" fill="var(--foreground)">1 ม.</text>
    </svg>
  );
}
