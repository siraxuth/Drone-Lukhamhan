#include "DroneEasy.hpp"

void DroneInnovationChallenge_KEY_1_handle() {
  drone.calibrateAndDelay(2500);
  drone.takeOff();
  drone.wait(3000);
  drone.setHeight(120);
  drone.wait(800);
  drone.moveLeft(250);

  drone.moveForward(150);
  drone.holdHeight(132);
  drone.wait(700);  // รอ setHeight นิ่งๆ
  drone.setHeight(135);
  drone.wait(1500);                            // รอ setHeight นิ่งๆ
  drone.servoAngle(SHOOT1_PIN, S_LEFT_ANGLE);  // เปลี่ยนองศากับพอร์ตที่ยิงด้วย ใช้ด้านหน้ายิง ฉันจำไม่ได้ดอก

  drone.moveBackward(250);
  drone.holdHeight(132);  //  ปิดได้และถ้าไม่ใช้
  drone.wait(700);        // รอ setHeight นิ่งๆ // นี้ก็เหมือนกัน
  drone.setHeight(135);
  drone.wait(1500);                             // รอ setHeight นิ่งๆ
  drone.servoAngle(SHOOT2_PIN, S_RIGHT_ANGLE);  // เปลี่ยนองศากับพอร์ตที่ยิงด้วย ใช้ด้านหลังยิง ฉันจำไม่ได้ดอก

  drone.fw(100);
  drone.mr(250);
  drone.autoLand();
  drone.servoAngleDual(SHOOT1_PIN, S_CLOSE_ANGLE, SHOOT2_PIN, S_CLOSE_ANGLE);
}

void DroneInnovationChallenge_KEY_2_handle() {
  drone.takeOff();
  drone.wait(3000);
  drone.setHeight(120);
  drone.wait(800);
  drone.moveRight(250);

  drone.moveForward(150);
  drone.holdHeight(132);
  drone.wait(700);  // รอ setHeight นิ่งๆ
  drone.setHeight(135);
  drone.wait(1500);                            // รอ setHeight นิ่งๆ
  drone.servoAngle(SHOOT1_PIN, S_LEFT_ANGLE);  // เปลี่ยนองศากับพอร์ตที่ยิงด้วย ใช้ด้านหน้ายิง ฉันจำไม่ได้ดอก

  drone.moveBackward(250);
  drone.holdHeight(132);  //  ปิดได้และถ้าไม่ใช้
  drone.wait(700);        // รอ setHeight นิ่งๆ // นี้ก็เหมือนกัน
  drone.setHeight(135);
  drone.wait(1500);                             // รอ setHeight นิ่งๆ
  drone.servoAngle(SHOOT2_PIN, S_RIGHT_ANGLE);  // เปลี่ยนองศากับพอร์ตที่ยิงด้วย ใช้ด้านหลังยิง ฉันจำไม่ได้ดอก

  drone.fw(100);
  drone.ml(250);
  drone.autoLand();
  drone.servoAngleDual(SHOOT1_PIN, S_CLOSE_ANGLE, SHOOT2_PIN, S_CLOSE_ANGLE);
}

void DroneInnovationChallenge_KEY_3_handle() {
  // กรณีอยู่จะยิงพร้อมกัน ฝั่งขวา
  drone.takeOff();
  drone.wait(3000);
  drone.setHeight(120);
  drone.wait(800);
  drone.moveRight(250);

  drone.holdHeight(150);
  drone.wait(700);  // รอ setHeight นิ่งๆ
  drone.setHeight(152);
  drone.wait(1500);  // รอ setHeight นิ่งๆ
  drone.servoAngleDual(SHOOT1_PIN, S_LEFT_ANGLE, SHOOT2_PIN, S_RIGHT_ANGLE);

  drone.ml(250);
  drone.autoLand();
  drone.servoAngleDual(SHOOT1_PIN, S_CLOSE_ANGLE, SHOOT2_PIN, S_CLOSE_ANGLE);
}

void DroneInnovationChallenge_KEY_4_handle() {
  // กรณีอยู่จะยิงพร้อมกัน ฝั่งซ้าย
  drone.takeOff();
  drone.wait(3000);
  drone.setHeight(120);
  drone.wait(800);
  drone.ml(250);

  drone.holdHeight(150);
  drone.wait(700);  // รอ setHeight นิ่งๆ
  drone.setHeight(152);
  drone.wait(1500);  // รอ setHeight นิ่งๆ
  drone.servoAngleDual(SHOOT1_PIN, S_LEFT_ANGLE, SHOOT2_PIN, S_RIGHT_ANGLE);

  drone.mr(250);
  drone.autoLand();
  drone.servoAngleDual(SHOOT1_PIN, S_CLOSE_ANGLE, SHOOT2_PIN, S_CLOSE_ANGLE);
}

void DroneInnovationChallenge_KEY_5_handle() {
  drone.takeOff();
  drone.wait(3000);
  drone.setHeight(120);
  drone.wait(800);
  drone.moveLeft(250);

  drone.moveForward(150);
  drone.holdHeight(132);
  drone.wait(700);  // รอ setHeight นิ่งๆ
  drone.setHeight(135);
  drone.wait(1500);                            // รอ setHeight นิ่งๆ
  drone.servoAngle(SHOOT1_PIN, S_LEFT_ANGLE);  // เปลี่ยนองศากับพอร์ตที่ยิงด้วย ใช้ด้านหน้ายิง ฉันจำไม่ได้ดอก

  drone.moveBackward(150);
  // drone.setHeight(135);

  // drone.fw(150);
  drone.mr(250);
  drone.autoLand();
  drone.servoAngleDual(SHOOT1_PIN, S_CLOSE_ANGLE, SHOOT2_PIN, S_CLOSE_ANGLE);
}

void DroneInnovationChallenge_KEY_6_handle() {
  drone.takeOff();
  drone.wait(3000);
  drone.setHeight(120);
  drone.wait(800);
  drone.mr(250);

  drone.moveForward(150);
  drone.holdHeight(132);
  drone.wait(700);  // รอ setHeight นิ่งๆ
  drone.setHeight(135);
  drone.wait(1500);                            // รอ setHeight นิ่งๆ
  drone.servoAngle(SHOOT1_PIN, S_LEFT_ANGLE);  // เปลี่ยนองศากับพอร์ตที่ยิงด้วย ใช้ด้านหน้ายิง ฉันจำไม่ได้ดอก

  drone.moveBackward(150);
  // drone.setHeight(135);

  // drone.fw(150);
  drone.ml(250);
  drone.autoLand();
  drone.servoAngleDual(SHOOT1_PIN, S_CLOSE_ANGLE, SHOOT2_PIN, S_CLOSE_ANGLE);
}

void setupDroneInnovationChallengeMode() {
  // close_all_ball_gate();
  drone.servoAngle(SHOOT1_PIN, S_CLOSE_ANGLE);
  drone.servoAngle(SHOOT2_PIN, S_CLOSE_ANGLE);
}

void loopDroneInnovationChallengeMode() {
  drone.onKey1(DroneInnovationChallenge_KEY_1_handle);
  drone.onKey2(DroneInnovationChallenge_KEY_2_handle);
  drone.onKey3(DroneInnovationChallenge_KEY_3_handle);
  drone.onKey4(DroneInnovationChallenge_KEY_4_handle);
  
  drone.onKey6(DroneInnovationChallenge_KEY_6_handle);
}
