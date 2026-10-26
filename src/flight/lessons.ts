import { parse } from './engine';
import { canon } from './commands';

/** บทสอนเขียนโค้ดครั้งแรกในตัวจำลอง: ทำทีละขั้น ทำถูกแล้วค่อยกดถัดไป (ใช้โหมดชื่อเต็มเสมอ) */
export type Lesson = {
  title: string;
  /** อธิบายก่อนลงมือ (ย่อหน้าละรายการ) · `...` = โค้ดในบรรทัด */
  body: string[];
  /** สิ่งที่ให้ทำ (ไม่มี = อ่านอย่างเดียว) */
  task?: string;
  /** บรรทัดที่ปุ่ม "ใส่ให้" จะเติมลงในโค้ด */
  snippet?: string;
  /** ตำแหน่งที่เติม: ใน setup() (ค่าเริ่มต้น) หรือเหนือ setup() (ค่าคงที่ ฟังก์ชัน) */
  where?: 'setup' | 'top';
  /** เงื่อนไขผ่านขั้น */
  check?: (ctx: { code: string; ran: boolean }) => boolean;
  /** บอกใบ้เมื่อยังไม่ผ่าน */
  hint?: string;
};

/** โครงตั้งต้นของบทสอน: เหมือนสเก็ตช์ Arduino จริง */
export const LESSON_BASE = `void setup() {
  // พิมพ์คำสั่งที่นี่ ทีละบรรทัด
}

void loop() {
  // ว่างไว้ก่อน
}
`;

const P = (code: string) => parse(code, 'full');
const names = (code: string) => P(code).calls.map((c) => canon(c.name));
const has = (code: string, ...n: string[]) => { const list = names(code); return n.every((x) => list.includes(canon(x))); };
/** ลำดับคำสั่งต้องเรียงตามที่ให้ */
const inOrder = (code: string, ...n: string[]) => {
  const list = names(code); let from = 0;
  for (const x of n) { const i = list.indexOf(canon(x), from); if (i < 0) return false; from = i + 1; }
  return true;
};
/** ผลรวมเวลา delay ที่ต่อท้ายคำสั่งแรกชื่อนี้ทันที (ก่อนคำสั่งอื่นจะมา) */
const waitAfter = (code: string, name: string) => {
  const calls = P(code).calls; const i = calls.findIndex((c) => canon(c.name) === canon(name));
  if (i < 0) return 0;
  let sum = 0;
  for (let k = i + 1; k < calls.length && ['delay', 'settle', 'wait'].includes(canon(calls[k].name)); k++) sum += calls[k].args[0] ?? 0;
  return sum;
};
const noErr = (code: string) => P(code).errors.length === 0;
const count = (code: string, name: string) => names(code).filter((x) => x === canon(name)).length;

export const LESSONS: Lesson[] = [
  {
    title: 'โค้ดคืออะไร',
    body: [
      'โค้ดคือ “รายการคำสั่ง” ที่เราเขียนให้โดรนทำตามทีละบรรทัด เหมือนเขียนสูตรอาหาร: ขั้นที่ 1 ทำก่อน แล้วค่อยขั้นที่ 2',
      'ตัวจำลองนี้อ่านโค้ดจากบนลงล่าง แล้วให้โดรนในสนามขวามือบินตาม ไม่ต้องมีโดรนจริง พังก็ไม่เป็นไร',
      'ช่องโค้ดมีโครงเหมือนสเก็ตช์ Arduino จริงอยู่แล้ว: `void setup() { ... }` คือที่ที่โค้ดทำงาน “ครั้งเดียว” ตอนเปิดเครื่อง ส่วน `void loop() { ... }` คือที่ที่ทำงานวนซ้ำไปเรื่อยๆ ภารกิจของเราจะเขียนไว้ใน `setup()` ระหว่างปีกกา { }',
    ],
  },
  {
    title: 'คำสั่งแรก: calibration + delay',
    body: [
      'คำสั่งหนึ่งบรรทัดมี 3 ส่วน: ชื่อคำสั่ง + วงเล็บ ( ) + เครื่องหมาย ; ท้ายบรรทัดเสมอ ชื่อคำสั่งเขียนเป็นคำเต็ม ตัวพิมพ์เล็ก คั่นคำด้วย _',
      '`calibration();` สั่งให้โดรนตั้งศูนย์ไจโรขณะวางนิ่งบนพื้น แต่ตัวคำสั่ง “แค่ส่งสัญญาณไป” ไม่ได้รอให้เสร็จ โปรแกรมจึงวิ่งไปบรรทัดต่อไปทันที',
      'ไจโรใช้เวลาตั้งศูนย์ราว 3 วินาที เราต้องสั่งรอเองด้วย `delay(3000);` (หน่วยเป็นมิลลิวินาที 3000 = 3 วินาที) ถ้ารอน้อยกว่านี้ แล้วสั่งขึ้นบิน โดรนจะบินไม่ขึ้น',
    ],
    task: 'พิมพ์ calibration(); แล้วบรรทัดถัดไป delay(3000); ใน setup() (หรือกด “ใส่ให้”)',
    snippet: 'calibration();\n  delay(3000);',
    check: ({ code }) => has(code, 'calibration') && waitAfter(code, 'calibration') >= 3000 && noErr(code),
    hint: 'ต้องมี delay(3000); ต่อท้าย calibration(); เลย และมี ; ท้ายทุกบรรทัด',
  },
  {
    title: 'ขึ้นบิน: take_off + delay',
    body: [
      'โค้ดทำงานเรียงจากบนลงล่าง จึงต้อง calibration และรอครบก่อน แล้วค่อยขึ้นบิน',
      '`take_off();` (take off = ทะยานขึ้น) สตาร์ทมอเตอร์ ใบพัดจะหมุนไต่จากช้าไปเร็วตลอดเวลาที่เรา delay อยู่ แล้วโดรนยกตัวตอนจบ delay ถ้า `delay(3000)` ก็ยกตัวที่วินาทีที่ 3 ถ้า `delay(4000)` ก็ยกตัวที่วินาทีที่ 4',
      'ใส่น้อยกว่า 3000 ใบพัดจะยังไม่เร็วพอ โดรนบินไม่ขึ้น ตัวจำลองจะแจ้งว่าพังที่บรรทัดไหน',
    ],
    task: 'เพิ่ม take_off(); และ delay(3000); ต่อจากบรรทัด delay เดิม',
    snippet: 'take_off();\n  delay(3000);',
    check: ({ code }) => inOrder(code, 'calibration', 'takeOff') && waitAfter(code, 'takeOff') >= 3000 && noErr(code),
    hint: 'take_off(); ต้องอยู่ใต้ calibration และมี delay(3000); ต่อท้าย',
  },
  {
    title: 'ตั้งความสูง: set_height',
    body: [
      '`set_height(100);` = ตั้ง (set) ความสูง (height) ของโดรนจากพื้น หน่วยเป็น เซนติเมตร ตัวเลขในวงเล็บคือ “ค่า” ที่เราส่งให้คำสั่ง',
      'ลองคิดภาพ: 100 ซม. = 1 เมตร ประมาณระดับเอวผู้ใหญ่',
    ],
    task: 'เพิ่ม set_height(100); ใต้ take_off และ delay',
    snippet: 'set_height(100);',
    check: ({ code }) => inOrder(code, 'takeOff', 'sh') && noErr(code),
    hint: 'พิมพ์ set_height(100); ใต้ take_off(); เปลี่ยนตัวเลขเป็นความสูงอื่นก็ได้',
  },
  {
    title: 'เดินหน้า: move_forward',
    body: [
      '`move_forward(100);` บินไปข้างหน้า (forward) 100 ซม. แล้วเบรกนิ่ง ส่วนคำสั่งทิศอื่น: `move_backward` ถอยหลัง · `move_left` เลื่อนซ้าย · `move_right` เลื่อนขวา',
      'หน้าของโดรนคือทิศที่หัวโดรนหันอยู่ ถ้าหมุนหัวโดรนแล้ว คำว่า “ข้างหน้า” ก็เปลี่ยนไปด้วย',
    ],
    task: 'เพิ่ม move_forward(100); ต่อจาก set_height(100);',
    snippet: 'move_forward(100);',
    check: ({ code }) => inOrder(code, 'sh', 'fw') && noErr(code),
  },
  {
    title: 'หมุนหัวโดรน: set_yaw',
    body: [
      '`set_yaw(1, 90);` หมุนหัวโดรน (yaw) ไปทางขวา 90 องศา ตัวเลขแรกคือทิศ: 1 = ขวา · 2 = ซ้าย ตัวเลขที่สองคือกี่องศา',
      'หมุนเสร็จแล้วสั่ง move_forward ต่อ โดรนจะบินไปทางที่หัวหันอยู่ใหม่',
    ],
    task: 'เพิ่ม set_yaw(1, 90); แล้วตามด้วย move_forward(100); อีกบรรทัด',
    snippet: 'set_yaw(1, 90);\n  move_forward(100);',
    check: ({ code }) => inOrder(code, 'fw', 'yaw', 'fw') && noErr(code),
    hint: 'ลำดับต้องเป็น move_forward → set_yaw → move_forward',
  },
  {
    title: 'ลงจอด: auto_land',
    body: [
      '`auto_land();` ให้โดรนลงจอดเอง (auto = อัตโนมัติ, land = ลงพื้น) ทุกโปรแกรมต้องจบด้วยคำสั่งนี้ ไม่งั้นโดรนค้างอยู่กลางอากาศ',
      'ในการแข่งจริง ต้องลงบนแท่น Takeoff ถึงจะหยุดเวลา',
    ],
    task: 'เพิ่ม auto_land(); เป็นบรรทัดสุดท้ายใน setup()',
    snippet: 'auto_land();',
    check: ({ code }) => inOrder(code, 'yaw', 'autoLand') && noErr(code),
  },
  {
    title: 'กดเล่นดูผล',
    body: [
      'ตอนนี้โค้ดครบ: ตั้งศูนย์ (รอ 3 วินาที) → ขึ้น (รอ 3 วินาที ใบพัดไต่รอบแล้วยกตัว) → ตั้งสูง → เดินหน้า → หมุน → เดินหน้า → ลงจอด',
      'กดปุ่ม “เริ่มจำลองการบิน” ที่สนามด้านขวา แล้วดูโดรนบินตามโค้ด ฟังเสียงและดูใบพัดค่อยๆ เร่งรอบระหว่างรอ ถ้าโดรนชนหรือตก ใต้สนามจะบอกว่าตกเพราะบรรทัดไหน (ลองลดเลข delay หลัง take_off ให้น้อยกว่า 3000 แล้วกดเล่นอีกรอบ จะเห็นว่าบินไม่ขึ้น)',
    ],
    task: 'กด “เริ่มจำลองการบิน” ให้โดรนบินจนจบ',
    check: ({ ran }) => ran,
    hint: 'ปุ่มอยู่กลางสนามด้านขวา (บนมือถืออยู่ด้านบน)',
  },
  {
    title: 'ชื่อเต็มกับโค้ดจริงของชมรม',
    body: [
      'ชื่อที่เราพิมพ์มาตลอดคือชื่อเดียวกับในโค้ดจริงของชมรม (ไฟล์ protocol.hpp) ที่เขียนว่า `pArduino->move_forward_cm(100);` คำว่า `pArduino->` คือการเรียกคำสั่งของคลาส Arduino ส่วน `_cm` บอกว่าหน่วยเป็นเซนติเมตร',
      'ตัวจำลองรับทั้งสองแบบ: `move_forward(100);` และ `pArduino->move_forward_cm(100);` ลองเปลี่ยนบรรทัด move_forward บรรทัดแรกให้เป็นแบบเต็มแบบนี้ (ปุ่มโหมด “pArduino->” ด้านบนจะบังคับเขียนแบบนี้ทุกบรรทัด)',
    ],
    task: 'เปลี่ยน move_forward(100); เป็น pArduino->move_forward_cm(100); อย่างน้อยหนึ่งบรรทัด',
    snippet: 'pArduino->move_forward_cm(100);',
    check: ({ code }) => /pArduino\s*->\s*move_forward_cm\s*\(/.test(code) && noErr(code),
    hint: 'พิมพ์ pArduino-> แล้วตามด้วย move_forward_cm(100); (ลูกศรคือ ขีดกลาง + เครื่องหมายมากกว่า)',
  },
  {
    title: 'ตั้งชื่อให้ตัวเลข',
    body: [
      'ตัวเลขที่ใช้ซ้ำควรตั้งชื่อไว้ บรรทัดบนสุด เช่น `int DIST = 100;` แล้วใช้ `move_forward(DIST);` ถ้าอยากเปลี่ยนระยะ แก้ที่เดียวจบ',
      'โค้ดชมรมใช้วิธีนี้ทั้งหมด เช่น ค่าปรับภารกิจที่หัวไฟล์ Drone_Mission.ino',
    ],
    task: 'เพิ่ม int DIST = 100; ไว้เหนือ void setup() แล้วเปลี่ยน move_forward(100); บรรทัดใดบรรทัดหนึ่งเป็น move_forward(DIST);',
    snippet: 'int DIST = 100;',
    where: 'top',
    check: ({ code }) => /^\s*int\s+DIST\s*=\s*\d+\s*;/m.test(code) && /move_forward(?:_cm)?\s*\(\s*DIST\s*\)/.test(code) && noErr(code),
    hint: 'บรรทัด int DIST = 100; ต้องอยู่นอกปีกกา เหนือ void setup()',
  },
  {
    title: 'ทำซ้ำด้วย for',
    body: [
      'อยากให้ทำสิ่งเดิมซ้ำหลายรอบ ไม่ต้องก๊อปบรรทัด ใช้ `for` ได้: `for (int i = 0; i < 2; i++) { ... }` แปลว่า “ให้ i เริ่มที่ 0 ทำไปเรื่อยๆ ตราบที่ i น้อยกว่า 2 แล้วเพิ่ม i ทีละ 1” ได้ 2 รอบ',
      'ในปีกกาของ for คือคำสั่งที่ทำซ้ำ เช่น เดินหน้าแล้วหยุดนิ่ง',
    ],
    task: 'ใน setup() เพิ่ม for (int i = 0; i < 2; i++) { move_forward(DIST); poshold(); } ก่อน auto_land();',
    check: ({ code }) => /for\s*\(\s*int\s+\w+\s*=/.test(code) && count(code, 'fw') >= 3 && noErr(code),
    hint: 'พิมพ์ for แล้วใส่หัวใน ( ) ครบ 3 ส่วนคั่นด้วย ; แล้วเปิดปีกกา { ใส่คำสั่ง และปิด }',
  },
  {
    title: 'เสร็จแล้ว ไปลองโจทย์จริง',
    body: [
      'คุณเขียนโค้ดสั่งโดรนเป็นแล้ว: โครง setup() · ลำดับคำสั่ง · delay · ค่าในวงเล็บ · ทิศทาง · ชื่อเต็มกับ pArduino-> · ตั้งชื่อตัวเลข · for',
      'ต่อไปเลือกโจทย์ที่ปุ่มด้านบน มีตั้งแต่ด่านเล็กบนกริดจนถึงภารกิจแข่งจริง เปิดบทสอนนี้ซ้ำได้ทุกเมื่อที่ปุ่ม “บทสอน”',
    ],
  },
];

/** หาตำแหน่งปีกกาปิดของฟังก์ชัน setup() */
function setupClose(code: string): number {
  const m = /void\s+setup\s*\(\s*(?:void)?\s*\)\s*\{/.exec(code);
  if (!m) return -1;
  let depth = 1;
  for (let i = m.index + m[0].length; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}' && --depth === 0) return i;
  }
  return -1;
}

/** เติมบรรทัดใหม่ท้าย setup() (ก่อนปีกกาปิด) หรือเหนือ setup() ถ้า where = 'top' · ถ้าไม่มี setup เติมท้ายไฟล์ */
export function appendLine(code: string, snippet: string, where: 'setup' | 'top' = 'setup'): string {
  if (where === 'top') {
    const m = /void\s+setup\s*\(/.exec(code);
    return m ? `${code.slice(0, m.index)}${snippet}\n\n${code.slice(m.index)}` : `${snippet}\n${code}`;
  }
  const i = setupClose(code);
  if (i < 0) return `${code.replace(/\s*$/, '')}\n${snippet}\n`;
  const before = code.slice(0, i).replace(/[ \t]*$/, '');
  return `${before}${before.endsWith('\n') ? '' : '\n'}  ${snippet}\n${code.slice(i)}`;
}
