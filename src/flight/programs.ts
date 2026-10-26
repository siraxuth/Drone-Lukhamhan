import type { EventId } from '@/rules/types';

export type Program = { id: string; event: EventId; title: string; brief: string; code: string };

/**
 * โค้ดตัวอย่างต่อประเภท (ใช้เป็นเดโมในหน้าสนามด้วย)
 * หมายเหตุ: ความสูง (sh) นับจากพื้นสนาม ขึ้นบินจากแท่นสูง 20 ซม. แล้วลอยสูงจากแท่น 80 ซม. = 100 ซม. จากพื้น
 * ห่วงเปิดช่องระหว่างความสูง 20–140 ซม. จึงออกจากห่วงที่ ~100 ซม. แล้วค่อยปรับความสูง
 */
export const programs: Program[] = [
  {
    id: 'mission-t', event: 'mission',
    title: 'บินตัว T ทิ้งครบ 4 แท่น (100 คะแนน)',
    brief: 'คนแข่งยืนอยู่ในสนามตลอด: เดินมาบรรจุบอลชุดซ้าย 20 + ชุดขวา 20 ลูกใส่ตัวโดรน แล้วโดรนบินตัว T ด้านบน (ซ้าย poshold ปล่อย · ข้ามไปขวา poshold ปล่อย) กลับมาลงฐาน คนแข่งบรรจุใหม่และ "หมุนตัวโดรนด้วยมือ" 180° แล้วบินตัว T เดิมไปแท่นด้านล่าง ไม่ต้องสั่ง yaw',
    code: `// Drone Mission : ตัว T ด้านบน → คนแข่งบรรจุบอลและหมุนโดรนด้วยมือ → ตัว T ด้านล่าง
void setup() {
  calibration();
  delay(3000);

  // ---------- ด้านบน ----------
  reload();  // คนแข่งใส่บอลชุดซ้าย 20 + ชุดขวา 20 ลูกที่ตัวโดรน
  take_off();
  delay(3000);
  set_height(100);  // ความสูง 100 ซม. ลอดห่วงได้ (ห่วงเปิดช่อง ~30–132 ซม.)
  move_forward(250);
  move_left(250);  // ถึงแท่นซ้ายบน
  poshold();  // หยุดนิ่ง ล็อกตำแหน่ง
  drop();  // ปล่อยชุดซ้าย 20 ลูก
  move_right(500);  // ข้ามไปแท่นขวาบน
  poshold();
  drop();  // ปล่อยชุดขวา 20 ลูก
  move_left(250);
  move_backward(250);
  auto_land();  // กลับมาลงบนแท่นเขียว

  // ---------- ด้านล่าง ----------
  reload();  // บรรจุใหม่
  turnByHand(180);  // คนแข่งหมุนตัวโดรนด้วยมือให้หันไปอีกทาง (ไม่ใช้ yaw)
  take_off();
  delay(3000);
  set_height(100);
  move_forward(250);
  move_left(250);  // ซ้ายของโดรน = ฝั่งขวาของสนาม → แท่นขวาล่าง
  poshold();
  drop();
  move_right(500);  // แท่นซ้ายล่าง
  poshold();
  drop();
  move_left(250);
  move_backward(250);
  auto_land();  // ลงบนแท่นเขียวอีกครั้ง = หยุดเวลา
}

void loop() {
}`,
  },
  {
    id: 'mission-warm', event: 'mission',
    title: 'วอร์มอัพ: ตัว T ด้านบนอย่างเดียว',
    brief: 'บินตัว T ครั้งเดียว ทิ้งสองแท่นด้านบน (บอล 40 ลูก + ลงจอด = 60 คะแนน) ใช้ฝึกก่อนเพิ่มด้านล่าง',
    code: `void setup() {
  calibration();
  delay(3000);
  reload();
  take_off();
  delay(3000);
  set_height(100);
  move_forward(250);
  move_left(250);
  poshold();
  drop();
  move_right(500);
  poshold();
  drop();
  move_left(250);
  move_backward(250);
  auto_land();
}

void loop() {
}`,
  },
  {
    id: 'aviation-all', event: 'aviation',
    title: 'แตะลูกโป่ง 12 ลูก + ลงจอดครบ 4 แท่น (100 คะแนน)',
    brief: 'คนแข่งเดินตามโดรน เข็มที่หัวโดรนแตะลูกโป่งแล้วแตกทันที จากนั้นโดรนลงแท่นวงกลม คนแข่งหมุนโดรนด้วยมือก่อนขึ้นบินไปกลุ่มถัดไป',
    code: `// Aviation Mastery : บน → แท่นขวาบน → ขวา → แท่นขวาล่าง → ล่าง → แท่นซ้ายล่าง → ซ้าย → แท่นซ้ายบน → กลับฐาน
void setup() {
  calibration();
  delay(3000);
  take_off();
  delay(3000);
  set_height(100);
  move_forward(100);  // ลอดห่วง
  set_height(145);  // สูงเท่ากลางลูกโป่ง
  move_forward(138);  // เข็มแตะลูกกลางด้านบนแล้วแตกทันที
  move_left(60);  // ลูกซ้ายด้านบน
  move_right(120);  // ลูกขวาด้านบน
  move_right(190);  // ไปแท่นขวาบน
  auto_land();  // +5
  turnByHand(180);  // คนแข่งเดินมาหมุนโดรนบนแท่น
  take_off();
  delay(3000);
  set_height(145);
  move_forward(166);  // กลุ่มด้านขวา
  move_forward(60);
  move_forward(60);
  move_forward(202);  // ไปแท่นขวาล่าง
  auto_land();  // +5
  turnByHand(90);  // หันหน้าไปทางซ้ายด้วยมือ
  take_off();
  delay(3000);
  set_height(145);
  move_forward(178);  // กลุ่มด้านล่าง
  move_forward(60);
  move_forward(60);
  move_forward(202);  // ไปแท่นซ้ายล่าง
  auto_land();  // +5
  turnByHand(90);  // หันหน้าขึ้นบนด้วยมือ
  take_off();
  delay(3000);
  set_height(145);
  move_forward(178);  // กลุ่มด้านซ้าย
  move_forward(60);
  move_forward(60);
  move_forward(202);  // ไปแท่นซ้ายบน
  auto_land();  // +5
  turnByHand(135);  // หันหน้ากลับฐานด้วยมือ
  take_off();
  delay(3000);
  set_height(100);
  move_forward(354);
  auto_land();  // ลงบนแท่นเขียว = หยุดเวลา
}

void loop() {
}`,
  },
  {
    id: 'innovation-four', event: 'innovation',
    title: 'ยิงเป้าตรงกลางครบ 4 จุด (100 คะแนน)',
    brief: 'ยืนห่างเป้า 150 ซม. (ต้องไม่น้อยกว่า 100 ซม.) ความสูง 140 ซม. ตรงกึ่งกลางเป้า หยุดนิ่งแล้ว shoot() ได้วง 20 ทุกเป้า ลองเปลี่ยนความสูงเป็น sh(150) ดูว่าวงคะแนนลดลงเท่าไร',
    code: `// Drone Innovation Challenge : ซ้ายบน → ขวาบน → (กลับหัว) ขวาล่าง → ซ้ายล่าง
void setup() {
  calibration();
  delay(3000);
  take_off();
  delay(3000);
  set_height(100);
  move_left(250);  // ลอดห่วง
  set_height(140);  // ความสูงเท่ากึ่งกลางเป้า
  poshold(); shoot();  // เป้าซ้ายบน
  poshold(); shot_b();  // เป้าขวาบน
  set_height(90);  // ความสูงเท่ากึ่งกลางเป้า
  move_right(500);
  set_height(140);  // ความสูงเท่ากึ่งกลางเป้า
  poshold(); shoot();  // เป้าขวาล่าง
  poshold(); shot_b();  // เป้าซ้ายล่าง
  set_height(90);  // ความสูงเท่ากึ่งกลางเป้า
  move_left(250);
  auto_land();
}

void loop() {
}`,
  },
];

export const programsOf = (event: EventId) => programs.filter((p) => p.event === event);
