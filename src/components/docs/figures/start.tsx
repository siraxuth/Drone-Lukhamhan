import type { ComponentType } from 'react';
import { TopQuad } from '../quad';
import { Arrow, Box, C, Svg, T } from '../svg';

/** ระบบทั้งหมด: คอม → Arduino → FC → มอเตอร์ และรีโมท */
export function SystemFlow() {
  return (
    <Svg w={920} h={430} title="เส้นทางของคำสั่งตั้งแต่คอมพิวเตอร์และรีโมทไปถึงมอเตอร์" desc="โค้ดจากคอมพิวเตอร์อัปโหลดลง Arduino บนโดรน Arduino ส่งคำสั่งทาง I2C ให้ Flight Controller ซึ่งสั่งมอเตอร์ รีโมทส่งปุ่มมาทางคลื่น 2.4 GHz">
      <Box x={20} y={30} w={200} h={90} tone="paper2" />
      <T x={120} y={68}>คอมพิวเตอร์</T>
      <T x={120} y={94} size={14} c={C.soft} weight={500}>Arduino IDE เขียนโค้ด</T>
      <Box x={20} y={300} w={200} h={90} tone="paper2" />
      <T x={120} y={338}>รีโมท</T>
      <T x={120} y={364} size={14} c={C.soft} weight={500}>ก้านโยก + ปุ่ม KEY</T>

      <Box x={330} y={30} w={230} h={90} tone="blue" />
      <T x={445} y={66}>Arduino บนโดรน</T>
      <T x={445} y={92} size={14} c={C.soft} weight={500}>เก็บโค้ดภารกิจของเรา</T>
      <Box x={330} y={300} w={230} h={90} tone="red" />
      <T x={445} y={336}>Flight Controller (FC)</T>
      <T x={445} y={362} size={14} c={C.soft} weight={500}>เซ็นเซอร์ + ทรงตัว</T>

      <Box x={690} y={300} w={210} h={90} tone="paper2" />
      <T x={795} y={336}>ESC + มอเตอร์ ×4</T>
      <T x={795} y={362} size={14} c={C.soft} weight={500}>หมุนใบพัด</T>

      <Arrow d="M220 75 H322" tone="ink" />
      <T x={271} y={60} size={14} c={C.soft} weight={500}>USB Type-C</T>
      <Arrow d="M445 125 V292" tone="blue" w={4} />
      <Arrow d="M465 292 V125" tone="red" w={4} />
      <T x={430} y={215} anchor="end" size={14} c={C.blue}>คำสั่ง</T>
      <T x={480} y={215} anchor="start" size={14} c={C.red}>ปุ่มจากรีโมท + ความสูง</T>
      <T x={445} y={248} size={14} c={C.soft} weight={500}>I2C (สาย 2 เส้น)</T>
      <Arrow d="M220 345 H322" tone="ink" />
      <T x={271} y={330} size={14} c={C.soft} weight={500}>คลื่น 2.4 GHz</T>
      <Arrow d="M560 345 H682" tone="ink" w={4} />
    </Svg>
  );
}

/** ชิ้นส่วนหลักของโดรนมองจากด้านบน */
export function DroneAnatomy() {
  return (
    <Svg w={900} h={430} title="ชิ้นส่วนหลักของ RCSA EDU มองจากด้านบน">
      <g transform="translate(450 215) scale(1.25)"><TopQuad labels={false} /></g>
      <Arrow d="M300 60 L360 125" tone="ink" w={2.5} />
      <T x={290} y={46} anchor="end" size={15}>ใบพัด 3 แฉก + ครอบกัน</T>
      <Arrow d="M600 60 L545 125" tone="ink" w={2.5} />
      <T x={610} y={46} anchor="start" size={15}>มอเตอร์ 1404 / 4000 KV</T>
      <Arrow d="M330 345 L420 270" tone="ink" w={2.5} />
      <T x={320} y={372} anchor="end" size={15}>โมดูลควบคุมการบิน (Arduino + FC)</T>
      <Arrow d="M590 345 L480 270" tone="ink" w={2.5} />
      <T x={600} y={372} anchor="start" size={15}>แบตเตอรี่ 3S วางเหนือโมดูล</T>
      <T x={450} y={22} c={C.red} size={14}>▲ หัวโดรน</T>
      <T x={450} y={414} c={C.soft} size={14} weight={500}>ฟ้า = ใบพัดหมุนตามเข็ม · แดง = ทวนเข็ม</T>
    </Svg>
  );
}

/** ไฟสถานะบนตัวโดรน */
export function StatusLights() {
  const rows: Array<[string, string, string, string]> = [
    ['var(--brand-blue)', 'เขียว ติดค้าง', 'ลอยนิ่งปกติ (Hover)', 'g'],
    ['var(--brand-blue)', 'เขียว กะพริบช้า', 'กำลังขึ้นหรือเคลื่อนที่', 'g'],
    ['var(--brand-blue)', 'น้ำเงิน ติดค้าง', 'กำลัง Calibrate ไจโร อย่าขยับ', 'b'],
    ['var(--brand-blue)', 'น้ำเงิน กะพริบ', 'โหมดถ่ายภาพ (1 ครั้ง) / วิดีโอ (ช้า)', 'b'],
    ['var(--brand-red)', 'แดง ติดค้าง', 'ระบบขัดข้อง', 'r'],
    ['var(--brand-red)', 'แดง กะพริบเร็ว', 'แบตต่ำ กำลังลงจอดเอง', 'r'],
    ['var(--brand-red)', 'แดง กะพริบช้า', 'ไม่เชื่อมต่อรีโมท', 'r'],
    ['#d4a017', 'เหลือง ติดค้าง', 'เซ็นเซอร์ผิดปกติ (calibrate ไม่ผ่าน)', 'y'],
  ];
  const col = (k: string) => (k === 'g' ? '#22a35a' : k === 'b' ? '#2f7de1' : k === 'r' ? '#e0334f' : '#d4a017');
  return (
    <Svg w={880} h={440} title="ความหมายของไฟสถานะบนโดรน">
      {rows.map((r, i) => (
        <g key={i} transform={`translate(0 ${i * 52 + 10})`}>
          <Box x={20} y={0} w={840} h={42} tone="paper2" />
          <circle cx={52} cy={21} r={11} fill={col(r[3])} />
          <T x={80} y={27} anchor="start" size={16}>{r[1]}</T>
          <T x={330} y={27} anchor="start" size={16} c={C.soft} weight={500}>{r[2]}</T>
        </g>
      ))}
    </Svg>
  );
}

/** ก้านโยกของรีโมท Mode 1 และ Mode 2 */
export function RemoteSticks() {
  const stick = (cx: number, up: string, side: string) => (
    <g transform={`translate(${cx} 150)`}>
      <circle r={70} fill={C.paper2} stroke={C.line} strokeWidth={2} />
      <circle r={20} fill={C.ink} />
      <Arrow d="M0 -28 V-62" tone="blue" w={3} />
      <Arrow d="M0 28 V62" tone="blue" w={3} />
      <Arrow d="M-28 0 H-62" tone="red" w={3} />
      <Arrow d="M28 0 H62" tone="red" w={3} />
      <T x={0} y={-84} size={15} c={C.blue}>{up}</T>
      <T x={0} y={104} size={15} c={C.red}>{side}</T>
    </g>
  );
  return (
    <Svg w={900} h={420} title="หน้าที่ของก้านโยกซ้ายและขวาใน Mode 1 และ Mode 2">
      <T x={225} y={26} size={18}>Mode 1 (คันเร่งซ้าย) — ค่าเริ่มต้น</T>
      {stick(120, 'ขึ้น–ลง (Throttle)', '◀ ▶ หมุนหัว (Yaw)')}
      {stick(330, 'หน้า–หลัง (Pitch)', '◀ ▶ สไลด์ (Roll)')}
      <T x={675} y={26} size={18}>Mode 2 (คันเร่งขวา)</T>
      {stick(570, 'หน้า–หลัง (Pitch)', '◀ ▶ หมุนหัว (Yaw)')}
      {stick(780, 'ขึ้น–ลง (Throttle)', '◀ ▶ สไลด์ (Roll)')}
      <T x={450} y={388} size={14} c={C.soft} weight={500}>ก้านซ้ายอยู่ด้านซ้ายของแต่ละคู่ · ก้านขวาอยู่ด้านขวา</T>
    </Svg>
  );
}

export const startFigures: Record<string, ComponentType<Record<string, unknown>>> = { SystemFlow, DroneAnatomy, StatusLights, RemoteSticks };
