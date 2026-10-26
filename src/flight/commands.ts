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
  { name: 'yaw', insert: 'yaw([[90]]);', sig: 'yaw(องศา)', desc: 'หมุนหัวโดรนขวา ค่าติดลบ = หมุนซ้าย', group: 'เคลื่อนที่' },
  { name: 'poshold', insert: 'poshold();', sig: 'poshold()', desc: 'หยุดนิ่ง ล็อกตำแหน่ง ~1.2 วินาที ใช้ก่อนปล่อยบอลหรือยิง', group: 'เคลื่อนที่', quick: true },
  { name: 'settle', insert: 'settle([[500]]);', sig: 'settle(มิลลิวินาที)', desc: 'หยุดรอ (เหมือน delay(ms) ใน Arduino)', group: 'เคลื่อนที่' },
  { name: 'reload', insert: 'reload();', sig: 'reload()', desc: 'คนแข่งใส่บอลชุดซ้าย 20 + ชุดขวา 20 ลูก (ตอนจอดบนแท่นเท่านั้น)', group: 'ภารกิจ' },
  { name: 'turnByHand', insert: 'turnByHand([[180]]);', sig: 'turnByHand(องศา)', desc: 'คนแข่งหมุนตัวโดรนด้วยมือตอนจอดบนแท่น', group: 'ภารกิจ' },
  { name: 'drop', insert: 'drop();', sig: 'drop()', desc: 'ปล่อยบอลชุดถัดไป 20 ลูก (ชุดซ้ายก่อน แล้วชุดขวา)', group: 'ภารกิจ' },
  { name: 'pop', insert: 'pop();', sig: 'pop()', desc: 'แตะลูกโป่งด้วยเข็มที่หัวโดรน (บินผ่านลูกโป่งก็แตกเอง)', group: 'ภารกิจ' },
  { name: 'shoot', insert: 'shoot();', sig: 'shoot()', desc: 'ยิงลูกดอกไปข้างหน้า (ต้องห่างเป้า ≥ 100 ซม.)', group: 'ภารกิจ' },
  { name: 'shot_b', insert: 'shot_b();', sig: 'shot_b()', desc: 'ยิงลูกดอกไปด้านหลัง', group: 'ภารกิจ' },
];

/** ชื่อแบบไม่สนตัวพิมพ์ใหญ่เล็กและขีดล่าง (เหมือน engine) */
export const canon = (n: string) => n.toLowerCase().replace(/_/g, '');

/** ชื่อที่รู้จักทุกรูปแบบ ใช้ขีดเส้นแดงใต้ชื่อที่พิมพ์ผิด */
export const KNOWN = new Set([
  ...COMMANDS.map((c) => canon(c.name)),
  ...DRONE_NAMES, ...PARDUINO_NAMES, ...FULL_NAMES, ...BARE_OK,
  'calibrateandelay', 'calibrateanddelay', 'calibrate', 'setheight', 'turn', 'wait', 'delay', 'hold', 'load', 'rotatebyhand', 'handturn', 'needle', 'shootb', 'shoots1', 'shoots2',
  'open_pair_ch1_ch4', 'open_pair_ch2_ch3', 'open_all_ball_gate',
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
