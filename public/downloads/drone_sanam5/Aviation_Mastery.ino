#include "DroneEasy.hpp"

// =====================================================================
//  โหมด Aviation Mastery — ผูกปุ่ม KEY1-4 จากรีโมท
//  ใช้ API สะอาดผ่าน object  drone.*  (เหมือน Drone_Mission.ino)
//  - drone.moveForward/Backward/Left/Right(cm, speed)
//  - drone.setHeight(cm) / takeOff() / autoLand() / calibration()
//  servoHold(), swipe_right_S1/S2() เป็นฟังก์ชันร่วมใน shooting.ino
// =====================================================================

// KEY_1: บินเก็บเป้าซ้าย→ยิง S2→ถอยยิง S1→กลับลงจอด
void AviationMastery_KEY_1_handle() {
  drone.calibration();
  drone.wait(2500);

  drone.takeOff();
  drone.wait(3000);
  drone.setHeight(120);
  drone.wait(1200);

  drone.moveForward(160, 2);  // เดิม move_forward_cm(160, ) — comma ลอย (syntax error)
  drone.setHeight(170);
  drone.wait(1200);
  drone.fw(100);
  drone.bw(15);
  drone.mr(35);
  drone.ml(295);
  drone.autoLand();
}

// KEY_2-4: ว่างไว้เขียนเพิ่ม
void AviationMastery_KEY_2_handle() {
  // drone.calibration();
  drone.takeOff();
  drone.wait(3000);
  drone.setHeight(170);
  drone.wait(1200);
  drone.fw(510);
  drone.autoLand();
}

void AviationMastery_KEY_3_handle() {
  drone.takeOff();
  drone.wait(3000);
  drone.setHeight(120);
  drone.wait(1200);
  drone.fw(175);
  drone.ml(268);
  drone.fw(85);
  drone.autoLand();
}

void AviationMastery_KEY_4_handle() {
  drone.takeOff();
  drone.wait(3000);
  drone.setHeight(120);
  drone.wait(1200);

  drone.moveForward(160, 2);  // เดิม move_forward_cm(160, ) — comma ลอย (syntax error)
  drone.setHeight(170);
  drone.wait(1200);
  drone.fw(100);
  drone.bw(15);
  drone.mr(35);
  drone.ml(110);
  drone.bw(175);
  drone.mr(70);
  drone.setHeight(120);
  drone.wait(1200);
  drone.bw(95);
  drone.autoLand();
}

void setupAviationMasteryMode() {
}

void loopAviationMasteryMode() {
  drone.onKey1(AviationMastery_KEY_1_handle);
  drone.onKey2(AviationMastery_KEY_2_handle);
  drone.onKey3(AviationMastery_KEY_3_handle);
  drone.onKey4(AviationMastery_KEY_4_handle);
}
