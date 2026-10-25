import type { ScenarioConfig, SceneObject } from './scenarios';

/**
 * ข้อมูลตั้งต้นของโจทย์ฝึก (ใช้ตอน seed ลงฐานข้อมูล และเป็นตัวสำรองถ้าฐานข้อมูลยังว่าง)
 * พิกัดเป็นเมตร (0,0) = แท่น Takeoff · ช่องกริด 1×1 ม. จุดกึ่งกลางช่องอยู่ที่พิกัดจำนวนเต็ม -2…2
 * solution = โค้ดเฉลยที่ใช้ตรวจว่าโจทย์ทำได้จริง (ไม่ถูกเก็บลงฐานข้อมูล)
 */
export type SeedScenario = { slug: string; title: string; level: 'เริ่มต้น' | 'กลาง' | 'ยาก'; order: number; brief: string; starter: string; solution: string; config: ScenarioConfig };

const wp = (id: string, x: number, y: number, order?: number, points = 10): SceneObject => ({ type: 'waypoint', id, x, y, order, points });
const hoop = (id: string, x: number, y: number, yaw: number, points = 15): SceneObject => ({ type: 'hoop', id, x, y, yaw, size: 1, zMin: 55, zMax: 150, points });
const START = `calibration();\ntakeOff();\nsh(100);`;

export const scenarioSeeds: SeedScenario[] = [
  // ───────── ต้นแบบของ 3 ภารกิจแข่ง: ทำแค่ฝั่งเดียว แล้วต่อยอดเอง ─────────
  {
    slug: 'mission-start', title: 'ต้นแบบ: ปล่อยสัมภาระ แท่นเดียว', level: 'เริ่มต้น', order: 1,
    brief: '<p>ภารกิจ <b>ปล่อยสัมภาระ</b> ในสนามแข่งจริง เริ่มจากแท่นซ้ายบนแท่นเดียวก่อน</p><ul><li>เป้าหมาย: บอลลงแท่นซ้ายบน (ได้ 1 คะแนนต่อลูก)</li><li>ลำดับ: ใส่บอล → ขึ้นบิน → ไปที่แท่น → หยุดนิ่ง → ปล่อย</li><li>ต่อยอด: บินกลับมาลงฐาน (ได้อีก 20 คะแนนถ้าลอดห่วงออกไป) แล้วทำแท่นอื่นต่อ</li></ul>',
    starter: `// ต้นแบบ: ปล่อยสัมภาระที่แท่นซ้ายบน
calibration();
reload();             // คนแข่งใส่บอลที่ตัวโดรน
takeOff();
sh(100);              // ความสูง 100 ซม. ลอดห่วงได้
fw(250);              // ไปข้างหน้า 250 ซม.
ml(250);              // เลื่อนซ้าย 250 ซม. = ถึงแท่นซ้ายบน
poshold();            // หยุดนิ่งก่อนปล่อย
drop();               // ปล่อยบอล

// ต่อไปให้ลอง: กลับมาลงฐานด้วย mr(250); bw(250); autoLand();`,
    solution: `calibration();\nreload();\ntakeOff();\nsh(100);\nfw(250);\nml(250);\nposhold();\ndrop();\nmr(250);\nbw(250);\nautoLand();`,
    config: { pattern: 'standard', event: 'mission', objects: [] },
  },
  {
    slug: 'aviation-start', title: 'ต้นแบบ: แตะลูกโป่ง กลุ่มเดียว', level: 'เริ่มต้น', order: 2,
    brief: '<p>ภารกิจ <b>ทำลายลูกโป่ง</b> เข็มที่หัวโดรนต้องแตะลูกโป่ง เริ่มจากกลุ่มด้านบนก่อน</p><ul><li>เป้าหมาย: ทำให้ลูกโป่งกลางด้านบนแตก (+5 คะแนน)</li><li>ลูกโป่งอยู่สูง 145 ซม. ต้องปรับ <code>sh(145)</code> ให้เข็มตรงกลางลูก</li><li>ต่อยอด: <code>ml(60)</code> แตะลูกซ้าย และ <code>mr(120)</code> แตะลูกขวา แล้วกลับฐาน</li></ul>',
    starter: `// ต้นแบบ: แตะลูกโป่งกลางด้านบน
calibration();
takeOff();
sh(100);
fw(100);              // ลอดห่วงออกจากแท่น
sh(145);              // ยกให้เข็มสูงเท่ากลางลูกโป่ง
fw(138);              // เข็มแตะลูกโป่งกลาง แตกทันที

// ต่อไปให้ลอง: ml(60); mr(120); แล้ว bw(...) กลับฐานและ autoLand();`,
    solution: `calibration();\ntakeOff();\nsh(100);\nfw(100);\nsh(145);\nfw(138);\nbw(238);\nautoLand();`,
    config: { pattern: 'standard', event: 'aviation', objects: [] },
  },
  {
    slug: 'innovation-start', title: 'ต้นแบบ: ยิงเป้า เป้าเดียว', level: 'เริ่มต้น', order: 3,
    brief: '<p>ภารกิจ <b>ยิงเป้า</b> ยิงลูกดอกใส่เป้ากลมให้ถูกวงกลางที่สุด เริ่มจากเป้าซ้ายบนเป้าเดียว</p><ul><li>ต้องอยู่ห่างเป้าอย่างน้อย 100 ซม. ก่อนยิง</li><li>กึ่งกลางเป้าสูง 140 ซม. ถ้า <code>sh(140)</code> จะได้วงกลาง 20 คะแนน</li><li>ต่อยอด: ลองเปลี่ยนความสูงเป็น <code>sh(150)</code> แล้วดูวงคะแนนที่ลดลง</li></ul>',
    starter: `// ต้นแบบ: ยิงเป้าซ้ายบน
calibration();
takeOff();
sh(100);
ml(250);              // เลื่อนไปอยู่ตรงหน้าเป้าซ้ายบน
sh(140);              // ความสูงเท่ากึ่งกลางเป้า
poshold();            // หยุดนิ่ง
shoot();              // ยิง!

// ต่อไปให้ลอง: sh(100); mr(250); autoLand();`,
    solution: `calibration();\ntakeOff();\nsh(100);\nml(250);\nsh(140);\nposhold();\nshoot();\nsh(100);\nmr(250);\nautoLand();`,
    config: { pattern: 'standard', event: 'innovation', objects: [] },
  },

  // ───────── ฝึกพื้นฐานบนพื้นว่าง/กริด ─────────
  {
    slug: 'blank-hover', title: 'ขึ้น ลอยนิ่ง ลงจอด', level: 'เริ่มต้น', order: 4,
    brief: '<p>ก้าวแรกของการบิน บนพื้นว่าง ไม่มีสิ่งกีดขวาง</p><ul><li>เป้าหมาย: ลอยเหนือฐานที่ความสูง 90–130 ซม. แล้วลงจอดกลับที่ฐาน</li><li>จำไว้: <code>calibration()</code> ก่อน <code>takeOff()</code> เสมอ</li></ul>',
    starter: `calibration();
takeOff();
sh(100);
poshold();            // ลอยนิ่ง

// ต่อไปให้ลอง: autoLand(); ลงจอดบนฐาน`,
    solution: `calibration();\ntakeOff();\nsh(100);\nposhold();\nautoLand();`,
    config: { pattern: 'blank', event: 'mission', objects: [{ ...wp('ลอยเหนือฐาน', 0, 0), zMin: 90, zMax: 130, r: 40 } as SceneObject] },
  },
  {
    slug: 'grid-line', title: 'เดินตรงไปสุดกริด', level: 'เริ่มต้น', order: 5,
    brief: '<p>กริด 5×5 เมตร ช่องละ 1 เมตร ฐานอยู่ช่อง C3 กึ่งกลาง ผ่านช่อง C4 แล้ว C5 ตามลำดับ</p><ul><li><code>fw(100)</code> = ไปข้างหน้า 1 ช่อง</li><li>หยุด <code>poshold()</code> ทุกช่องเพื่อให้โดรนนิ่งก่อนไปต่อ</li></ul>',
    starter: `${START}
fw(100);              // ไปช่อง C4
poshold();

// ต่อไปให้ลอง: fw(100); ไปช่อง C5 แล้ว bw(200) กลับฐาน autoLand();`,
    solution: `${START}\nfw(100);\nposhold();\nfw(100);\nposhold();\nbw(200);\nautoLand();`,
    config: { pattern: 'grid5', event: 'mission', objects: [wp('C4', 0, 1, 1), wp('C5', 0, 2, 2)] },
  },
  {
    slug: 'grid-l', title: 'เดินเป็นตัว L', level: 'เริ่มต้น', order: 6,
    brief: '<p>เดินขึ้น 2 ช่อง แล้วเลี้ยวขวา 2 ช่อง เป็นรูปตัว L ผ่านจุดตามลำดับ 1 → 4</p><ul><li>เลื่อนขวาโดยไม่หมุนตัว ใช้ <code>mr(100)</code></li></ul>',
    starter: `${START}
fw(100);
poshold();
fw(100);
poshold();

// ต่อไปให้ลอง: mr(100); mr(100); แล้วกลับฐาน (ml(200); bw(200); autoLand();)`,
    solution: `${START}\nfw(100);\nposhold();\nfw(100);\nposhold();\nmr(100);\nposhold();\nmr(100);\nposhold();\nml(200);\nbw(200);\nautoLand();`,
    config: { pattern: 'grid5', event: 'mission', objects: [wp('C4', 0, 1, 1), wp('C5', 0, 2, 2), wp('D5', 1, 2, 3), wp('E5', 2, 2, 4)] },
  },
  {
    slug: 'grid-square', title: 'บินสี่เหลี่ยมจัตุรัส 2×2 ช่อง', level: 'กลาง', order: 7,
    brief: '<p>บินวนครบ 4 มุม ตามลำดับ ซ้ายบน → ขวาบน → ขวาล่าง → ซ้ายล่าง แล้วกลับลงฐาน</p><ul><li>จุดผ่านต้องผ่านตามลำดับ ถ้าข้ามจุดจะไม่นับ</li></ul>',
    starter: `${START}
ml(100);
fw(100);              // มุมซ้ายบน (B4)
poshold();

// ต่อไปให้ลอง: mr(200); bw(200); ml(200); แล้วกลับฐาน`,
    solution: `${START}\nml(100);\nfw(100);\nposhold();\nmr(200);\nposhold();\nbw(200);\nposhold();\nml(200);\nposhold();\nmr(100);\nfw(100);\nautoLand();`,
    config: { pattern: 'grid5', event: 'mission', objects: [wp('B4', -1, 1, 1), wp('D4', 1, 1, 2), wp('D2', 1, -1, 3), wp('B2', -1, -1, 4)] },
  },
  {
    slug: 'grid-ring', title: 'วนรอบฐาน 8 ช่อง', level: 'กลาง', order: 8,
    brief: '<p>วนเป็นวงรอบฐาน ผ่านทั้ง 8 ช่องที่ล้อมฐาน ทวนเข็มนาฬิกา เริ่มที่ช่องขวาของฐาน</p>',
    starter: `${START}
mr(100);              // D3
poshold();
fw(100);              // D4
poshold();

// ต่อไปให้ลอง: ml(100) ไป C4, B4 แล้ววนต่อให้ครบ 8 ช่อง`,
    solution: `${START}\nmr(100);\nposhold();\nfw(100);\nposhold();\nml(100);\nposhold();\nml(100);\nposhold();\nbw(100);\nposhold();\nbw(100);\nposhold();\nmr(100);\nposhold();\nmr(100);\nposhold();\nml(100);\nfw(100);\nautoLand();`,
    config: { pattern: 'grid5', event: 'mission', objects: [wp('D3', 1, 0, 1), wp('D4', 1, 1, 2), wp('C4', 0, 1, 3), wp('B4', -1, 1, 4), wp('B3', -1, 0, 5), wp('B2', -1, -1, 6), wp('C2', 0, -1, 7), wp('D2', 1, -1, 8)] },
  },
  {
    slug: 'grid-snake', title: 'เดินเป็นตัว S', level: 'กลาง', order: 9,
    brief: '<p>เดินตามรอยตัว S ผ่าน 7 ช่อง ตามลำดับ เริ่มจากมุมขวาบนไปซ้าย ลงล่าง แล้วไปขวา</p>',
    starter: `${START}
mr(100);
fw(100);              // เริ่มที่ D4
poshold();

// ต่อไปให้ลอง: ml(100) x2 → bw(100) x2 → mr(100) x2`,
    solution: `${START}\nmr(100);\nfw(100);\nposhold();\nml(100);\nposhold();\nml(100);\nposhold();\nbw(100);\nposhold();\nbw(100);\nposhold();\nmr(100);\nposhold();\nmr(100);\nposhold();\nml(100);\nfw(100);\nautoLand();`,
    config: { pattern: 'grid5', event: 'mission', objects: [wp('D4', 1, 1, 1), wp('C4', 0, 1, 2), wp('B4', -1, 1, 3), wp('B3', -1, 0, 4), wp('B2', -1, -1, 5), wp('C2', 0, -1, 6), wp('D2', 1, -1, 7)] },
  },
  {
    slug: 'grid-hoops', title: 'ลอดห่วง 4 ใบรอบสี่เหลี่ยม', level: 'กลาง', order: 10,
    brief: '<p>ห่วงตั้งอยู่กลางทาง 4 ใบ ต้องบินผ่านช่องห่วงที่ความสูง 55–150 ซม.</p><ul><li>ห่วงที่หันขวางทิศบินจะไม่นับ ดูหน้าห่วงในภาพ</li><li>ลอดห่วงละ 15 คะแนน</li></ul>',
    starter: `${START}
fw(200);              // ผ่านห่วงใบที่ 1
poshold();

// ต่อไปให้ลอง: mr(200) bw(200) ml(200) แล้ว autoLand();`,
    solution: `${START}\nfw(200);\nposhold();\nmr(200);\nposhold();\nbw(200);\nposhold();\nml(200);\nposhold();\nautoLand();`,
    config: { pattern: 'grid5', event: 'mission', objects: [hoop('ห่วง 1', 0, 1.2, 0), hoop('ห่วง 2', 1.2, 2, 90), hoop('ห่วง 3', 2, 1.2, 180), hoop('ห่วง 4', 1.2, 0, 270)] },
  },
  {
    slug: 'grid-delivery', title: 'ส่งของ 2 จุด', level: 'กลาง', order: 11,
    brief: '<p>ปล่อยบอลลงแท่นสองแท่นบนกริด (ซ้ายบน A5 และขวาบน E5)</p><ul><li><code>reload()</code> ใส่บอลสองชุด · <code>drop()</code> ปล่อยทีละชุด</li><li>หยุดนิ่งก่อนปล่อยเสมอ</li></ul>',
    starter: `calibration();
reload();
takeOff();
sh(100);
fw(200);
ml(200);              // เหนือแท่นซ้ายบน
poshold();
drop();

// ต่อไปให้ลอง: mr(400); poshold(); drop(); แล้วกลับฐาน`,
    solution: `calibration();\nreload();\ntakeOff();\nsh(100);\nfw(200);\nml(200);\nposhold();\ndrop();\nmr(400);\nposhold();\ndrop();\nml(200);\nbw(200);\nautoLand();`,
    config: { pattern: 'grid5', event: 'mission', objects: [{ type: 'platform', id: 'A5', x: -2, y: 2, r: 0.5 }, { type: 'platform', id: 'E5', x: 2, y: 2, r: 0.5 }] },
  },
  {
    slug: 'grid-balloons', title: 'แถวลูกโป่งบนกริด', level: 'ยาก', order: 12,
    brief: '<p>ลูกโป่ง 3 ลูกเรียงแถวที่แถว 5 (สูง 145 ซม.) พร้อมห่วงขวางทาง ต้องลอดห่วงแล้วกวาดเข็มผ่านลูกโป่งทั้งแถว</p><ul><li>เข็มอยู่หน้าหัวโดรน 12 ซม. บินให้เข็มผ่านลูกโป่งในระยะ 15 ซม.</li></ul>',
    starter: `${START}
sh(145);              // ความสูงเท่ากลางลูกโป่ง
fw(188);              // ลอดห่วง ปลายเข็มอยู่ที่แถวลูกโป่ง
poshold();

// ต่อไปให้ลอง: ml(100); mr(200); แล้วกลับฐาน`,
    solution: `${START}\nsh(145);\nfw(188);\nposhold();\nml(100);\nposhold();\nmr(200);\nposhold();\nml(100);\nbw(188);\nautoLand();`,
    config: { pattern: 'grid5', event: 'aviation', objects: [{ type: 'balloon', id: 'ลูกซ้าย', x: -1, y: 2, z: 145 }, { type: 'balloon', id: 'ลูกกลาง', x: 0, y: 2, z: 145 }, { type: 'balloon', id: 'ลูกขวา', x: 1, y: 2, z: 145 }, hoop('ห่วงทางเข้า', 0, 1, 0)] },
  },
  {
    slug: 'grid-shoot', title: 'ยิงเป้า 2 เป้าบนกริด', level: 'ยาก', order: 13,
    brief: '<p>เป้ากลม 2 เป้าที่แถว 5 ฝั่งซ้ายและขวา ยืนห่างอย่างน้อย 100 ซม. แล้วยิงให้ถูกวงกลาง</p><ul><li>กึ่งกลางเป้าสูง 140 ซม. ใช้ <code>sh(140)</code></li></ul>',
    starter: `${START}
sh(140);
ml(200);              // ตรงหน้าเป้าซ้าย
poshold();
shoot();

// ต่อไปให้ลอง: mr(400); poshold(); shoot(); แล้วกลับฐาน`,
    solution: `${START}\nsh(140);\nml(200);\nposhold();\nshoot();\nmr(400);\nposhold();\nshoot();\nml(200);\nautoLand();`,
    config: { pattern: 'grid5', event: 'innovation', objects: [{ type: 'target', id: 'เป้าซ้าย', x: -2, y: 2.5, cz: 140, r: 50 }, { type: 'target', id: 'เป้าขวา', x: 2, y: 2.5, cz: 140, r: 50 }] },
  },
  {
    slug: 'grid-course', title: 'ด่านรวม: ห่วง จุดผ่าน และส่งของ', level: 'ยาก', order: 14,
    brief: '<p>ด่านที่รวมทุกอย่าง ลอดห่วงทางออก → ผ่านจุด C5 → ปล่อยบอลที่แท่น E5 → ผ่านจุด E3 → กลับลงฐาน</p><ul><li>ลำดับจุดผ่านสำคัญ ผ่านผิดลำดับไม่นับ</li><li>วางแผนบนกระดาษก่อน แล้วค่อยเขียนทีละท่อน</li></ul>',
    starter: `calibration();
reload();
takeOff();
sh(100);

// เส้นทาง: ลอดห่วง → C5 → E5 (ปล่อยบอล) → E3 → กลับฐาน
fw(200);

// เขียนต่อ...`,
    solution: `calibration();\nreload();\ntakeOff();\nsh(100);\nfw(200);\nposhold();\nmr(200);\nposhold();\ndrop();\nbw(200);\nposhold();\nml(200);\nautoLand();`,
    config: { pattern: 'grid5', event: 'mission', objects: [hoop('ห่วงทางออก', 0, 1, 0), wp('C5', 0, 2, 1), { type: 'platform', id: 'E5', x: 2, y: 2, r: 0.5 }, wp('E3', 2, 0, 2)] },
  },
];
