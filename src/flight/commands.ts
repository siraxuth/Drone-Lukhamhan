/** รายการคำสั่งของตัวจำลอง: ใช้ทำ suggestion, ไฮไลต์สี และตารางคำสั่ง (ชื่อให้ตรงกับ switch ใน engine.ts) */
export type Cmd = {
  name: string;
  /** ข้อความที่แทรกเมื่อเลือก ส่วน [[ ]] = ช่วงที่เลือกค้างไว้ให้พิมพ์ทับ */
  insert: string;
  sig: string;
  desc: string;
  group: 'เริ่มและจบการบิน' | 'เคลื่อนที่' | 'ภารกิจ' | 'แบบ pArduino (โค้ดจริงของชมรม)';
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
  // ชื่อแบบโค้ดจริงของชมรม (protocol.hpp) · ตัวจำลองอ่านได้ทั้ง drone.xxx() และ pArduino->xxx()
  { name: 'take_off', insert: 'pArduino->take_off();', sig: 'pArduino->take_off()', desc: 'เหมือน takeOff()', group: 'แบบ pArduino (โค้ดจริงของชมรม)' },
  { name: 'auto_land', insert: 'pArduino->auto_land();', sig: 'pArduino->auto_land()', desc: 'เหมือน autoLand()', group: 'แบบ pArduino (โค้ดจริงของชมรม)' },
  { name: 'set_height', insert: 'pArduino->set_height([[100]]);', sig: 'pArduino->set_height(ซม.)', desc: 'เหมือน sh(ซม.) ตั้งความสูง', group: 'แบบ pArduino (โค้ดจริงของชมรม)' },
  { name: 'move_forward_cm', insert: 'pArduino->move_forward_cm([[100]]);', sig: 'pArduino->move_forward_cm(ซม.)', desc: 'เหมือน fw(ซม.) บินหน้า แล้วล็อกตำแหน่ง', group: 'แบบ pArduino (โค้ดจริงของชมรม)' },
  { name: 'move_backward_cm', insert: 'pArduino->move_backward_cm([[100]]);', sig: 'pArduino->move_backward_cm(ซม.)', desc: 'เหมือน bw(ซม.)', group: 'แบบ pArduino (โค้ดจริงของชมรม)' },
  { name: 'move_left_cm', insert: 'pArduino->move_left_cm([[100]]);', sig: 'pArduino->move_left_cm(ซม.)', desc: 'เหมือน ml(ซม.)', group: 'แบบ pArduino (โค้ดจริงของชมรม)' },
  { name: 'move_right_cm', insert: 'pArduino->move_right_cm([[100]]);', sig: 'pArduino->move_right_cm(ซม.)', desc: 'เหมือน mr(ซม.)', group: 'แบบ pArduino (โค้ดจริงของชมรม)' },
  { name: 'set_yaw', insert: 'pArduino->set_yaw(1, [[90]]);', sig: 'pArduino->set_yaw(ทิศ, องศา)', desc: 'ทิศ 1 = หมุนขวา, 2 = หมุนซ้าย (เหมือน yaw(+/-องศา))', group: 'แบบ pArduino (โค้ดจริงของชมรม)' },
];

/** ชื่อแบบไม่สนตัวพิมพ์ใหญ่เล็กและขีดล่าง (เหมือน engine) */
export const canon = (n: string) => n.toLowerCase().replace(/_/g, '');

/** ชื่อที่เอนจินรู้จักทั้งหมด รวมชื่อเรียกอื่น */
export const KNOWN = new Set([
  ...COMMANDS.map((c) => canon(c.name)),
  'calibrateanddelay', 'calibrate', 'setheight', 'turn', 'wait', 'delay', 'hold', 'load', 'rotatebyhand', 'handturn', 'needle', 'shootb', 'shoots1', 'shoots2',
  'setup', 'loop', 'begin', 'beginDefault', 'poll', 'print', 'println', 'pinMode', 'digitalWrite', 'keyDo', 'main', 'smooth_set_height', 'set_heights', 'poshold_heights', 'stop_motor', 'move_forward_fast', 'move_backward_fast', 'move_left_fast', 'move_right_fast', 'moveForward', 'moveBackward', 'moveLeft', 'moveRight', 'setYaw', 'setHeight',
  'open_pair_ch1_ch4', 'open_pair_ch2_ch3', 'open_all_ball_gate',
].map(canon));
