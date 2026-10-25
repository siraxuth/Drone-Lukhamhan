import type { ReactNode } from 'react';

/** สีสำหรับ SVG ในบทเรียน — ใช้โทเคนของเว็บ จึงเปลี่ยนตามโหมดสว่าง/มืดเอง */
export const C = {
  ink: 'var(--foreground)',
  soft: 'var(--muted-foreground)',
  line: 'var(--line)',
  paper: 'var(--surface)',
  paper2: 'var(--surface-2)',
  blue: 'var(--brand-blue)',
  red: 'var(--brand-red)',
} as const;

/**
 * กรอบ SVG มาตรฐานของ docs: ใส่ viewBox, ชื่อ (อ่านออกเสียงได้), และหัวลูกศรสำเร็จรูป
 * หัวลูกศรอ้างด้วย markerEnd="url(#ah-blue)" | ah-red | ah-ink | ah-soft
 */
export function Svg({ w, h, title, desc, children }: { w: number; h: number; title: string; desc?: string; children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title} className="h-auto w-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <title>{title}</title>
      {desc && <desc>{desc}</desc>}
      <defs>
        {(['blue', 'red', 'ink', 'soft'] as const).map((k) => (
          <marker key={k} id={`ah-${k}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={C[k]} />
          </marker>
        ))}
      </defs>
      {children}
    </svg>
  );
}

type TProps = { x: number; y: number; children: ReactNode; c?: string; size?: number; anchor?: 'start' | 'middle' | 'end'; weight?: number; mono?: boolean };
/** ข้อความใน SVG (ขั้นต่ำ 14 หน่วย) มีขอบสีพื้นช่วยให้อ่านทับเส้นได้ */
export function T({ x, y, children, c = C.ink, size = 16, anchor = 'middle', weight = 600, mono }: TProps) {
  return (
    <text x={x} y={y} fill={c} fontSize={size} fontWeight={weight} textAnchor={anchor} fontFamily={mono ? 'var(--font-mono)' : 'var(--font-sans)'} stroke={C.paper} strokeWidth={4} paintOrder="stroke" strokeLinejoin="round">
      {children}
    </text>
  );
}

/** ลูกศรเส้นตรง/โค้ง: d = path, tone = สี */
export function Arrow({ d, tone = 'blue', w = 3.5, dash }: { d: string; tone?: 'blue' | 'red' | 'ink' | 'soft'; w?: number; dash?: boolean }) {
  return <path d={d} stroke={C[tone]} strokeWidth={w} strokeDasharray={dash ? '2 7' : undefined} markerEnd={`url(#ah-${tone})`} />;
}

/** กล่องมุมมน */
export function Box({ x, y, w, h, tone = 'paper2', r = 12, stroke = C.line, sw = 1.5 }: { x: number; y: number; w: number; h: number; tone?: 'paper' | 'paper2' | 'blue' | 'red'; r?: number; stroke?: string; sw?: number }) {
  const fill = tone === 'blue' ? 'color-mix(in oklab, var(--brand-blue) 14%, var(--surface))' : tone === 'red' ? 'color-mix(in oklab, var(--brand-red) 14%, var(--surface))' : tone === 'paper' ? C.paper : C.paper2;
  return <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={stroke} strokeWidth={sw} />;
}
