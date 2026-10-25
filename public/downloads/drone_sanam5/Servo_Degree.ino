#include <Arduino.h>

// =====================================================================
//  Servo_Degree.ino — สั่ง servo เป็น "องศา" แทนการกรอกตัวเลข pulse เอง
// =====================================================================
//  servo ควบคุมจริงด้วยความกว้าง pulse หน่วยไมโครวินาที (µs) ไม่ใช่องศา
//  ไฟล์นี้ทำหน้าที่ "แปลงองศา (0-180°) → pulse (µs)" ให้ เพื่อให้สั่งงานง่าย
//  อ่านเข้าใจกว่า  เช่น สั่ง 90° แทนที่จะต้องจำว่า 90° = 1520 µs
//
//  ทิศทางการแปลง:  องศา (input)  ──►  pulse µs (output)   (ไม่ใช่ทางกลับ)
//      0°   → 490 µs   (สุดข้างหนึ่ง)
//      90°  → ~1520 µs (กึ่งกลาง)
//      180° → 2550 µs  (สุดอีกข้าง)
// =====================================================================

// ขอบเขตองศาที่ servo รับได้
const int SERVO_DEGREE_MIN = 0;     // องศาต่ำสุด
const int SERVO_DEGREE_MAX = 180;   // องศาสูงสุด

// ความกว้าง pulse (µs) ที่ตรงกับองศาต่ำสุด/สูงสุด — ค่าได้จากการ calibrate
const int SERVO_DEGREE_MIN_PULSE = 490;   // pulse ที่ 0°
const int SERVO_DEGREE_MAX_PULSE = 2550;  // pulse ที่ 180°

// แปลง "องศา" → "pulse µs" ด้วยช่วง pulse มาตรฐาน (490-2550)
//   angle : องศาที่ต้องการ (เกินช่วงจะถูก clamp ด้วย constrain)
//   คืนค่า: ความกว้าง pulse หน่วย µs ไว้ส่งให้ release_servo_angle()
int servo_degree_to_pulse(int angle) {
  angle = constrain(angle, SERVO_DEGREE_MIN, SERVO_DEGREE_MAX);
  return map(angle, SERVO_DEGREE_MIN, SERVO_DEGREE_MAX,
             SERVO_DEGREE_MIN_PULSE, SERVO_DEGREE_MAX_PULSE);
}

// เหมือนข้างบน แต่กำหนดช่วง pulse เองได้ (servo แต่ละตัว/กลไกอาจไม่เท่ากัน)
//   pulse_min : pulse µs ที่ตรงกับ 0°
//   pulse_max : pulse µs ที่ตรงกับ 180°
int servo_degree_to_pulse_custom(int angle, int pulse_min, int pulse_max) {
  angle = constrain(angle, SERVO_DEGREE_MIN, SERVO_DEGREE_MAX);
  return map(angle, SERVO_DEGREE_MIN, SERVO_DEGREE_MAX, pulse_min, pulse_max);
}

// สั่ง servo 1 ตัว ไปยังองศาที่กำหนด (แปลงเป็น pulse ให้อัตโนมัติ)
//   port_pin : ขา servo เช่น PORT3_S
//   angle    : องศาเป้าหมาย 0-180
void release_servo_degree(uint8_t port_pin, int angle) {
  release_servo_angle(port_pin, servo_degree_to_pulse(angle));
}

// สั่ง servo 1 ตัว ไปองศาที่กำหนด โดยระบุช่วง pulse ของ servo ตัวนั้นเอง
void release_servo_degree_custom(uint8_t port_pin, int angle, int pulse_min, int pulse_max) {
  release_servo_angle(port_pin, servo_degree_to_pulse_custom(angle, pulse_min, pulse_max));
}

// สั่ง servo 2 ตัว ไปองศาที่กำหนด "พร้อมกัน" (ช่วง pulse มาตรฐานทั้งคู่)
//   เหมาะกับเปิด/ปิดประตูบอลสองช่องให้ขยับพร้อมกัน
void release_dual_servo_degree(uint8_t port_pin1, int angle1, uint8_t port_pin2, int angle2) {
  release_dual_servo_angle(
    port_pin1,
    servo_degree_to_pulse(angle1),
    port_pin2,
    servo_degree_to_pulse(angle2)
  );
}

// สั่ง servo 2 ตัวพร้อมกัน โดยกำหนดช่วง pulse แยกของแต่ละตัวได้
//   ใช้เมื่อ servo สองตัวคนละรุ่น/คนละกลไก ต้องการช่วง pulse ต่างกัน
void release_dual_servo_degree_custom(
  uint8_t port_pin1,
  int angle1,
  int pulse1_min,
  int pulse1_max,
  uint8_t port_pin2,
  int angle2,
  int pulse2_min,
  int pulse2_max
) {
  release_dual_servo_angle(
    port_pin1,
    servo_degree_to_pulse_custom(angle1, pulse1_min, pulse1_max),
    port_pin2,
    servo_degree_to_pulse_custom(angle2, pulse2_min, pulse2_max)
  );
}
