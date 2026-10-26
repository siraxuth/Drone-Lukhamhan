import { SHORT } from './skills';
import type { SkillId } from './types';

export type RadarItem = { skill: SkillId; value: number | null };

/**
 * แผนภาพเรดาร์ความชำนาญ 0–100% ต่อทักษะ (SVG ปรับขนาดตามจอ) · ทักษะที่ยังไม่พอวัดแสดงเป็นจุดโปร่งที่ 50%
 * มีรายการตัวเลขแยกในหน้าเสมอ (ไม่พึ่งภาพอย่างเดียว) จึงใส่ role=img พร้อมคำอธิบายสั้นๆ
 */
export function SkillRadar({ items }: { items: RadarItem[] }) {
  const n = items.length, R = 92, C = 130;
  const pt = (i: number, r: number) => { const a = (Math.PI * 2 * i) / n - Math.PI / 2; return [C + Math.cos(a) * r, C + Math.sin(a) * r] as const; };
  const ring = (k: number) => items.map((_, i) => pt(i, R * k).join(',')).join(' ');
  const poly = items.map((it, i) => pt(i, R * (it.value ?? 0.5)).join(',')).join(' ');
  return (
    <svg viewBox="0 0 260 260" role="img" aria-label="แผนภาพเรดาร์ความชำนาญแต่ละทักษะ" className="mx-auto h-auto w-full max-w-sm">
      {[0.25, 0.5, 0.75, 1].map((k) => <polygon key={k} points={ring(k)} fill="none" stroke="var(--line)" strokeWidth={1} />)}
      {items.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="var(--line)" strokeWidth={1} />; })}
      <polygon points={poly} fill="color-mix(in oklab, var(--brand-blue) 22%, transparent)" stroke="var(--brand-blue)" strokeWidth={2.5} strokeLinejoin="round" />
      {items.map((it, i) => { const [x, y] = pt(i, R * (it.value ?? 0.5)); return it.value === null ? <circle key={i} cx={x} cy={y} r={4} fill="var(--surface)" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="2 2" /> : <circle key={i} cx={x} cy={y} r={4} fill="var(--brand-blue)" />; })}
      {items.map((it, i) => {
        const [x, y] = pt(i, R + 18);
        const anchor = Math.abs(x - C) < 6 ? 'middle' : x > C ? 'start' : 'end';
        return <text key={it.skill} x={x} y={y + 4} textAnchor={anchor} fontSize={11} fontWeight={600} fill="var(--foreground)" style={{ paintOrder: 'stroke' }} stroke="var(--background)" strokeWidth={3}>{SHORT[it.skill]}</text>;
      })}
    </svg>
  );
}
