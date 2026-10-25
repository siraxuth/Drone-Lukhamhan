import type { ComponentType } from 'react';
import { Arrow, Box, C, Svg, T } from '../svg';

/** พัลส์ 1 เฟรม 20 ms: เทียบ 1000 µs กับ 2550 µs (ค่าจาก Servo.ino) */
export function MechPulseFrame() {
  const x0 = 70, w = 620; // 20 ms = 620 หน่วย → 1 ms = 31
  const us = (v: number) => (v / 20000) * w;
  const row = (y: number, pulse: number, label: string, tone: string) => (
    <g>
      <path d={`M${x0} ${y + 40} H${x0} V${y} H${x0 + us(pulse)} V${y + 40} H${x0 + w}`} stroke={tone} strokeWidth={4} />
      <T x={x0 + us(pulse) + 12} y={y + 18} anchor="start" c={tone}>{label}</T>
    </g>
  );
  return (
    <Svg w={760} h={330} title="เฟรมสัญญาณเซอร์โว 20 มิลลิวินาที" desc="พัลส์สูง 1000 ไมโครวินาทีกับ 2550 ไมโครวินาที ในเฟรมยาว 20 มิลลิวินาที">
      <T x={380} y={34} size={18}>1 เฟรม = 20,000 µs (ทำซ้ำต่อเนื่อง 1.5 วินาที)</T>
      {row(70, 1000, 'HIGH 1000 µs', C.blue)}
      {row(150, 2550, 'HIGH 2550 µs', C.red)}
      <path d={`M${x0} 230 H${x0 + w}`} stroke={C.line} strokeWidth={2} />
      <path d={`M${x0} 222 V238 M${x0 + w} 222 V238`} stroke={C.soft} strokeWidth={2} />
      <T x={x0} y={262} anchor="start" size={15} c={C.soft}>เริ่มเฟรม</T>
      <T x={x0 + w} y={262} anchor="end" size={15} c={C.soft}>เริ่มเฟรมถัดไป</T>
      <T x={380} y={304} size={15} c={C.soft} weight={500}>ส่วนที่เหลือของเฟรมเป็น LOW: delayMicroseconds(20000 − pulse)</T>
    </Svg>
  );
}

/** แผนผังช่องปล่อยบอล: PORT3 → ช่อง 1,2 · PORT6 → ช่อง 3,4 (ค่าจาก Drone_Mission.ino) */
export function MechGateMap() {
  const col = (x: number, port: string, a: string, au: string, b: string, bu: string) => (
    <g>
      <Box x={x} y={40} w={250} h={64} tone="blue" />
      <T x={x + 125} y={80} size={20}>{port}</T>
      <Arrow d={`M${x + 60} 104 V150`} tone="ink" w={3} />
      <Arrow d={`M${x + 190} 104 V150`} tone="ink" w={3} />
      <Box x={x} y={156} w={115} h={110} tone="paper2" />
      <T x={x + 58} y={190} size={16}>{a}</T>
      <T x={x + 58} y={222} size={15} c={C.blue}>เปิด {au}</T>
      <T x={x + 58} y={250} size={14} c={C.soft} weight={500}>µs</T>
      <Box x={x + 135} y={156} w={115} h={110} tone="paper2" />
      <T x={x + 193} y={190} size={16}>{b}</T>
      <T x={x + 193} y={222} size={15} c={C.blue}>เปิด {bu}</T>
      <T x={x + 193} y={250} size={14} c={C.soft} weight={500}>µs</T>
    </g>
  );
  return (
    <Svg w={760} h={360} title="เซอร์โว 2 ตัวคุมประตูบอล 4 ช่อง" desc="PORT3 คุมช่อง 1 และ 2 PORT6 คุมช่อง 3 และ 4 พร้อมค่าพัลส์เปิดของแต่ละช่อง">
      {col(60, 'เซอร์โว PORT3', 'ช่อง 1', '450', 'ช่อง 2', '2000')}
      {col(450, 'เซอร์โว PORT6', 'ช่อง 3', '1900', 'ช่อง 4', '500')}
      <T x={380} y={304} size={16}>ปิดทั้งสองตัว: 1200 µs · เปิดทั้งหมด: 2550 (PORT3) และ 2600 (PORT6)</T>
      <T x={380} y={336} size={15} c={C.soft} weight={500}>ตัวเลขทั้งหมดอ่านจาก Drone_Mission.ino (BALL_*_US)</T>
    </Svg>
  );
}

/** เจาะลูกโป่ง 3 ช่วง มองด้านข้าง: PRE_STOP 20 → เร็ว 14 → ช้า 6 → ถอย 14 */
export function MechPokeProfile() {
  const s = 14; // 1 ซม. = 14 หน่วย
  const p0 = 60, p1 = p0 + 20 * s, p2 = p1 + 14 * s, p3 = p2 + 6 * s;
  return (
    <Svg w={760} h={400} title="เจาะลูกโป่ง 3 ช่วง" desc="เดินหน้าเร็ว 14 เซนติเมตร เดินหน้าช้า 6 เซนติเมตร แล้วถอยหลัง 14 เซนติเมตร">
      <path d={`M${p0} 250 H${p3 + 20}`} stroke={C.line} strokeWidth={2} strokeDasharray="3 8" />
      <circle cx={p3 + 36} cy={250} r={34} fill="color-mix(in oklab, var(--brand-red) 18%, var(--surface))" stroke={C.red} strokeWidth={3} />
      <T x={p3 + 36} y={256} size={15} c={C.red}>ลูกโป่ง</T>
      <Box x={p0 - 40} y={228} w={70} h={44} tone="paper" r={10} stroke={C.ink} sw={2.5} />
      <T x={p0 - 5} y={256} size={15}>โดรน</T>
      <Arrow d={`M${p0 + 40} 205 H${p1}`} tone="soft" w={3} />
      <T x={(p0 + p1) / 2 + 20} y={190} size={15} c={C.soft}>เดินต่อ (ส่วนเกิน PRE_STOP 20)</T>
      <Arrow d={`M${p1} 160 H${p2}`} tone="blue" w={5} />
      <T x={(p1 + p2) / 2} y={140} size={16} c={C.blue}>1 เร็ว · 14 ซม.</T>
      <T x={(p1 + p2) / 2} y={118} size={14} c={C.soft} weight={500}>speed 2</T>
      <Arrow d={`M${p2} 160 H${p3}`} tone="red" w={5} />
      <T x={(p2 + p3) / 2 + 24} y={140} size={16} c={C.red}>2 ช้า · 6 ซม.</T>
      <T x={(p2 + p3) / 2 + 24} y={118} size={14} c={C.soft} weight={500}>speed 1</T>
      <Arrow d={`M${p3} 320 H${p1 + 30}`} tone="ink" w={4} />
      <T x={(p1 + p3) / 2 + 20} y={352} size={16}>3 ถอย · 14 ซม. (speed 2)</T>
      <path d={`M${p1} 240 V262 M${p2} 240 V262 M${p3} 240 V262`} stroke={C.soft} strokeWidth={2} />
      <T x={380} y={34} size={16}>ค่า POKE_FAST_CM · POKE_SLOW_CM · POKE_RETREAT_CM จาก config.hpp</T>
    </Svg>
  );
}

/** กวาดเซอร์โวยิง: S_LEFT 1200 / S_CLOSE 1500 / S_RIGHT 2000 + เวลาถือค่า */
export function MechSwipeTimeline() {
  const lane = (y: number, label: string, v: number, name: string, tone: string) => (
    <g>
      <T x={30} y={y + 6} anchor="start" size={16}>{label}</T>
      <Box x={170} y={y - 20} w={180} h={44} tone="blue" />
      <T x={260} y={y + 8} size={16} c={tone}>{name} {v} µs</T>
      <Arrow d={`M350 ${y + 2} H400`} tone="ink" w={3} />
      <Box x={400} y={y - 20} w={150} h={44} tone="paper2" />
      <T x={475} y={y + 8} size={16}>S_CLOSE 1500</T>
    </g>
  );
  return (
    <Svg w={760} h={330} title="กวาดซ้ายและกวาดขวาของเซอร์โวยิง" desc="ค้างที่ตำแหน่งยิง 220 มิลลิวินาที แล้วกลับ S_CLOSE 150 มิลลิวินาที พักอีก 60 มิลลิวินาที">
      <T x={380} y={34} size={18}>swipe = ค้างตำแหน่งยิง แล้วกลับตำแหน่งปิด</T>
      {lane(100, 'swipe_left', 1200, 'S_LEFT', C.blue)}
      {lane(170, 'swipe_right', 2000, 'S_RIGHT', C.red)}
      <T x={260} y={222} size={15} c={C.soft} weight={500}>ค้าง FIRE_HOLD_MS = 220 ms</T>
      <T x={475} y={222} size={15} c={C.soft} weight={500}>ค้าง RESET_HOLD_MS = 150 ms</T>
      <T x={380} y={270} size={16}>แล้ว delay(POST_DELAY_MS) = 60 ms ก่อนทำอย่างอื่น</T>
      <T x={380} y={302} size={15} c={C.soft} weight={500}>ค่าทั้งหมดจาก config.hpp · ฟังก์ชันอยู่ใน shooting.ino</T>
    </Svg>
  );
}

/** เส้นแปลงองศา → pulse (490–2550) พร้อมจุดที่ชมรมใช้ */
export function MechAngleMap() {
  const x0 = 90, x1 = 690;
  const px = (deg: number) => x0 + (deg / 180) * (x1 - x0);
  const pts: [number, string, string][] = [
    [0, '0°', '490'],
    [62, 'S_LEFT_ANGLE 62°', '1199'],
    [88, 'S_CLOSE_ANGLE 88°', '1497'],
    [132, 'S_RIGHT_ANGLE 132°', '2000'],
    [180, '180°', '2550'],
  ];
  return (
    <Svg w={760} h={380} title="องศาแปลงเป็นความกว้างพัลส์" desc="0 องศาได้ 490 ไมโครวินาที 180 องศาได้ 2550 ไมโครวินาที ค่า 62 88 132 ตรงกับ 1200 1500 2000">
      <path d={`M${x0} 200 H${x1}`} stroke={C.ink} strokeWidth={4} />
      {pts.map(([d, name, us], i) => (
        <g key={d}>
          <circle cx={px(d)} cy={200} r={8} fill={C.blue} />
          <path d={`M${px(d)} 200 V${i % 2 ? 150 : 250}`} stroke={C.line} strokeWidth={2} />
          <T x={px(d)} y={i % 2 ? 128 : 276} size={15}>{name}</T>
          <T x={px(d)} y={i % 2 ? 106 : 300} size={16} c={C.blue}>{us} µs</T>
        </g>
      ))}
      <T x={380} y={40} size={18}>pulse = 490 + องศา × (2550 − 490) / 180</T>
      <T x={380} y={352} size={15} c={C.soft} weight={500}>map() ใน Servo_Degree.ino ใช้จำนวนเต็ม ผลจึงตัดเศษ (62° ได้ 1199 ไม่ใช่ 1200)</T>
    </Svg>
  );
}

export const mechanismsFigures: Record<string, ComponentType<Record<string, unknown>>> = {
  MechPulseFrame, MechGateMap, MechPokeProfile, MechSwipeTimeline, MechAngleMap,
};
