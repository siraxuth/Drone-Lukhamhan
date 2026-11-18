import { BARE_OK, convertStyle, DRONE_NAMES, FULL_NAMES, PARDUINO_NAMES, type Style } from './style';
/** รายการคำสั่งของตัวจำลอง: ใช้ทำ suggestion, ไฮไลต์สี และตารางคำสั่ง (ชื่อให้ตรงกับ switch ใน engine.ts) */
export type Cmd = {
  name: string;
  /** ข้อความที่แทรกเมื่อเลือก ส่วน [[ ]] = ช่วงที่เลือกค้างไว้ให้พิมพ์ทับ */
  insert: string;
  sig: string;
  desc: string;
  group: 'เริ่มและจบการบิน' | 'เคลื่อนที่' | 'ภารกิจ';
  /** ปุ่มแทรกเร็วใต้ตัวแก้โค้ด */
  quick?: boolean;
};

export const COMMANDS: Cmd[] = [
  { name: 'calibration', insert: 'calibration();', sig: 'calibration()', desc: 'ส่งคำสั่งตั้งศูนย์ไจโรบนพื้น (ไม่รอให้เสร็จ) ต้องตามด้วย delay(3000) ก่อน takeOff()', group: 'เริ่มและจบการบิน', quick: true },
  { name: 'delay', insert: 'delay([[3000]]);', sig: 'delay(มิลลิวินาที)', desc: 'รอตามเวลา (เหมือน settle) ใช้รอหลัง calibration / takeOff อย่างน้อย 3000', group: 'เริ่มและจบการบิน', quick: true },
  { name: 'takeOff', insert: 'takeOff();', sig: 'takeOff()', desc: 'สตาร์ทมอเตอร์ ใบพัดไต่รอบตลอดช่วง delay แล้วยกตัวเมื่อจบ delay ต้องรออย่างน้อย 3000 ms ไม่งั้นบินไม่ขึ้น', group: 'เริ่มและจบการบิน', quick: true },
  { name: 'autoLand', insert: 'autoLand();', sig: 'autoLand()', desc: 'ลงจอด ถ้าลงบนแท่นฐานจะหยุดเวลา', group: 'เริ่มและจบการบิน', quick: true },
  { name: 'sh', insert: 'sh([[100]]);', sig: 'sh(ซม.)', desc: 'ตั้งความสูงกึ่งกลางโดรนจากพื้นสนาม (แท่นสูง 20 ซม.)', group: 'เคลื่อนที่', quick: true },
  { name: 'fw', insert: 'fw([[100]]);', sig: 'fw(ซม.)', desc: 'ไปข้างหน้า แล้วเบรกนิ่ง', group: 'เคลื่อนที่', quick: true },
  { name: 'bw', insert: 'bw([[100]]);', sig: 'bw(ซม.)', desc: 'ถอยหลัง', group: 'เคลื่อนที่', quick: true },
  { name: 'ml', insert: 'ml([[100]]);', sig: 'ml(ซม.)', desc: 'เลื่อนซ้าย (หัวโดรนยังหันทางเดิม)', group: 'เคลื่อนที่', quick: true },
  { name: 'mr', insert: 'mr([[100]]);', sig: 'mr(ซม.)', desc: 'เลื่อนขวา (หัวโดรนยังหันทางเดิม)', group: 'เคลื่อนที่', quick: true },
  { name: 'fwt', insert: 'fwt([[1500]]);', sig: 'fwt(มิลลิวินาที)', desc: 'ไปข้างหน้าตามเวลา (ms) ด้วยความเร็วเท่า fw แล้วเบรกนิ่ง ยาวขึ้น = ไกลขึ้น', group: 'เคลื่อนที่' },
  { name: 'bwt', insert: 'bwt([[1500]]);', sig: 'bwt(มิลลิวินาที)', desc: 'ถอยหลังตามเวลา (ms)', group: 'เคลื่อนที่' },
  { name: 'mlt', insert: 'mlt([[1500]]);', sig: 'mlt(มิลลิวินาที)', desc: 'เลื่อนซ้ายตามเวลา (ms)', group: 'เคลื่อนที่' },
  { name: 'mrt', insert: 'mrt([[1500]]);', sig: 'mrt(มิลลิวินาที)', desc: 'เลื่อนขวาตามเวลา (ms)', group: 'เคลื่อนที่' },
  { name: 'yaw', insert: 'yaw([[90]]);', sig: 'yaw(องศา)', desc: 'หมุนหัวโดรนขวา ค่าติดลบ = หมุนซ้าย', group: 'เคลื่อนที่', quick: true },
  { name: 'poshold', insert: 'poshold();', sig: 'poshold()', desc: 'หยุดนิ่ง ล็อกตำแหน่ง ~1.2 วินาที ใช้ก่อนปล่อยบอลหรือยิง', group: 'เคลื่อนที่', quick: true },
  { name: 'settle', insert: 'settle([[500]]);', sig: 'settle(มิลลิวินาที)', desc: 'หยุดรอ (เหมือน delay(ms) ใน Arduino)', group: 'เคลื่อนที่' },
  { name: 'turnByHand', insert: 'turnByHand([[180]]);', sig: 'turnByHand(องศา)', desc: 'คนแข่งหมุนตัวโดรนด้วยมือตอนจอดบนแท่น', group: 'ภารกิจ' },
  { name: 'drop', insert: 'drop();', sig: 'drop()', desc: 'ปล่อยช่องคู่ซ้าย–ขวารอบถัดไปพร้อมกัน (1+4 แล้ว 3+6)', group: 'ภารกิจ' },
  { name: 'drop_l', insert: 'drop_l();', sig: 'drop_l(ช่อง?)', desc: 'ปล่อยช่องถัดไปฝั่งซ้าย หรือระบุช่อง 1 หรือ 3', group: 'ภารกิจ' },
  { name: 'drop_r', insert: 'drop_r();', sig: 'drop_r(ช่อง?)', desc: 'ปล่อยช่องถัดไปฝั่งขวา หรือระบุช่อง 4 หรือ 6', group: 'ภารกิจ' },
  { name: 'drop_pair', insert: 'drop_pair([[1]]);', sig: 'drop_pair(รอบ)', desc: 'รอบ 1 เปิดช่อง 1+4 · รอบ 2 เปิดช่อง 3+6', group: 'ภารกิจ' },
  { name: 'drop_all', insert: 'drop_all();', sig: 'drop_all()', desc: 'ปล่อยบอลที่เหลือจากทุกช่องพร้อมกัน', group: 'ภารกิจ' },
  { name: 'servo_config', insert: 'servo_config([[1]], 0, 110);', sig: 'servo_config(ช่อง, มุมปิด, มุมเปิด)', desc: 'กำหนดจุดปิดและเปิดของช่องหนึ่ง', group: 'ภารกิจ' },
  { name: 'servo_write', insert: 'servo_write([[1]], 110);', sig: 'servo_write(ช่อง, องศา)', desc: 'ปรับมุมแผ่นปิดช่องใน Simulator', group: 'ภารกิจ' },
  { name: 'servo_write_pair', insert: 'servo_write_pair([[1]], 110, 4, 110);', sig: 'servo_write_pair(ช่อง A, มุม A, ช่อง B, มุม B)', desc: 'ขยับเซอร์โวสองช่องพร้อมกัน', group: 'ภารกิจ' },
  { name: 'servo_pulse', insert: 'servo_pulse([[1]], 1750);', sig: 'servo_pulse(ช่อง, µs, ต่ำสุด?, สูงสุด?)', desc: 'แปลงพัลส์จำลองเป็นมุม ปรับช่วง 0–180° ได้', group: 'ภารกิจ' },
  { name: 'servo_rate', insert: 'servo_rate([[80]]);', sig: 'servo_rate(ms ต่อลูก)', desc: 'กำหนดเวลาที่บอลใช้ไหลผ่านช่องหนึ่งช่อง', group: 'ภารกิจ' },
  { name: 'flight_config', insert: 'flight_config([[1.0]], 1.0, 1200);', sig: 'flight_config(ตัวคูณระยะ, ตัวคูณความสูง, ms)', desc: 'ปรับการเคลื่อนที่และเวลา poshold สำหรับเที่ยวบินจำลอง', group: 'เคลื่อนที่' },
  { name: 'pop', insert: 'pop();', sig: 'pop()', desc: 'แตะลูกโป่งด้วยเข็มที่หัวโดรน (บินผ่านลูกโป่งก็แตกเอง)', group: 'ภารกิจ' },
  { name: 'shoot', insert: 'shoot();', sig: 'shoot()', desc: 'ยิงลูกดอกไปข้างหน้า (ต้องห่างเป้า ≥ 100 ซม.)', group: 'ภารกิจ' },
  { name: 'shoot_b', insert: 'shoot_b();', sig: 'shoot_b()', desc: 'ยิงลูกดอกไปด้านหลัง', group: 'ภารกิจ' },
];

/** ชื่อแบบไม่สนตัวพิมพ์ใหญ่เล็กและขีดล่าง (เหมือน engine) */
export const canon = (n: string) => n.toLowerCase().replace(/_/g, '');

/** ชื่อที่รู้จักทุกรูปแบบ ใช้ขีดเส้นแดงใต้ชื่อที่พิมพ์ผิด */
export const KNOWN = new Set([
  ...COMMANDS.map((c) => canon(c.name)),
  ...DRONE_NAMES, ...PARDUINO_NAMES, ...FULL_NAMES, ...BARE_OK, 'servo_degree_to_pulse', 'servo_degree_to_pulse_custom',
  'calibrateandelay', 'calibrateanddelay', 'calibrate', 'setheight', 'turn', 'wait', 'fwt', 'bwt', 'mlt', 'mrt', 'delay', 'hold', 'rotatebyhand', 'handturn', 'needle', 'shot_b', 'shootb', 'shoots1', 'shoots2',
  'open_pair_ch1_ch4', 'open_pair_ch2_ch3', 'open_all_ball_gate',
  ...Array.from({ length: 11 }, (_, i) => `onKey${i + 1}`),
  'for', 'if', 'while', 'switch', 'return', 'setup', 'loop', 'begin', 'beginDefault', 'poll', 'print', 'println', 'pinMode', 'digitalWrite', 'keyDo', 'main',
].map(canon));

/** ชื่อคำสั่งกับพารามิเตอร์ที่แสดง (ส่วนวงเล็บ) ของแต่ละคำสั่งในโหมดที่เลือก */
const SIG_ARGS: Record<string, Partial<Record<Style, string>>> = {
  yaw: { full: '(ทิศ, องศา)', parduino: '(ทิศ, องศา)', drone: '(ทิศ, องศา)' },
};

/**
 * รายการคำสั่งในโหมดที่เลือก (ชื่อ ตัวอย่างที่แทรก และคำอธิบาย) ใช้กับ autocomplete ปุ่มแทรกเร็ว และตารางคำสั่ง
 * โหมด any = ชื่อย่อตามตารางเดิม · โหมดอื่นแปลงชื่อด้วย convertStyle (เช่น sh → set_height)
 */
export function commandsFor(style: Style): Cmd[] {
  if (style === 'any') return COMMANDS;
  const seen = new Set<string>();
  return COMMANDS.map((c) => {
    const insert = convertStyle(c.insert, style);
    const m = /^(?:drone\.|pArduino->)?([A-Za-z_]\w*)/.exec(insert);
    const bare = m?.[1] ?? c.name;
    const prefix = insert.slice(0, insert.indexOf(bare));
    const argsPart = SIG_ARGS[c.name]?.[style] ?? c.sig.slice(c.sig.indexOf('(')) ;
    return { ...c, name: bare, insert, sig: `${prefix}${bare}${argsPart}` };
  }).filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)));
}
