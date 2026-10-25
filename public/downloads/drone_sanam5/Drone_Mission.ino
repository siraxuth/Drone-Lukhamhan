#include "DroneEasy.hpp"

// =====================================================
// ค่าปรับภารกิจหลัก
// =====================================================

int forwardDistanceCM[4] = { 352, 352, 352, 352 };
int backwardDistanceCM[4] = { 252, 252, 252, 252 };

int payload_round10 = 0;  // 0 = ปล่อยช่อง 1&4, 1 = ปล่อยช่อง 2&3
int k2_round = 0;         // 0 = รอบแรก 1&4 กลับแท่น, 1 = รอบสอง 2&3 จอดบนหลุม

// เวลารอหลังเปิดช่องในภารกิจจริง
const uint16_t MISSION_DROP_WAIT_MS = 300;

// เวลาพักหลังปิดช่องก่อนบินต่อ/ลงจอด
const uint16_t MISSION_CLOSE_WAIT_MS = 100;

// =====================================================
// ค่าคงตัวสำหรับชุดปล่อยลูกบอล RCSA EDU
// =====================================================

const uint8_t BALL_SERVO_12_PIN = PORT3;  // ควบคุมช่อง 1 และ 2
const uint8_t BALL_SERVO_34_PIN = PORT6;  // ควบคุมช่อง 3 และ 4

const int BALL_12_CLOSE_US = 1200;  // ปิด PORT3 ช่อง 1/2
const int BALL_34_CLOSE_US = 1200;  // ปิด PORT6 ช่อง 3/4

const int BALL_CH1_OPEN_US = 450;   // เปิด PORT3 ช่อง 1
const int BALL_CH2_OPEN_US = 2000;  // เปิด PORT3 ช่อง 2
const int BALL_CH3_OPEN_US = 1900;  // เปิด PORT6 ช่อง 3
const int BALL_CH4_OPEN_US = 500;   // เปิด PORT6 ช่อง 4

const int BALL_12_OPEN_ALL_US = 2550;  // เปิดทั้งหมด PORT3 ช่อง 1 กับ 2
const int BALL_34_OPEN_ALL_US = 2600;  // เปิดทั้งหมด PORT6 ช่อง 3 กับ 4

const int BALL_ACTION_DELAY_MS = 1000;

// =====================================================
// ฟังก์ชันพื้นฐานสำหรับปล่อยลูกบอล
// =====================================================

void close_ball_12() {
  drone.servoRelease(BALL_SERVO_12_PIN, BALL_12_CLOSE_US);
}

void close_ball_34() {
  drone.servoRelease(BALL_SERVO_34_PIN, BALL_34_CLOSE_US);
}

void close_all_ball_gate() {
  drone.servoReleaseDual(
    BALL_SERVO_12_PIN, BALL_12_CLOSE_US,
    BALL_SERVO_34_PIN, BALL_34_CLOSE_US);
}

void open_ball_ch1() {
  drone.servoRelease(BALL_SERVO_12_PIN, BALL_CH1_OPEN_US);
}

void open_ball_ch2() {
  drone.servoRelease(BALL_SERVO_12_PIN, BALL_CH2_OPEN_US);
}

void open_ball_ch3() {
  drone.servoRelease(BALL_SERVO_34_PIN, BALL_CH3_OPEN_US);
}

void open_ball_ch4() {
  drone.servoRelease(BALL_SERVO_34_PIN, BALL_CH4_OPEN_US);
}

void open_all_ball_gate() {
  drone.servoReleaseDual(
    BALL_SERVO_12_PIN, BALL_12_OPEN_ALL_US,
    BALL_SERVO_34_PIN, BALL_34_OPEN_ALL_US);
}

void open_pair_ch1_ch4() {
  drone.servoReleaseDual(
    BALL_SERVO_12_PIN, BALL_CH1_OPEN_US,
    BALL_SERVO_34_PIN, BALL_CH4_OPEN_US);
}

void open_pair_ch2_ch3() {
  drone.servoReleaseDual(
    BALL_SERVO_12_PIN, BALL_CH2_OPEN_US,
    BALL_SERVO_34_PIN, BALL_CH3_OPEN_US);
}

// =====================================================
// ฟังก์ชันทดสอบปล่อยบอลผ่านเซอร์โวทั้งหมด
// =====================================================

void release_the_ball() {
  open_ball_ch1();
  delay(BALL_ACTION_DELAY_MS);
  close_ball_12();
  delay(BALL_ACTION_DELAY_MS);

  open_ball_ch4();
  delay(BALL_ACTION_DELAY_MS);
  close_ball_34();
  delay(BALL_ACTION_DELAY_MS);

  open_ball_ch2();
  delay(BALL_ACTION_DELAY_MS);
  close_ball_12();
  delay(BALL_ACTION_DELAY_MS);

  open_ball_ch3();
  delay(BALL_ACTION_DELAY_MS);
  close_ball_34();
  delay(BALL_ACTION_DELAY_MS);

  open_all_ball_gate();
  delay(BALL_ACTION_DELAY_MS);
  close_all_ball_gate();
  delay(BALL_ACTION_DELAY_MS);

  open_pair_ch1_ch4();
  delay(BALL_ACTION_DELAY_MS);
  close_all_ball_gate();
  delay(BALL_ACTION_DELAY_MS);

  open_pair_ch2_ch3();
  delay(BALL_ACTION_DELAY_MS);
  close_all_ball_gate();
}

// =====================================================
// ฟังก์ชันกลางสำหรับภารกิจปล่อยลูกบอล
// =====================================================
void mission_drop_ch1_ch4() {
  // เปิดช่อง 1 กับ 4 โดยใช้ค่าจาก Test_ball.ino
  open_pair_ch1_ch4();
  delay(MISSION_DROP_WAIT_MS);

  // // ปิดทุกช่อง โดยใช้ค่าจาก Test_ball.ino
  close_all_ball_gate();
  delay(MISSION_CLOSE_WAIT_MS);
}

void mission_drop_ch2_ch3() {
  // delay(250);
  // เปิดช่อง 2 กับ 3 โดยใช้ค่าจาก Test_ball.ino
  open_pair_ch2_ch3();
  delay(MISSION_DROP_WAIT_MS);

  // ปิดทุกช่อง โดยใช้ค่าจาก Test_ball.ino
  close_all_ball_gate();
  delay(MISSION_CLOSE_WAIT_MS);
}

//   drone.setHeight(HEIGHT_DROP);
//   delay(500);
//   // drone.holdHeight(40);
//   // delay(300);

//   drone.setHeight(HEIGHT_DROP);
//   delay(200);
// }

void prepare_drop_height() {
  drone.setHeight(HEIGHT_DROP);
  delay(250);
  drone.settle(400);  // รอให้ร่อนถึง 30cm จริง + นิ่ง (จูนเลขนี้)
}

// ===============================
// เลือกโหมดการทำงานของ KEY 1
// 1 = ภารกิจเต็ม 2 จุด ปล่อยช่อง 1-4 และ 2-3
// 2 = ทดสอบบินไปตำแหน่งเดียว แล้วลงจอด
// ===============================
uint8_t KEY1_MODE = 2;

void DroneMission_KEY_1_handle(void) {
  if (KEY1_MODE == 1) {
    KEY1_mode1();
  } else if (KEY1_MODE == 2) {
    KEY1_mode2();
  } else {
    drone.calibrateAndDelay(3000);
    delay(3000);
    drone.takeOff();
    delay(3500);
    drone.fw(500);
    drone.autoLand();
    // ถ้าใส่โหมดผิด ให้ไม่ทำงานอันตราย
    // pArduino->auto_land();
  }
}
// =====================================================
// KEY_1: บินเป็นรูปตัว T ไปปล่อยจุดซ้าย แล้วลงจอด
// ปล่อยช่อง 1 กับ 4
// 1) เดินหน้า 250 cm → 2) ไปทางซ้าย 255 cm → 3) ลดระดับลง → 4) ปล่อยลูกบอลช่อง 1,4 → 5) จอดที่จุดปล่อยด้านซ้าย
// =====================================================
void KEY1_mode1() {
  drone.calibration();
  delay(3000);

  drone.takeOff();
  delay(4000);

  drone.setHeight(HEIGHT_TAKEOFF);
  delay(250);

  drone.fw(256);
  // drone.moveFastForward(243);

  drone.moveFastLeft(257);

  drone.setHeight(HEIGHT_DROP);
  delay(250);
  drone.down(3, 300);
  // delay(500);
  // drone.setHeight(HEIGHT_DROP);
  mission_drop_ch1_ch4();

  drone.setHeight(110);
  delay(250);

  drone.mr(480);
  drone.bw(8);
  // pArduino->set_direction(7, 1);
  // drone.posHold();
  // delay(500)
  

  

  drone.setHeight(40);
  delay(300);
  drone.down(3, 300);
  // delay(500);
  mission_drop_ch2_ch3();

  drone.setHeight(120);
  delay(240);

  drone.ml(260);

  drone.moveBackward(262);

  drone.autoLand();
}

void KEY1_mode2() {
  drone.calibration();
  delay(3000);

  drone.takeOff();
  delay(3000);
  drone.setHeight(140);
  delay(400);
  drone.fw(250);
  drone.ml(240);
  drone.setHeight(70);
  delay(500);
  mission_drop_ch1_ch4();
  drone.autoLand();

  close_all_ball_gate();
  delay(MISSION_CLOSE_WAIT_MS);
}

// =====================================================
// KEY_2: บินจากหลุม 1 ไปปล่อยหลุม 2 แล้วปล่อยช่อง 2 กับ 3 ลงจอด
// 1) เดินหน้า 480 cm → 2) ลดระดับลง → 3) ปล่อยลูกบอลช่อง 2,3 → 4) จอดที่จุดปล่อย
// =====================================================
void DroneMission_KEY_2_handle() {
  drone.calibration();
  delay(3000);

  drone.takeOff();
  delay(3000);
  drone.setHeight(130);
  delay(400);
  drone.fw(475);
  drone.setHeight(70);
  delay(500);
  mission_drop_ch2_ch3();

  drone.autoLand();
}

// =====================================================
// KEY_3: บินจากหลุม 2 ไปจอดที่จุดเริ่มต้น
// 1) เดินหน้า 250 cm → 2) ไปทางซ้าย 100 cm → 3) เพิ่มความสูงจากระดับพื้น → 4) ไปทางซ้าย 150 cm → 5) จอดที่จุดเริ่มต้น
// =====================================================
void DroneMission_KEY_3_handle() {
  drone.calibration();
  delay(3000);

  drone.takeOff();
  delay(3000);

  drone.moveForward(250);
  drone.moveLeft(120);

  drone.setHeight(HEIGHT_GROUND);
  delay(120);

  drone.ml(175);
  drone.autoLand();
}

// =====================================================
// KEY_4: บินจากแท่นไปจอดหน้าหลุมที่ 1 และลงจอด ยังไม่ปล่อยลูกบอล
// 1) เดินหน้า 250 cm → 2) ไปทางซ้าย 245 cm → 3) จอดหน้าหลุม 1 ด้านซ้าย → 4) ยังไม่ปล่อยลูกบอล
// =====================================================
void DroneMission_KEY_4_handle() {
  drone.calibration();
  delay(3000);

  drone.takeOff();
  delay(3000);

  drone.setHeight(HEIGHT_TAKEOFF);
  delay(250);
  drone.moveForward(250);
  drone.moveLeft(170);

  drone.autoLand();
}

// =====================================================
// KEY_5: บินขึ้นด้านข้างจากหลุมใด (1-4) เพื่อปล่อยลูกบอลโดยเดินหน้าไปเป็นระยะ 100 cm จากจุดปล่อย
// ปล่อยช่อง 1 กับ 4
// 1) เดินหน้า 100 cm → 2) ลดระดับลง → 3) ปล่อยลูกบอลช่อง 1,4 → 4) จอดที่จุดปล่อย
// =====================================================
void DroneMission_KEY_5_handle() {
  drone.calibration();
  delay(3000);

  drone.takeOff();
  delay(3000);

  drone.setHeight(HEIGHT_FLIGHT);
  delay(240);

  drone.fw(150);

  prepare_drop_height();

  mission_drop_ch1_ch4();

  drone.autoLand();
}

// =====================================================
// KEY_6: บินจากจุดเริ่มต้นไปปล่อยหลุม 2 ด้านขวา
// ปล่อยช่อง 2 กับ 3
// 1) เดินหน้า 250 cm → 2) ไปทางขวา 250 cm → 3) ลดระดับลง → 4) ปล่อยลูกบอลช่อง 2,3 → 5) จอดที่จุดปล่อยด้านขวา
// =====================================================
void DroneMission_KEY_6_handle() {
  // drone.calibration();
  // delay(3000);

  // drone.takeOff();
  // delay(3000);

  // drone.autoLand();
  drone.calibration();
  delay(3000);

  drone.takeOff();
  delay(3000);

  drone.setHeight(HEIGHT_FLIGHT);
  delay(250);
  drone.fw(150);

  prepare_drop_height();

  mission_drop_ch2_ch3();

  drone.autoLand();
}

// =====================================================
// KEY_7: บินจากจุดเริ่มต้นไปจอดหน้าหลุม 2 ด้านขวา ยังไม่ปล่อยลูกบอล
 // 1) เดินหน้า 250 cm → 2) ไปทางขวา 245 cm → 3) จอดหน้าหลุม 2 ด้านขวา → 4) ยังไม่ปล่อยลูกบอล
// =====================================================
void DroneMission_KEY_7_handle() {
  drone.calibration();
  delay(3000);

  drone.takeOff();
  delay(3500);

  drone.setHeight(HEIGHT_TAKEOFF);

  drone.moveForward(250);
  drone.moveLeft(150);

  drone.autoLand();
}

// =====================================================
// KEY_8: บินจากจุดปล่อยจากหลุม 1 ไปจอดที่จุดเริ่มต้น
// 1) เดินหน้า 250 cm → 2) ไปทางขวา 100 cm → 3) เพิ่มให้สูงจากพื้น → 4) ไปทางขวา 150 cm → 5) จอดที่จุดเริ่มต้น
// =====================================================
//   drone.calibration();
//   delay(3000);

//   drone.takeOff();
//   delay(3000);

//   drone.autoLand();
// }

void DroneMission_KEY_8_handle() {
  drone.calibration();
  delay(3000);

  drone.takeOff();
  delay(4000);

  drone.setHeight(HEIGHT_TAKEOFF);
  delay(250);

  drone.fw(256);
  drone.ml(264);

  drone.setHeight(HEIGHT_DROP);
  delay(500);
  drone.settle(380);
  mission_drop_ch1_ch4();

  // delay(250);
  pArduino->set_direction(5, 3);
  delay(700);

  drone.mr(474);
  drone.bw(8);
  // pArduino->set_direction(7, 1);
  // drone.posHold();
  // delay(500)
  // delay(500);
  
  drone.settle(350);
  mission_drop_ch2_ch3();

  pArduino->set_direction(5, 3);
  delay(500);
  drone.setHeight(120);
  delay(240);

  drone.ml(260);
  drone.bw(257);

  drone.autoLand();
}

// =====================================================
// KEY_9: บินจากจุดเริ่มต้นไปปล่อยหลุม 2 ขวา แล้วลงจอด
// ปล่อยช่อง 2 กับ 3
// 1) เดินหน้า 240 cm → 2) ไปทางขวา 250 cm → 3) ลดระดับลง → 4) ปล่อยลูกบอลช่อง 2,3 → 5) จอดที่จุดปล่อยด้านขวา
// =====================================================
void DroneMission_KEY_9_handle() {
  drone.takeOff();
  delay(3500);

  drone.moveForward(400);

  // drone.setHeight(HEIGHT_DROP);

  drone.autoLand();
}

void DroneMission_KEY_11_handle() {
  // KEY1_mode1();
  drone.calibration();
  delay(3000);

  drone.takeOff();
  delay(2500);
  drone.setHeight(120);
  drone.moveFastForward(500);
  drone.setHeight(70);
  delay(700);

  drone.autoLand();
}
// =====================================================
// KEY_12: บินจากจุดไหนก็ได้เพื่อบินไปจอดที่จุดเริ่มต้น จากขอบระยะ 250 cm
// 1) Calibrate 4 วินาที → 2) Take off → 3) เพิ่มระดับ HEIGHT_GROUND → 4) เดินหน้า 250 cm → 5) จอดที่จุดเริ่มต้น
// =====================================================
void DroneMission_KEY_12_handle() {
  drone.calibration();
  delay(4000);

  drone.takeOff();
  delay(2500);

  drone.setHeight(HEIGHT_GROUND);
  delay(120);

  drone.moveForward(250);

  drone.autoLand();
}

// =====================================================
// KEY_13: บินจากด้านข้างของจุดเริ่มต้นแล้วไปจอดที่จุดเริ่มต้น จากขอบระยะ 100 cm
// 1) Calibrate 4 วินาที → 2) Take off → 3) ลดระดับ HEIGHT_GROUND → 4) เดินหน้า 100 cm → 5) จอดที่จุดเริ่มต้น
// =====================================================
void DroneMission_KEY_13_handle() {

  drone.calibration();
  delay(4000);

  drone.takeOff();
  delay(2500);
  drone.moveFastLeft(0);

  // // drone.setHeight(HEIGHT_GROUND);
  // // delay(120);

  // // drone.moveForward(100);

  drone.autoLand();
  //   drone.calibration();
  // delay(3000);

  // drone.takeOff();
  // delay(4000);

  // delay(250);

  // // drone.moveBackward(255);
  // drone.fw(256);
  // // drone.moveForward(256);
  // // drone.moveLeft(258);
  // // pArduino->move_right_cm(10);

  // // prepare_drop_height();
  // // drone.setHeight(HEIGHT_DROP);
  // // delay(500);

  // // drone.settle(150);
  // mission_drop_ch1_ch4();

  // delay(250);
  // // drone.setYaw(, uint16_t angle)

  // // drone.moveRight(475);

  // drone.bw(8);
  // // pArduino->set_direction(7, 1);
  // // drone.posHold();
  // // delay(500)
  // // prepare_drop_height();
  // // drone.setHeight(40);
  // // delay(500);

  // drone.setHeight(120);

  // drone.ml(260);
  // // drone.moveLeft(275);
  // // drone.moveBackward(257);

  // drone.autoLand();

}

void DroneMission_KEY_14_handle() {
  drone.calibration();
  delay(3000);

  // drone.takeOff();
  // drone.setHeight(120);
  // // drone.mr(8);
  // // drone.mr(11);
  // // prepare_drop_height();
  // // mission_drop_ch1_ch4();

  // drone.autoLand();
}
// =====================================================
// setup / loop
// =====================================================
void setupDroneMissionMode() {
  // open_pair_ch2_ch3();
  pinMode(PORT3, OUTPUT);
  pinMode(PORT6, OUTPUT);
  // delay(MISSION_DROP_WAIT_MS);
  close_all_ball_gate();
  delay(MISSION_CLOSE_WAIT_MS);

}

void loopDroneMissionMode() {
  drone.onKey1(DroneMission_KEY_1_handle);
  drone.onKey2(DroneMission_KEY_2_handle);
  drone.onKey3(DroneMission_KEY_3_handle);
  drone.onKey4(DroneMission_KEY_4_handle);
  drone.onKey5(DroneMission_KEY_5_handle);
  drone.onKey6(DroneMission_KEY_6_handle);
  drone.onKey7(DroneMission_KEY_7_handle);
  drone.onKey8(DroneMission_KEY_8_handle);
  drone.onKey9(DroneMission_KEY_9_handle);
  drone.onKey10(KEY1_mode1);
  drone.onKey12(DroneMission_KEY_12_handle);
  drone.onKey13(DroneMission_KEY_13_handle);
  drone.onKey14(DroneMission_KEY_14_handle);
}
