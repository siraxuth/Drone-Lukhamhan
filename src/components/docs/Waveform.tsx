import { Arrow, C, Svg, T } from './svg';

/**
 * สัญญาณ PWM ของเซอร์โว: ทุก 20 มิลลิวินาที ส่งพัลส์สูง pulse มิลลิวินาที
 * <Waveform pulse={1.5} label="กลาง (90°)" />
 */
export function Waveform({ pulse = 1.5, period = 20, label }: { pulse?: number; period?: number; label?: string }) {
  const W = 760, H = 230, x0 = 50, base = 170, top = 70;
  const unit = (W - 2 * x0) / (period * 2.2); // 2.2 คาบพอดีจอ
  const x = (ms: number) => x0 + ms * unit;
  let d = `M${x0} ${base}`;
  for (let k = 0; k < 2; k++) {
    const s = k * period;
    d += ` L${x(s)} ${base} L${x(s)} ${top} L${x(s + pulse)} ${top} L${x(s + pulse)} ${base} L${x(s + period)} ${base}`;
  }
  d += ` L${x(period * 2.2)} ${base}`;
  return (
    <Svg w={W} h={H} title={`สัญญาณ PWM พัลส์ ${pulse} มิลลิวินาที ทุก ${period} มิลลิวินาที`}>
      <path d={d} stroke={C.blue} strokeWidth={4} />
      <path d={`M${x(0)} ${base + 28} H${x(period)}`} stroke={C.soft} strokeWidth={2} markerEnd="url(#ah-soft)" markerStart="url(#ah-soft)" />
      <T x={x(period / 2)} y={base + 54} c={C.soft}>ทุก {period} ms (50 ครั้งต่อวินาที)</T>
      <path d={`M${x(0)} ${top - 18} H${x(pulse)}`} stroke={C.red} strokeWidth={2.5} markerEnd="url(#ah-red)" markerStart="url(#ah-red)" />
      <T x={x(pulse) + 8} y={top - 28} c={C.red} anchor="start">กว้าง {pulse} ms{label ? ` → ${label}` : ''}</T>
      <T x={x0 - 10} y={top + 6} anchor="end" c={C.soft} size={14}>สูง</T>
      <T x={x0 - 10} y={base + 5} anchor="end" c={C.soft} size={14}>ต่ำ</T>
      <Arrow d={`M${x(period * 2.2) - 8} ${base + 36} L${x(period * 2.2) + 14} ${base + 36}`} tone="soft" w={2} />
    </Svg>
  );
}
