import type { ComponentType } from 'react';
import { Arrow, Box, C, Svg, T } from '../svg';

/** สนาม 10×10 ม. มองจากด้านบน (ตาม src/field/layout.ts) 1 ม. = 50 หน่วย */
export function CompField() {
  const cx = 270, cy = 270, s = 50;
  const px = (x: number) => cx + x * s;
  const py = (y: number) => cy - y * s;
  const plats: [number, number][] = [[-2.5, 2.5], [2.5, 2.5], [-2.5, -2.5], [2.5, -2.5]];
  const balloon = (x: number, y: number, along: 'x' | 'y') =>
    [-1, 0, 1].map((k) => (
      <circle key={`${x}${y}${k}`} cx={px(x + (along === 'x' ? k * 0.6 : 0))} cy={py(y + (along === 'y' ? k * 0.6 : 0))} r={7} fill={C.red} />
    ));
  return (
    <Svg w={760} h={590} title="ผังสนามแข่ง 10 คูณ 10 เมตร" desc="แท่น Takeoff อยู่กลางสนาม แท่นทิ้งสัมภาระ 4 แท่นอยู่ที่มุม ลูกโป่ง 12 ลูกอยู่บนเสา 4 กลุ่มกลางขอบ">
      <rect x={px(-5)} y={py(5)} width={500} height={500} rx={6} fill={C.paper2} stroke={C.ink} strokeWidth={2.5} />
      <rect x={px(-0.75)} y={py(0.75)} width={75} height={75} fill="color-mix(in oklab, var(--brand-blue) 22%, var(--surface))" stroke={C.blue} strokeWidth={3} />
      <T x={cx} y={cy + 6} size={14}>Takeoff</T>
      {plats.map(([x, y]) => (
        <circle key={`${x}${y}`} cx={px(x)} cy={py(y)} r={25} fill={C.paper} stroke={C.blue} strokeWidth={3} />
      ))}
      {balloon(0, 2.5, 'x')}{balloon(0, -2.5, 'x')}{balloon(-2.5, 0, 'y')}{balloon(2.5, 0, 'y')}
      <Arrow d={`M${px(-5)} 560 H${px(5)}`} tone="soft" w={2.5} />
      <Arrow d={`M${px(5)} 560 H${px(-5)}`} tone="soft" w={2.5} />
      <T x={cx} y={556} size={15} c={C.soft}>10 ม.</T>
      <T x={cx} y={14} size={14} c={C.soft} weight={500}>เหนือ (โดรนหันหน้าทางนี้ = fw)</T>
      <T x={cx} y={582} size={14} c={C.soft} weight={500}>ใต้ · ผู้แข่งขัน</T>
      <g>
        <Box x={545} y={60} w={200} h={290} tone="paper" />
        <rect x={560} y={82} width={26} height={26} fill="color-mix(in oklab, var(--brand-blue) 22%, var(--surface))" stroke={C.blue} strokeWidth={3} />
        <T x={598} y={102} anchor="start" size={15}>Takeoff 1.5 ม.</T>
        <circle cx={573} cy={142} r={13} fill={C.paper} stroke={C.blue} strokeWidth={3} />
        <T x={598} y={148} anchor="start" size={15}>แท่น Ø1 ม. ×4</T>
        <circle cx={573} cy={186} r={7} fill={C.red} />
        <T x={598} y={192} anchor="start" size={15}>ลูกโป่ง 12 ลูก</T>
        <T x={560} y={238} anchor="start" size={15} c={C.soft} weight={500}>แท่นที่มุม: ±2.5 ม.</T>
        <T x={560} y={266} anchor="start" size={15} c={C.soft} weight={500}>เสาลูกโป่ง: ห่าง 0.6 ม.</T>
        <T x={560} y={294} anchor="start" size={15} c={C.soft} weight={500}>เป้ายิง: ที่ตำแหน่ง</T>
        <T x={560} y={322} anchor="start" size={15} c={C.soft} weight={500}>เดียวกับแท่นมุม</T>
      </g>
    </Svg>
  );
}

/** เส้นทางตัว T ด้านบนของ mission-t · 1 ม. = 80 หน่วย · (0,0) = (380,340) */
export function CompTPath() {
  const X = (m: number) => 380 + m * 80;
  const Y = (m: number) => 340 - m * 80;
  return (
    <Svg w={760} h={430} title="เส้นทางบินรูปตัว T" desc="ขึ้นจากแท่นกลาง เดินหน้า 250 ไปซ้าย 250 ปล่อย ไปขวา 500 ปล่อย กลับซ้าย 250 ถอย 250 ลงจอด">
      <path d={`M${X(-3.4)} ${Y(0)} H${X(3.4)}`} stroke={C.line} strokeWidth={2} strokeDasharray="3 8" />
      <rect x={X(-0.75)} y={Y(0.75)} width={120} height={120} fill="color-mix(in oklab, var(--brand-blue) 18%, var(--surface))" stroke={C.blue} strokeWidth={3} />
      {[-2.5, 2.5].map((x) => (
        <circle key={x} cx={X(x)} cy={Y(2.5)} r={40} fill={C.paper} stroke={C.blue} strokeWidth={3} />
      ))}
      <T x={X(-2.5)} y={Y(2.5) + 6} size={14}>แท่นซ้าย</T>
      <T x={X(2.5)} y={Y(2.5) + 6} size={14}>แท่นขวา</T>
      <T x={X(0)} y={Y(0) + 6} size={14}>Takeoff</T>
      <Arrow d={`M${X(0)} ${Y(0.8)} V${Y(2.45)}`} tone="blue" w={5} />
      <T x={X(0) + 14} y={Y(1.6)} anchor="start" size={15} c={C.blue}>1 fw(250)</T>
      <Arrow d={`M${X(0) - 6} ${Y(2.6)} H${X(-2.0)}`} tone="blue" w={5} />
      <T x={X(-1.0)} y={Y(2.6) - 18} size={15} c={C.blue}>2 ml(250)</T>
      <Arrow d={`M${X(-2.0)} ${Y(2.9)} H${X(2.0)}`} tone="red" w={5} />
      <T x={X(0)} y={Y(3.15) - 4} size={15} c={C.red}>3 mr(500) · ข้ามไปแท่นขวา</T>
      <T x={X(-2.5)} y={Y(2.5) - 52} size={14} c={C.soft} weight={500}>poshold · drop</T>
      <T x={X(2.5)} y={Y(2.5) - 52} size={14} c={C.soft} weight={500}>poshold · drop</T>
      <path d={`M${X(2.0)} ${Y(2.3)} H${X(0.1)}`} stroke={C.ink} strokeWidth={4} markerEnd="url(#ah-ink)" />
      <T x={X(1.1)} y={Y(2.3) + 22} size={15}>4 ml(250)</T>
      <path d={`M${X(0.4)} ${Y(2.2)} V${Y(0.8)}`} stroke={C.ink} strokeWidth={4} markerEnd="url(#ah-ink)" />
      <T x={X(0.4) + 12} y={Y(1.2)} anchor="start" size={15}>5 bw(250)</T>
      <T x={380} y={414} size={14} c={C.soft} weight={500}>ระยะเป็นซม. ตามโปรแกรม mission-t ใน src/flight/programs.ts</T>
    </Svg>
  );
}

/** งบเวลา 150 วินาที เทียบเวลาที่ตัวจำลองประเมินให้ 3 โปรแกรมตัวอย่าง */
export function CompBudget() {
  const x0 = 200, w = 500, total = 150;
  const bar = (y: number, name: string, sec: number, tone: 'blue' | 'red' | 'ink') => (
    <g>
      <T x={20} y={y + 24} anchor="start" size={16}>{name}</T>
      <rect x={x0} y={y} width={(sec / total) * w} height={36} rx={8} fill={C[tone]} opacity={0.85} />
      <T x={x0 + (sec / total) * w + 10} y={y + 25} anchor="start" size={16}>{sec.toFixed(1)} วิ</T>
    </g>
  );
  return (
    <Svg w={760} h={300} title="เวลาที่โปรแกรมตัวอย่างใช้เทียบกับงบ 150 วินาที" desc="mission-t 83.5 วินาที aviation-all 89.8 วินาที innovation-four 59.1 วินาที">
      {bar(60, 'mission-t', 83.5, 'blue')}
      {bar(120, 'aviation-all', 89.8, 'red')}
      {bar(180, 'innovation-four', 59.1, 'ink')}
      <path d={`M${x0 + w} 44 V232`} stroke={C.red} strokeWidth={3} strokeDasharray="6 6" />
      <T x={x0 + w} y={34} size={16} c={C.red}>หมดเวลา 150 วินาที</T>
      <path d={`M${x0} 232 H${x0 + w}`} stroke={C.line} strokeWidth={2} />
      <T x={x0} y={256} size={14} c={C.soft} weight={500}>0</T>
      <T x={x0 + w / 2} y={256} size={14} c={C.soft} weight={500}>75</T>
      <T x={380} y={286} size={14} c={C.soft} weight={500}>เวลาจากตัวจำลองของเว็บนี้ ไม่ใช่เวลาที่จับจากโดรนจริง</T>
    </Svg>
  );
}

/** ลำดับเตรียมตัวก่อนลงสนาม */
export function CompPrepFlow() {
  const steps = ['ชั่งน้ำหนัก\nและเช็กแบต', 'calibration\nบนพื้นเรียบ', 'ทดสอบกลไก\nบนโต๊ะ', 'รันในตัวจำลอง\nก่อนบินจริง', 'ซ้อมสนามจริง\nจับเวลา'];
  return (
    <Svg w={760} h={250} title="ลำดับเตรียมตัวก่อนลงแข่ง" desc="ห้าขั้น ตั้งแต่ชั่งน้ำหนักจนซ้อมสนามจริง">
      {steps.map((s, i) => {
        const x = 20 + i * 146;
        const [a, b] = s.split('\n');
        return (
          <g key={s}>
            <Box x={x} y={70} w={126} h={104} tone={i === 4 ? 'blue' : 'paper2'} />
            <T x={x + 63} y={50} size={16} c={C.blue}>{i + 1}</T>
            <T x={x + 63} y={114} size={15}>{a}</T>
            <T x={x + 63} y={142} size={15}>{b}</T>
            {i < 4 && <Arrow d={`M${x + 128} 122 H${x + 144}`} tone="ink" w={3} />}
          </g>
        );
      })}
      <T x={380} y={218} size={15} c={C.soft} weight={500}>ย้อนกลับขั้นก่อนหน้าเสมอเมื่อเจอปัญหา อย่าแก้ที่สนาม</T>
    </Svg>
  );
}

export const competeFigures: Record<string, ComponentType<Record<string, unknown>>> = {
  CompField, CompTPath, CompBudget, CompPrepFlow,
};
