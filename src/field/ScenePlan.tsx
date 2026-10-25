import { baseAt, cellName, startOf, type ScenarioConfig, type SceneObject, type StartBase } from '@/lib/scenarios';

/** วาดลายสนามและวัตถุของโจทย์ฝึกเป็น SVG (พิกัดเมตร y ชี้ขึ้น ต้องวางในกลุ่มที่ scale(1,-1) แล้ว) */
const COLOR = { waypoint: '#3b82f6', hoop: '#f59e0b', platform: '#1d3fae', balloon: '#ef4466', target: '#f28c00' } as const;

const flip = (x: number, y: number) => `translate(${x} ${y}) scale(1,-1)`; // ตัวหนังสือไม่กลับหัว

/** ฐาน (สี่เหลี่ยมเขียว) และจุดวางโดรน (สี่เหลี่ยมดำ + ลูกศรบอกทิศหัว) · ต้องอยู่ในกลุ่ม scale(1,-1) */
export function BaseStartLayer({ cfg, showStart = true, selected = false }: { cfg: StartBase; showStart?: boolean; selected?: boolean }) {
  const b = baseAt(cfg);
  const st = startOf(cfg);
  return (
    <g pointerEvents="none">
      {b && <rect x={b.x - 0.75} y={b.y - 0.75} width={1.5} height={1.5} fill="#1f9d3a" opacity={0.9} />}
      {b && <text transform={flip(b.x, b.y - 0.95)} fontSize={0.3} fill="#86efac" textAnchor="middle" dominantBaseline="middle">ฐาน</text>}
      {showStart && (
        <g transform={`translate(${st.x} ${st.y}) rotate(${-st.yaw})`}>
          <rect x={-0.22} y={-0.22} width={0.44} height={0.44} rx={0.08} fill="#101216" stroke={selected ? '#fff' : 'var(--brand-blue)'} strokeWidth={0.06} />
          <path d="M0 0.62 L0.2 0.28 L-0.2 0.28 Z" fill="var(--brand-red)" />
        </g>
      )}
    </g>
  );
}

export function ScenePlanLayer({ pattern, objects, visits = {}, selected, labels = true }: { pattern: ScenarioConfig['pattern']; objects: SceneObject[]; visits?: Record<string, number>; selected?: string | null; labels?: boolean }) {
  return (
    <g>
      {pattern === 'grid5' && (
        <g>
          <rect x={-2.5} y={-2.5} width={5} height={5} fill="#3b82f6" opacity={0.08} />
          {[-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((g) => (
            <g key={g} stroke="#60a5fa" strokeWidth={0.03} opacity={0.75}>
              <line x1={g} y1={-2.5} x2={g} y2={2.5} />
              <line x1={-2.5} y1={g} x2={2.5} y2={g} />
            </g>
          ))}
          {labels && [-2, -1, 0, 1, 2].flatMap((xi) => [-2, -1, 0, 1, 2].map((yi) => (
            xi === 0 && yi === 0 ? null : <text key={`${xi}${yi}`} transform={flip(xi, yi)} fontSize={0.26} fill="#93c5fd" opacity={0.7} textAnchor="middle" dominantBaseline="middle">{cellName(xi, yi)}</text>
          )))}
        </g>
      )}
      {objects.map((o) => {
        const done = visits[o.id] !== undefined;
        const sel = selected === o.id;
        const ring = sel ? <circle cx={o.x} cy={o.y} r={0.62} fill="none" stroke="#fff" strokeWidth={0.05} strokeDasharray="0.1 0.08" /> : null;
        if (o.type === 'waypoint') {
          const r = (o.r ?? 45) / 100;
          return (
            <g key={o.id}>
              {ring}
              <circle cx={o.x} cy={o.y} r={r} fill={done ? '#22c55e' : COLOR.waypoint} opacity={0.28} stroke={done ? '#22c55e' : COLOR.waypoint} strokeWidth={0.05} />
              <text transform={flip(o.x, o.y)} fontSize={0.34} fontWeight={800} fill="#fff" textAnchor="middle" dominantBaseline="middle">{o.order ?? '●'}</text>
            </g>
          );
        }
        if (o.type === 'hoop') {
          const w = (o.size ?? 1) / 2;
          return (
            <g key={o.id}>
              {ring}
              <g transform={`translate(${o.x} ${o.y}) rotate(${-(o.yaw ?? 0)})`}>
                <line x1={-w} y1={0} x2={w} y2={0} stroke={done ? '#22c55e' : COLOR.hoop} strokeWidth={0.1} strokeLinecap="round" />
                <path d="M0 0.12 L0.1 -0.05 L-0.1 -0.05Z" transform="translate(0 0.25)" fill={done ? '#22c55e' : COLOR.hoop} />
              </g>
            </g>
          );
        }
        if (o.type === 'platform') return <g key={o.id}>{ring}<circle cx={o.x} cy={o.y} r={o.r ?? 0.5} fill={COLOR.platform} stroke="#fff" strokeWidth={0.04} /></g>;
        if (o.type === 'balloon') return <g key={o.id}>{ring}<rect x={o.x - 0.12} y={o.y - 0.12} width={0.24} height={0.24} fill="#c2641a" /><circle cx={o.x} cy={o.y} r={0.14} fill={COLOR.balloon} /></g>;
        return <g key={o.id}>{ring}<rect x={o.x - (o.r ?? 50) / 100} y={o.y - 0.05} width={((o.r ?? 50) / 100) * 2} height={0.1} fill={COLOR.target} /></g>;
      })}
    </g>
  );
}

/** ภาพย่อสนาม (การ์ดเลือกโจทย์ / รายการหลังบ้าน) */
export function ScenePreview({ config, className }: { config: ScenarioConfig; className?: string }) {
  const standard = config.pattern === 'standard';
  return (
    <svg viewBox="-5.4 -5.4 10.8 10.8" className={className} role="img" aria-label="ภาพย่อสนามของโจทย์">
      <g transform="scale(1,-1)">
        <rect x={-5} y={-5} width={10} height={10} rx={0.3} fill="#171b26" stroke="#ffffff" strokeOpacity={0.15} strokeWidth={0.08} />
        {standard && [[-2.5, 2.5], [2.5, 2.5], [-2.5, -2.5], [2.5, -2.5]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={0.5} fill="#1d3fae" opacity={0.55} />)}
        <ScenePlanLayer pattern={config.pattern} objects={config.objects} labels={false} />
        <BaseStartLayer cfg={config} />
      </g>
    </svg>
  );
}
