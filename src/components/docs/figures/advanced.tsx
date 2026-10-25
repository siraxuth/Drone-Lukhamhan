import type { ComponentType } from 'react';
import { Arrow, Box, C, Svg, T } from '../svg';

/** สามชั้นของโปรโตคอล: serial รีโมท · I2C บอร์ด Arduino · ฝูงบิน 0xFA */
export function AdvLayers() {
  const row = (y: number, n: string, l1: string, l2: string, r1: string, r2: string, top: string, bottom: string, tone: 'blue' | 'red' | 'paper2') => (
    <g>
      <T x={22} y={y + 58} size={22} c={C.blue}>{n}</T>
      <Box x={50} y={y} w={210} h={100} tone={tone} />
      <T x={155} y={y + 44} size={16}>{l1}</T>
      <T x={155} y={y + 72} size={15} c={C.soft} weight={500}>{l2}</T>
      <Box x={500} y={y} w={210} h={100} tone={tone} />
      <T x={605} y={y + 44} size={16}>{r1}</T>
      <T x={605} y={y + 72} size={15} c={C.soft} weight={500}>{r2}</T>
      <Arrow d={`M264 ${y + 36} H496`} tone="blue" w={3.5} />
      <Arrow d={`M496 ${y + 70} H264`} tone="red" w={3.5} />
      <T x={380} y={y + 28} size={15} mono>{top}</T>
      <T x={380} y={y + 94} size={15} mono>{bottom}</T>
    </g>
  );
  return (
    <Svg w={760} h={400} title="โปรโตคอลสามชั้นของโดรน RCSA" desc="ชั้นแรก serial ระหว่างคอมพิวเตอร์กับรีโมท ชั้นสอง I2C ระหว่าง Arduino กับ Flight Controller ชั้นสาม เฟรมฝูงบินขึ้นต้นด้วย 0xFA">
      {row(16, '1', 'คอมพิวเตอร์', 'แอป RCSA', 'รีโมท', 'USB serial', 'AB CD LEN …', 'DC BA LEN …', 'paper2')}
      {row(144, '2', 'บอร์ด Arduino', 'ที่อยู่ I2C 0x33', 'Flight Controller', 'ที่อยู่ I2C 0x34', '6 ไบต์ [n, F_*, …]', '8 ไบต์ (ความสูง …)', 'blue')}
      {row(272, '3', 'สถานีฝูงบิน', 'TCP / UDP', 'โดรนหลายลำ', 'สูงสุด 20 ลำ', '0xFA … CRC lo hi', 'telemetry 0xFA …', 'paper2')}
    </Svg>
  );
}

/** บัส I2C ฝั่งบอร์ด Arduino ตาม protocol.cpp */
export function AdvI2cBus() {
  return (
    <Svg w={760} h={380} title="การคุยกันของ Arduino กับ Flight Controller ผ่าน I2C" desc="Arduino เก็บคำสั่ง 6 ไบต์ไว้ให้ถูกอ่าน รับปุ่มจากรีโมท และอ่าน 8 ไบต์จาก Flight Controller ที่ 0x34">
      <Box x={285} y={120} w={190} h={130} tone="blue" />
      <T x={380} y={168} size={18}>Arduino</T>
      <T x={380} y={198} size={15} c={C.soft} weight={500}>Wire.begin(0x33)</T>
      <T x={380} y={226} size={15} c={C.soft} weight={500}>m_i2cData[6]</T>
      <Box x={540} y={30} w={190} h={72} tone="paper2" />
      <T x={635} y={74} size={16}>อุปกรณ์ที่อ่านคำสั่ง</T>
      <Box x={30} y={30} w={190} h={72} tone="paper2" />
      <T x={125} y={74} size={16}>ปุ่มจากรีโมท</T>
      <Box x={540} y={268} w={190} h={72} tone="red" />
      <T x={635} y={312} size={16}>FC · 0x34</T>
      <Arrow d="M540 90 L440 124" tone="blue" w={3.5} />
      <T x={548} y={136} anchor="start" size={15} c={C.blue}>onRequest: ส่ง 6 ไบต์</T>
      <Arrow d="M220 76 L290 124" tone="ink" w={3.5} />
      <T x={20} y={146} anchor="start" size={15}>onReceive: เก็บไบต์สุดท้าย</T>
      <T x={20} y={170} anchor="start" size={15}>เป็น m_remoteKey</T>
      <Arrow d="M540 304 L440 246" tone="red" w={3.5} />
      <T x={290} y={290} size={15} c={C.red}>requestFrom(0x34, 8)</T>
      <T x={290} y={316} size={15} c={C.soft} weight={500}>ไบต์ 0–1 = ความสูง (ซม.)</T>
      <T x={380} y={364} size={14} c={C.soft} weight={500}>ที่มา: Wire และ iicRecv() ใน protocol.cpp</T>
    </Svg>
  );
}

/** เฟรมฝูงบิน: 0xFA + data + CRC16 (lo, hi) */
export function AdvFormationFrame() {
  const cell = (x: number, w: number, label: string, sub: string, tone: 'blue' | 'red' | 'paper2') => (
    <g>
      <Box x={x} y={100} w={w} h={80} tone={tone} />
      <T x={x + w / 2} y={148} size={18} mono>{label}</T>
      <T x={x + w / 2} y={214} size={15} c={C.soft} weight={500}>{sub}</T>
    </g>
  );
  return (
    <Svg w={760} h={330} title="เฟรมของโหมดฝูงบิน" desc="เริ่มด้วยไบต์ 0xFA ตามด้วยข้อมูล และจบด้วย CRC-16 สองไบต์ ต่ำก่อนสูง">
      {cell(40, 100, '0xFA', 'หัวเฟรม', 'blue')}
      {cell(150, 330, 'data[ … ]', 'ID คำสั่ง + พารามิเตอร์', 'paper2')}
      {cell(490, 100, 'CRC lo', 'ไบต์ต่ำ', 'red')}
      {cell(600, 100, 'CRC hi', 'ไบต์สูง', 'red')}
      <path d="M150 84 H590" stroke={C.ink} strokeWidth={2.5} markerStart="url(#ah-ink)" markerEnd="url(#ah-ink)" />
      <T x={370} y={70} size={15}>CRC-16 คำนวณจากส่วนนี้ (ตามบันทึกโปรโตคอล)</T>
      <T x={380} y={282} size={16}>ตัวอย่างรหัสคำสั่งฝูง: takeOff = 0x01 · autoLand = 0x02 · moveXY = 0x03</T>
      <T x={380} y={312} size={14} c={C.soft} weight={500}>จาก RCSA_PROTOCOL_FULL_NOTES.md ส่วน 4–5</T>
    </Svg>
  );
}

/** ชั้นของไลบรารีที่เราเขียนเอง */
export function AdvLibLayers() {
  const layers: [string, string, 'blue' | 'paper2' | 'red'][] = [
    ['ภารกิจ (.ino)', 'drone.fw(250); drone.autoLand();', 'blue'],
    ['wrapper ของเรา', 'DroneEasy: fw → move_forward_cm + settle(400)', 'paper2'],
    ['คลาส Arduino', 'set_direction(1, 2); delay(…); poshold(2);', 'paper2'],
    ['แพ็กเก็ต', 'm_i2cData[0]++; m_i2cData[1] = F_DIRECTION; …', 'paper2'],
    ['สาย I2C', 'Flight Controller มาอ่าน 6 ไบต์', 'red'],
  ];
  return (
    <Svg w={760} h={420} title="ชั้นของไลบรารีที่ต่อยอดจาก DroneEasy" desc="ภารกิจเรียก wrapper wrapper เรียกคลาส Arduino คลาสเขียนแพ็กเก็ต แล้ว Flight Controller มาอ่านผ่าน I2C">
      {layers.map(([a, b, tone], i) => {
        const y = 20 + i * 76;
        return (
          <g key={a}>
            <Box x={40} y={y} w={680} h={60} tone={tone} />
            <T x={60} y={y + 36} anchor="start" size={16}>{a}</T>
            <T x={720 - 20} y={y + 36} anchor="end" size={15} mono weight={500}>{b}</T>
            {i < layers.length - 1 && <Arrow d={`M380 ${y + 60} V${y + 76}`} tone="ink" w={3} />}
          </g>
        );
      })}
    </Svg>
  );
}

/** เครื่องสถานะภารกิจแบบไม่ใช้ delay */
export function AdvStateMachine() {
  const st = (x: number, y: number, name: string, sub: string, tone: 'blue' | 'paper2' | 'red') => (
    <g>
      <Box x={x} y={y} w={150} h={80} tone={tone} />
      <T x={x + 75} y={y + 36} size={16} mono>{name}</T>
      <T x={x + 75} y={y + 62} size={14} c={C.soft} weight={500}>{sub}</T>
    </g>
  );
  return (
    <Svg w={760} h={380} title="ลำดับสถานะของภารกิจ" desc="จากรอ ไปขึ้นบิน เดินหน้า ปล่อย แล้วลงจอด แต่ละสถานะออกเมื่อครบเวลาที่จดด้วย millis">
      {st(30, 40, 'IDLE', 'รอกดปุ่ม', 'paper2')}
      {st(305, 40, 'TAKEOFF', 'รอ 3000 ms', 'blue')}
      {st(580, 40, 'FORWARD', 'รอตามระยะ', 'blue')}
      {st(580, 240, 'DROP', 'เปิด→ปิด', 'blue')}
      {st(305, 240, 'LAND', 'autoLand', 'red')}
      {st(30, 240, 'DONE', 'กลับ IDLE', 'paper2')}
      <Arrow d="M180 80 H300" tone="ink" w={3.5} />
      <Arrow d="M455 80 H575" tone="ink" w={3.5} />
      <Arrow d="M655 120 V235" tone="ink" w={3.5} />
      <Arrow d="M575 280 H460" tone="ink" w={3.5} />
      <Arrow d="M300 280 H185" tone="ink" w={3.5} />
      <Arrow d="M105 235 V125" tone="soft" w={3} />
      <T x={380} y={340} size={16}>แต่ละรอบของ loop() เช็กแค่ "ถึงเวลาเปลี่ยนสถานะหรือยัง" แล้วออกทันที</T>
    </Svg>
  );
}

export const advancedFigures: Record<string, ComponentType<Record<string, unknown>>> = {
  AdvLayers, AdvI2cBus, AdvFormationFrame, AdvLibLayers, AdvStateMachine,
};
