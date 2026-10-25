import type { ComponentType } from 'react';
import { Arrow, Box, C, Svg, T } from '../svg';

/** ใครคุยกับใคร: รีโมท → FC ⇄ Nano → เซอร์โว */
export function SystemBlocks() {
  return (
    <Svg w={760} h={340} title="ระบบบนโดรน: รีโมท, Flight Controller, Arduino Nano และเซอร์โว" desc="รีโมทส่งปุ่มไปที่ FC, FC กับ Nano คุยกันผ่าน I2C, Nano ส่งสัญญาณ PWM ไปเซอร์โว">
      <Box x={20} y={40} w={170} h={90} tone="paper2" />
      <T x={105} y={80}>รีโมท</T>
      <T x={105} y={106} size={14} c={C.soft} weight={500}>ปุ่ม KEY1–KEY14</T>
      <Arrow d="M190 85 H300" tone="soft" />
      <T x={245} y={68} size={14} c={C.soft} weight={500}>ไร้สาย</T>

      <Box x={300} y={40} w={200} h={90} tone="paper2" />
      <T x={400} y={80}>Flight Controller</T>
      <T x={400} y={106} size={14} c={C.soft} weight={500}>คุมมอเตอร์ ทรงตัว</T>

      <Arrow d="M370 130 V205" tone="blue" />
      <Arrow d="M430 205 V130" tone="red" />
      <T x={348} y={172} size={14} c={C.blue} anchor="end">คำสั่ง</T>
      <T x={452} y={172} size={14} c={C.red} anchor="start">ปุ่ม + ความสูง</T>

      <Box x={300} y={205} w={200} h={90} tone="blue" />
      <T x={400} y={245}>Arduino Nano</T>
      <T x={400} y={271} size={14} c={C.soft} weight={500}>โค้ดของเราอยู่ที่นี่</T>

      <Arrow d="M500 250 H580" tone="blue" />
      <T x={540} y={232} size={14} c={C.blue} weight={500}>PWM</T>
      <Box x={580} y={205} w={160} h={90} tone="paper2" />
      <T x={660} y={245}>เซอร์โว</T>
      <T x={660} y={271} size={14} c={C.soft} weight={500}>ปล่อยบอล ยิงดอก</T>
      <T x={150} y={250} size={14} c={C.soft} weight={500}>I2C 2 เส้น (SDA, SCL)</T>
      <Arrow d="M258 244 H292" tone="soft" w={2} />
    </Svg>
  );
}

const PORT_ROWS = [
  { port: 'PORT1', name: 'PB2', pin: 'D10', use: 'drop_payload() ใน Servo.ino' },
  { port: 'PORT2', name: 'PB1', pin: 'D9', use: 'ไม่มีโค้ดไหนเรียกใช้' },
  { port: 'PORT3', name: 'PB3', pin: 'D11', use: 'เซอร์โวปล่อยบอล ช่อง 1, 2' },
  { port: 'PORT4', name: 'PD3', pin: 'D3', use: 'เซอร์โวยิง S1 (SHOOT1_PIN)' },
  { port: 'PORT5', name: 'PC1', pin: 'A1', use: 'เซอร์โวยิง S2 (SHOOT2_PIN)' },
  { port: 'PORT6', name: 'PC0', pin: 'A0', use: 'เซอร์โวปล่อยบอล ช่อง 3, 4' },
];

/** ตาราง PORT1–6 ของโดรน → ชื่อขาชิป → เลขขา Arduino → งานที่ใช้ */
export function NanoPorts() {
  const y0 = 56, rh = 52;
  return (
    <Svg w={760} h={y0 + rh * 6 + 20} title="PORT1 ถึง PORT6 ของโดรนเทียบกับขาของ Arduino Nano" desc="แต่ละช่อง PORT ต่อกับขาชิปและเลขขาที่ใช้ในโค้ด">
      <T x={70} y={34} size={15} c={C.soft} weight={700}>ช่องบนโดรน</T>
      <T x={200} y={34} size={15} c={C.soft} weight={700}>ขาชิป</T>
      <T x={300} y={34} size={15} c={C.soft} weight={700}>ขาในโค้ด</T>
      <T x={410} y={34} size={15} c={C.soft} weight={700} anchor="start">ใช้ทำอะไรในโค้ดชมรม</T>
      {PORT_ROWS.map((r, i) => {
        const y = y0 + i * rh;
        const used = !r.use.startsWith('ไม่มี');
        return (
          <g key={r.port}>
            <Box x={14} y={y} w={112} h={40} tone={used ? 'blue' : 'paper2'} r={10} />
            <T x={70} y={y + 26}>{r.port}</T>
            <Arrow d={`M128 ${y + 20} H160`} tone="soft" w={2} />
            <T x={200} y={y + 26} mono>{r.name}</T>
            <Arrow d={`M236 ${y + 20} H262`} tone="soft" w={2} />
            <Box x={266} y={y} w={68} h={40} tone="paper" r={10} />
            <T x={300} y={y + 26} mono c={C.blue}>{r.pin}</T>
            <Arrow d={`M338 ${y + 20} H394`} tone="soft" w={2} />
            <T x={410} y={y + 26} anchor="start" size={15} weight={used ? 600 : 500} c={used ? C.ink : C.soft}>{r.use}</T>
          </g>
        );
      })}
    </Svg>
  );
}

/** สาย I2C: ตัวคุม 2 ตัวบนสาย SDA/SCL เดียวกัน แยกกันด้วยแอดเดรส */
export function NanoFcBus() {
  return (
    <Svg w={760} h={330} title="บัส I2C ระหว่าง Arduino Nano กับ Flight Controller" desc="สองเส้น SDA และ SCL ต่อร่วมกัน Nano มีแอดเดรส 0x33 และ FC มีแอดเดรส 0x34">
      <Box x={40} y={50} w={220} h={110} tone="blue" />
      <T x={150} y={92}>Arduino Nano</T>
      <T x={150} y={120} mono c={C.blue}>0x33</T>
      <T x={150} y={146} size={14} c={C.soft} weight={500}>Wire.begin(0x33)</T>

      <Box x={500} y={50} w={220} h={110} tone="paper2" />
      <T x={610} y={92}>Flight Controller</T>
      <T x={610} y={120} mono c={C.red}>0x34</T>
      <T x={610} y={146} size={14} c={C.soft} weight={500}>requestFrom(0x34, 8)</T>

      <path d="M150 160 V222 H610 V160" stroke={C.blue} strokeWidth={4} />
      <path d="M190 160 V268 H570 V160" stroke={C.red} strokeWidth={4} />
      <T x={380} y={214} c={C.blue}>SDA (ข้อมูล)</T>
      <T x={380} y={260} c={C.red}>SCL (จังหวะนาฬิกา)</T>
      <T x={380} y={306} size={14} c={C.soft} weight={500}>บนบอร์ด Nano ขา SDA = A4, SCL = A5</T>
    </Svg>
  );
}

const BYTE_LABELS = [
  { t: '[0]', n: 'ตัวนับ', tone: 'paper2' as const },
  { t: '[1]', n: 'รหัสคำสั่ง', tone: 'blue' as const },
  { t: '[2]', n: 'ข้อมูล 1', tone: 'paper' as const },
  { t: '[3]', n: 'ข้อมูล 2', tone: 'paper' as const },
  { t: '[4]', n: 'ข้อมูล 3', tone: 'paper' as const },
  { t: '[5]', n: 'ข้อมูล 4', tone: 'paper' as const },
];

/** บัฟเฟอร์ m_i2cData 6 ไบต์ พร้อมตัวอย่าง take_off() และ set_pos(300, -50) */
export function I2cBuffer() {
  const x0 = 20, cw = 118, gap = 6;
  const row = (y: number, vals: string[], title: string, hot: number[]) => (
    <g>
      <T x={x0} y={y - 14} anchor="start" size={15} c={C.soft}>{title}</T>
      {vals.map((v, i) => (
        <g key={i}>
          <Box x={x0 + i * (cw + gap)} y={y} w={cw} h={46} tone={hot.includes(i) ? 'blue' : 'paper'} r={8} />
          <T x={x0 + i * (cw + gap) + cw / 2} y={y + 30} mono size={16}>{v}</T>
        </g>
      ))}
    </g>
  );
  return (
    <Svg w={760} h={400} title="บัฟเฟอร์ 6 ไบต์ที่ Nano ส่งให้ Flight Controller" desc="ไบต์แรกเป็นตัวนับ ไบต์ที่สองเป็นรหัสคำสั่ง ที่เหลือเป็นข้อมูล">
      {BYTE_LABELS.map((b, i) => (
        <g key={b.t}>
          <T x={x0 + i * (cw + gap) + cw / 2} y={26} mono size={15} c={C.soft}>{b.t}</T>
          <T x={x0 + i * (cw + gap) + cw / 2} y={48} size={14} weight={500} c={C.soft}>{b.n}</T>
        </g>
      ))}
      {row(98, ['n+1', '1', '—', '—', '—', '—'], 'take_off()  → F_ARM = 1', [1])}
      {row(188, ['n+1', '14', '0x2C', '0x01', '0xCE', '0xFF'], 'set_pos(300, -50)  → F_POS = 14', [1])}
      <T x={x0} y={272} anchor="start" size={14} c={C.soft} weight={500}>x = 300 = 0x012C  → ไบต์ต่ำ 0x2C มาก่อน ไบต์สูง 0x01 ตามหลัง</T>
      <T x={x0} y={298} anchor="start" size={14} c={C.soft} weight={500}>y = −50 = 0xFFCE  → ไบต์ต่ำ 0xCE มาก่อน ไบต์สูง 0xFF ตามหลัง</T>
      <Box x={20} y={324} w={720} h={52} tone="red" />
      <T x={380} y={356} size={15}>ตัวนับ [0] เพิ่มทีละ 1 ทุกคำสั่ง FC จึงรู้ว่าเป็นคำสั่งใหม่ ไม่ใช่ค่าเก่า</T>
    </Svg>
  );
}

/** แปลงองศาเป็นความกว้างพัลส์ ตามตำราและตามโค้ดชมรม */
export function ServoAngleMap() {
  const x0 = 70, x1 = 690;
  const px = (deg: number) => x0 + (deg / 180) * (x1 - x0);
  const ticks = [0, 45, 90, 135, 180];
  return (
    <Svg w={760} h={330} title="องศาของเซอร์โวเทียบกับความกว้างพัลส์" desc="ตำราใช้ 500 ถึง 2500 ไมโครวินาที โค้ดชมรมใน Servo_Degree.ino ใช้ 490 ถึง 2550">
      <path d={`M${x0} 120 H${x1}`} stroke={C.ink} strokeWidth={4} />
      {ticks.map((d) => (
        <g key={d}>
          <path d={`M${px(d)} 108 V132`} stroke={C.ink} strokeWidth={3} />
          <T x={px(d)} y={160} size={15}>{d}°</T>
        </g>
      ))}
      <T x={x0 - 4} y={86} anchor="start" size={15} c={C.blue}>ตำรา: 500 µs</T>
      <T x={px(90)} y={86} size={15} c={C.blue}>1500 µs</T>
      <T x={x1 + 4} y={86} anchor="end" size={15} c={C.blue}>2500 µs</T>
      <path d={`M${x0} 200 H${x1}`} stroke={C.red} strokeWidth={4} />
      <T x={x0 - 4} y={236} anchor="start" size={15} c={C.red}>ชมรม: 490 µs</T>
      <T x={px(90)} y={236} size={15} c={C.red}>1520 µs</T>
      <T x={x1 + 4} y={236} anchor="end" size={15} c={C.red}>2550 µs</T>
      <T x={380} y={290} size={14} c={C.soft} weight={500}>1520 = 490 + 90/180 × (2550 − 490) ตามสูตร map() ใน Servo_Degree.ino</T>
    </Svg>
  );
}

/** ไฟตกตอนมอเตอร์ดึงกระแส จนบอร์ดรีเซ็ต (brown-out) */
export function BrownOut() {
  const W = 760, H = 330;
  const gx = (t: number) => 70 + t * 6.2;
  const gy = (v: number) => 260 - (v - 3) * 52;
  const pts: [number, number][] = [[0, 5], [30, 5], [32, 3.6], [38, 3.4], [44, 3.9], [48, 5], [75, 5], [80, 5]];
  const d = pts.map(([t, v], i) => `${i ? 'L' : 'M'}${gx(t)} ${gy(v)}`).join(' ');
  return (
    <Svg w={W} h={H} title="แรงดันไฟของบอร์ดตกตอนมอเตอร์ดึงกระแส" desc="แรงดัน 5 โวลต์ตกต่ำกว่าเกณฑ์ชั่วขณะ บอร์ดรีเซ็ตแล้วเริ่มโปรแกรมใหม่">
      <path d={`M70 40 V260 H${W - 30}`} stroke={C.soft} strokeWidth={2} />
      <T x={58} y={gy(5) + 5} anchor="end" size={15} c={C.soft}>5 V</T>
      <T x={58} y={gy(4) + 5} anchor="end" size={15} c={C.soft}>4 V</T>
      <T x={58} y={gy(3) + 5} anchor="end" size={15} c={C.soft}>3 V</T>
      <path d={`M70 ${gy(4.3)} H${W - 30}`} stroke={C.red} strokeWidth={2.5} strokeDasharray="6 6" />
      <T x={W - 30} y={gy(4.3) - 10} anchor="end" size={14} c={C.red}>ต่ำกว่าเส้นนี้ ชิปรีเซ็ต</T>
      <path d={d} stroke={C.blue} strokeWidth={4} />
      <Arrow d={`M${gx(36)} 296 V${gy(3.5) + 10}`} tone="red" />
      <T x={gx(36)} y={320} size={14} c={C.red}>มอเตอร์ออกตัว</T>
      <T x={gx(62)} y={gy(5) - 14} size={14} c={C.soft} weight={500}>โปรแกรมเริ่มใหม่จาก setup()</T>
      <T x={W / 2} y={30} size={15} c={C.soft} weight={500}>เวลา →</T>
    </Svg>
  );
}

/** กราวด์ร่วม: ไฟเซอร์โวแยกจาก Nano แต่ GND ต้องต่อถึงกัน */
export function CommonGround() {
  return (
    <Svg w={760} h={360} title="ไฟเลี้ยงเซอร์โวแยก แต่ต้องใช้กราวด์ร่วมกับ Nano" desc="แบตเตอรี่ให้ไฟ 5 ถึง 6 โวลต์แก่เซอร์โว สายสัญญาณจาก Nano ต้องมีกราวด์เส้นเดียวกันเป็นจุดอ้างอิง">
      <Box x={30} y={30} w={190} h={90} tone="paper2" />
      <T x={125} y={70}>Arduino Nano</T>
      <T x={125} y={98} size={14} c={C.soft} weight={500}>ขาสัญญาณ D11</T>
      <Box x={30} y={230} w={190} h={90} tone="paper2" />
      <T x={125} y={270}>ไฟ 5–6 V</T>
      <T x={125} y={298} size={14} c={C.soft} weight={500}>แยกสำหรับเซอร์โว</T>
      <Box x={520} y={130} w={210} h={110} tone="blue" />
      <T x={625} y={175}>เซอร์โว</T>
      <T x={625} y={205} size={14} c={C.soft} weight={500}>สาย 3 เส้น:</T>
      <T x={625} y={226} size={14} c={C.soft} weight={500}>สัญญาณ · + · GND</T>

      <path d="M220 62 H330 V160 H520" stroke={C.blue} strokeWidth={4} />
      <T x={360} y={52} size={14} c={C.blue} anchor="start">สัญญาณ PWM</T>
      <path d="M220 262 H400 V200 H520" stroke={C.red} strokeWidth={4} />
      <T x={410} y={284} size={14} c={C.red} anchor="start">+5–6 V</T>

      <path d="M125 120 V150 M125 230 V150 M125 150 H300 V220 H520" stroke={C.ink} strokeWidth={4} />
      <T x={178} y={142} size={15}>GND ร่วม</T>
      <T x={380} y={344} size={14} c={C.soft} weight={500}>ไม่มีเส้น GND นี้ เซอร์โวไม่รู้ว่า "สูง" ของสัญญาณวัดจากไหน</T>
    </Svg>
  );
}

export const electronicsFigures: Record<string, ComponentType<Record<string, unknown>>> = {
  SystemBlocks, NanoPorts, NanoFcBus, I2cBuffer, ServoAngleMap, BrownOut, CommonGround,
};
