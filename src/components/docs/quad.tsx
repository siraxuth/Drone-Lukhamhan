import { C } from './svg';

const POS: Array<{ x: number; y: number; cw: boolean; n: number }> = [
  { x: 76, y: -76, cw: true, n: 1 }, // หน้าขวา
  { x: -76, y: -76, cw: false, n: 2 }, // หน้าซ้าย
  { x: -76, y: 76, cw: true, n: 3 }, // หลังซ้าย
  { x: 76, y: 76, cw: false, n: 4 }, // หลังขวา
];

const arc = (cx: number, cy: number, r: number, cw: boolean) => {
  const a0 = (-200 * Math.PI) / 180, a1 = (60 * Math.PI) / 180;
  const p = (a: number) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  return cw ? `M${p(a0)} A${r} ${r} 0 1 1 ${p(a1)}` : `M${p(a1)} A${r} ${r} 0 1 0 ${p(a0)}`;
};

/**
 * โดรนมองจากด้านบน (หัวโดรนอยู่ด้านบนของภาพ) วาดรอบจุด (0,0) ขนาดประมาณ 260×260
 * speeds = ความเร็วใบพัด [M1 หน้าขวา, M2 หน้าซ้าย, M3 หลังซ้าย, M4 หลังขวา] 0..1 · ฟ้า = หมุนตามเข็ม · แดง = ทวนเข็ม
 * M1/M3 หมุนตามเข็ม และ M2/M4 ทวนเข็ม (จัดเป็นคู่ทแยงมุม เหมือนโมเดลในเว็บนี้)
 */
export function TopQuad({ speeds = [0.6, 0.6, 0.6, 0.6], labels = true, arrows = true }: { speeds?: [number, number, number, number]; labels?: boolean; arrows?: boolean }) {
  return (
    <g>
      <path d="M-30 -30 L-76 -76 M30 -30 L76 -76 M-30 30 L-76 76 M30 30 L76 76" stroke={C.soft} strokeWidth={6} />
      {POS.map((m, i) => {
        const tone = m.cw ? 'var(--brand-blue)' : 'var(--brand-red)';
        const s = speeds[i];
        return (
          <g key={m.n}>
            <circle cx={m.x} cy={m.y} r={36} fill={`color-mix(in oklab, ${tone} ${Math.round(8 + s * 55)}%, var(--surface))`} stroke={tone} strokeWidth={2 + s * 3} />
            {arrows && <path d={arc(m.x, m.y, 46, m.cw)} stroke={tone} strokeWidth={3} markerEnd={`url(#ah-${m.cw ? 'blue' : 'red'})`} />}
            {labels && <text x={m.x} y={m.y + 6} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>M{m.n}</text>}
          </g>
        );
      })}
      <rect x={-34} y={-44} width={68} height={88} rx={14} fill={C.paper} stroke={C.ink} strokeWidth={2.5} />
      <path d="M0 -64 L11 -48 H-11 Z" fill={C.red} />
    </g>
  );
}
