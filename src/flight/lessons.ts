import { parse } from './engine';
import { canon } from './commands';

/** บทสอนเขียนโค้ดครั้งแรกในตัวจำลอง: ทำทีละขั้น ทำถูกแล้วค่อยกดถัดไป */
export type Lesson = {
  title: string;
  /** อธิบายก่อนลงมือ (ย่อหน้าละรายการ) */
  body: string[];
  /** สิ่งที่ให้ทำ (ไม่มี = อ่านอย่างเดียว) */
  task?: string;
  /** บรรทัดที่ปุ่ม "ใส่ให้" จะเติมลงในโค้ด */
  snippet?: string;
  /** เงื่อนไขผ่านขั้น */
  check?: (ctx: { code: string; ran: boolean }) => boolean;
  /** บอกใบ้เมื่อยังไม่ผ่าน */
  hint?: string;
};

/** โครงตั้งต้นของบทสอน: เหมือนสเก็ตช์ Arduino จริง */
export const LESSON_BASE = `void setup() {
  // พิมพ์คำสั่งที่นี่ ทีละบรรทัด
}
`;

const names = (code: string) => parse(code).calls.map((c) => canon(c.name));
const has = (code: string, ...n: string[]) => { const list = names(code); return n.every((x) => list.includes(canon(x))); };
/** ลำดับคำสั่งต้องเรียงตามที่ให้ */
const inOrder = (code: string, ...n: string[]) => {
  const list = names(code); let from = 0;
  for (const x of n) { const i = list.indexOf(canon(x), from); if (i < 0) return false; from = i + 1; }
  return true;
};
/** ผลรวมเวลา delay/settle/wait ที่ต่อท้ายคำสั่งแรกชื่อนี้ทันที (ก่อนคำสั่งอื่นจะมา) */
const waitAfter = (code: string, name: string) => {
  const calls = parse(code).calls; const i = calls.findIndex((c) => canon(c.name) === canon(name));
  if (i < 0) return 0;
  let sum = 0;
  for (let k = i + 1; k < calls.length && ['delay', 'settle', 'wait'].includes(canon(calls[k].name)); k++) sum += calls[k].args[0] ?? 0;
  return sum;
};
const noErr = (code: string) => parse(code).errors.length === 0;

export const LESSONS: Lesson[] = [
  {
    title: 'โค้ดคืออะไร',
    body: [
      'โค้ดคือ “รายการคำสั่ง” ที่เราเขียนให้โดรนทำตามทีละบรรทัด เหมือนเขียนสูตรอาหาร: ขั้นที่ 1 ทำก่อน แล้วค่อยขั้นที่ 2',
      'ตัวจำลองนี้อ่านโค้ดจากบนลงล่าง แล้วให้โดรนในสนามขวามือบินตาม ไม่ต้องมีโดรนจริง พังก็ไม่เป็นไร',
      'ในช่องโค้ดตอนนี้มีโครงสเก็ตช์ Arduino อยู่แล้ว (void setup() { ... }) คำสั่งของเราจะเขียนไว้ระหว่างปีกกา { }',
    ],
  },
  {
    title: 'คำสั่งแรก: calibration + delay',
    body: [
      'คำสั่งหนึ่งบรรทัดมี 3 ส่วน: ชื่อคำสั่ง + วงเล็บ ( ) + เครื่องหมาย ; ท้ายบรรทัดเสมอ',
      '`calibration();` สั่งให้โดรนตั้งศูนย์ไจโรขณะวางนิ่งบนพื้น แต่ตัวคำสั่ง “แค่ส่งสัญญาณไป” ไม่ได้รอให้เสร็จ โปรแกรมจึงวิ่งไปบรรทัดต่อไปทันที',
      'ไจโรใช้เวลาตั้งศูนย์ราว 3 วินาที เราต้องสั่งรอเองด้วย `delay(3000);` (หน่วยเป็นมิลลิวินาที 3000 = 3 วินาที) ถ้ารอน้อยกว่านี้ แล้วสั่งขึ้นบิน โดรนจะบินไม่ขึ้น',
    ],
    task: 'พิมพ์ calibration(); แล้วบรรทัดถัดไป delay(3000); (หรือกด “ใส่ให้”)',
    snippet: 'calibration();\n  delay(3000);',
    check: ({ code }) => has(code, 'calibration') && waitAfter(code, 'calibration') >= 3000 && noErr(code),
    hint: 'ต้องมี delay(3000); ต่อท้าย calibration(); เลย และมี ; ท้ายทุกบรรทัด',
  },
  {
    title: 'ขึ้นบิน: takeOff + delay',
    body: [
      'โค้ดทำงานเรียงจากบนลงล่าง จึงต้อง calibration และรอครบก่อน แล้วค่อย takeOff',
      '`takeOff();` สตาร์ทมอเตอร์ ใบพัดจะหมุนไต่จากช้าไปเร็วตลอดเวลาที่เรา delay อยู่ แล้วโดรนยกตัวตอนจบ delay ถ้า `delay(3000)` ก็ยกตัวที่วินาทีที่ 3 ถ้า `delay(4000)` ก็ยกตัวที่วินาทีที่ 4',
      'ใส่น้อยกว่า 3000 ใบพัดจะยังไม่เร็วพอ โดรนบินไม่ขึ้น ตัวจำลองจะแจ้งว่าพังที่บรรทัดไหน',
    ],
    task: 'เพิ่ม takeOff(); และ delay(3000); ต่อจากบรรทัด delay เดิม',
    snippet: 'takeOff();\n  delay(3000);',
    check: ({ code }) => inOrder(code, 'calibration', 'takeOff') && waitAfter(code, 'takeOff') >= 3000 && noErr(code),
    hint: 'takeOff(); ต้องอยู่ใต้ calibration และมี delay(3000); ต่อท้าย',
  },
  {
    title: 'ตั้งความสูง: sh',
    body: [
      '`sh(100);` ตั้งความสูงของโดรนจากพื้น หน่วยเป็น เซนติเมตร (sh = set height) ตัวเลขในวงเล็บคือ “ค่า” ที่เราส่งให้คำสั่ง',
      'ลองคิดภาพ: 100 ซม. = 1 เมตร ประมาณระดับเอวผู้ใหญ่',
    ],
    task: 'เพิ่ม sh(100); ใต้ takeOff();',
    snippet: 'sh(100);',
    check: ({ code }) => inOrder(code, 'takeOff', 'sh') && noErr(code),
    hint: 'พิมพ์ sh(100); ใต้ takeOff(); เปลี่ยนตัวเลขเป็นความสูงอื่นก็ได้',
  },
  {
    title: 'เดินหน้า: fw',
    body: [
      '`fw(100);` บินไปข้างหน้า 100 ซม. แล้วเบรกนิ่ง (fw = forward) ส่วนคำสั่งทิศอื่น: `bw` ถอยหลัง · `ml` เลื่อนซ้าย · `mr` เลื่อนขวา',
      'หน้าของโดรนคือทิศที่หัวโดรนหันอยู่ ถ้าหมุนหัวโดรนแล้ว คำว่า “ข้างหน้า” ก็เปลี่ยนไปด้วย',
    ],
    task: 'เพิ่ม fw(100); ต่อจาก sh(100);',
    snippet: 'fw(100);',
    check: ({ code }) => inOrder(code, 'sh', 'fw') && noErr(code),
  },
  {
    title: 'หมุนหัวโดรน: yaw',
    body: [
      '`yaw(90);` หมุนหัวโดรนไปทางขวา 90 องศา ใส่ค่าติดลบ `yaw(-90);` คือหมุนซ้าย',
      'หมุนเสร็จแล้วสั่ง fw ต่อ โดรนจะบินไปทางที่หัวหันอยู่ใหม่',
    ],
    task: 'เพิ่ม yaw(90); แล้วตามด้วย fw(100); อีกบรรทัด',
    snippet: 'yaw(90);\n  fw(100);',
    check: ({ code }) => inOrder(code, 'fw', 'yaw', 'fw') && noErr(code),
    hint: 'ลำดับต้องเป็น fw → yaw → fw',
  },
  {
    title: 'ลงจอด: autoLand',
    body: [
      '`autoLand();` ให้โดรนลงจอดเอง ทุกโปรแกรมต้องจบด้วยคำสั่งนี้ ไม่งั้นโดรนค้างอยู่กลางอากาศ',
      'ในการแข่งจริง ต้องลงบนแท่น Takeoff ถึงจะหยุดเวลา',
    ],
    task: 'เพิ่ม autoLand(); เป็นบรรทัดสุดท้าย',
    snippet: 'autoLand();',
    check: ({ code }) => inOrder(code, 'yaw', 'autoLand') && noErr(code),
  },
  {
    title: 'กดเล่นดูผล',
    body: [
      'ตอนนี้โค้ดครบ: ตั้งศูนย์ (รอ 3 วินาที) → ขึ้น (รอ 3 วินาที ใบพัดไต่รอบแล้วยกตัว) → ตั้งสูง → เดินหน้า → หมุน → เดินหน้า → ลงจอด',
      'กดปุ่ม “เริ่มจำลองการบิน” ที่สนามด้านขวา แล้วดูโดรนบินตามโค้ด ฟังเสียงและดูใบพัดค่อยๆ เร่งรอบระหว่างรอ ถ้าโดรนชนหรือตก ใต้สนามจะบอกว่าตกเพราะบรรทัดไหน (ลองลดเลข delay หลัง takeOff ให้น้อยกว่า 3000 แล้วกดเล่นอีกรอบ จะเห็นว่าบินไม่ขึ้น)',
    ],
    task: 'กด “เริ่มจำลองการบิน” ให้โดรนบินจนจบ',
    check: ({ ran }) => ran,
    hint: 'ปุ่มอยู่กลางสนามด้านขวา (บนมือถืออยู่ด้านบน)',
  },
  {
    title: 'เขียนแบบโค้ดจริง: pArduino',
    body: [
      'โค้ดจริงของชมรมมี 2 สไตล์ที่ทำงานเหมือนกัน: แบบสั้น `drone.fw(100);` และแบบเต็ม `pArduino->move_forward_cm(100);`',
      'ตัวจำลองอ่านได้ทั้งสองแบบ ตารางเทียบชื่อดูได้ที่ปุ่ม “คำสั่ง” ด้านบน ลองเปลี่ยนบรรทัด fw(100); บรรทัดแรกให้เป็นแบบเต็ม',
    ],
    task: 'เปลี่ยน fw(100); เป็น pArduino->move_forward_cm(100); อย่างน้อยหนึ่งบรรทัด',
    snippet: 'pArduino->move_forward_cm(100);',
    check: ({ code }) => /pArduino\s*->\s*move_forward_cm\s*\(/.test(code) && noErr(code),
    hint: 'พิมพ์ pArduino-> แล้วตามด้วย move_forward_cm(100); (ลูกศรคือ ขีดกลาง + เครื่องหมายมากกว่า)',
  },
  {
    title: 'ตั้งชื่อให้ตัวเลข',
    body: [
      'ตัวเลขที่ใช้ซ้ำควรตั้งชื่อไว้ บรรทัดบนสุด เช่น `int DIST = 100;` แล้วใช้ `fw(DIST);` ถ้าอยากเปลี่ยนระยะ แก้ที่เดียวจบ',
      'โค้ดชมรมใช้วิธีนี้ทั้งหมด เช่น ค่าปรับภารกิจที่หัวไฟล์ Drone_Mission.ino',
    ],
    task: 'เพิ่ม int DIST = 100; ไว้บนสุดของไฟล์ แล้วเปลี่ยน fw(100); บรรทัดใดบรรทัดหนึ่งเป็น fw(DIST);',
    check: ({ code }) => /^\s*int\s+DIST\s*=\s*\d+\s*;/m.test(code) && /fw\s*\(\s*DIST\s*\)/.test(code) && noErr(code),
    hint: 'บรรทัด int DIST = 100; ต้องอยู่นอกปีกกา เหนือ void setup()',
  },
  {
    title: 'เสร็จแล้ว ไปลองโจทย์จริง',
    body: [
      'คุณเขียนโค้ดสั่งโดรนเป็นแล้ว: ลำดับคำสั่ง · ค่าในวงเล็บ · ทิศทาง · สองสไตล์ · ตั้งชื่อตัวเลข',
      'ต่อไปเลือกโจทย์ที่ปุ่มด้านบน มีตั้งแต่ด่านเล็กบนกริดจนถึงภารกิจแข่งจริง เปิดบทสอนนี้ซ้ำได้ทุกเมื่อที่ปุ่ม “บทสอน”',
    ],
  },
];

/** เติมบรรทัดใหม่ก่อนปีกกาปิดตัวสุดท้าย (ถ้าไม่มีปีกกา เติมท้ายไฟล์) */
export function appendLine(code: string, snippet: string): string {
  const i = code.lastIndexOf('}');
  if (i < 0) return `${code.replace(/\s*$/, '')}\n${snippet}\n`;
  const before = code.slice(0, i).replace(/[ \t]*$/, '');
  return `${before}${before.endsWith('\n') ? '' : '\n'}  ${snippet}\n${code.slice(i)}`;
}
