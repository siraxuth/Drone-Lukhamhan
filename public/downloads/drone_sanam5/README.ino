/*
  README.ino
  คู่มือใช้งานโปรเจกต์นี้ใน Arduino IDE

  แนวคิด:
  - เขียน route ให้ง่ายขึ้นด้วย drone.*
  - เก็บ logic low-level เดิมไว้ใน protocol.*, Servo.ino, shooting.ino, poke_controls.ino
  - แยก mission ตามโหมด เพื่อเปิดแก้ง่ายใน Arduino IDE

  --------------------------------------------------
  1) วิธีเลือกโหมด
  --------------------------------------------------

  เปิดไฟล์ mode_config.hpp แล้วเลือกค่า ACTIVE_FLIGHT_MODE

    #define ACTIVE_FLIGHT_MODE FLIGHT_MODE_DRONE_MISSION

  โหมดที่มี:
  - FLIGHT_MODE_DRONE_MISSION
  - FLIGHT_MODE_AVIATION_MASTERY
  - FLIGHT_MODE_DRONE_INNOVATION_CHALLENGE

  ไฟล์โหมด:
  - Drone_Mission.ino
  - Aviation_Mastery.ino
  - Drone_Innovation_Challenge.ino

  --------------------------------------------------
  2) Syntax ที่ใช้บ่อย
  --------------------------------------------------

  เริ่มต้นภารกิจ:

    drone.calibration();
    drone.wait(3000);
    drone.takeOff();
    drone.wait(3000);

  เคลื่อนที่แบบอ่านง่าย:

    drone.fw(180);
    drone.bw(180);
    drone.ml(120);
    drone.mr(120);
    drone.sh(125);
    drone.settle(2000);

  แบบ raw:

    drone.moveForward(180);
    drone.moveBackward(180);
    drone.moveLeft(120);
    drone.moveRight(120);
    drone.holdHeight(125, 2);
    drone.direction(7, 1);

  แบบ time-based:

    drone.moveTimeDir(4, drone.mToCm(1.0f), MS_PER_CM_RIGHT, 2);

  ถ้าจะเรียก low-level เดิมตรง ๆ:

    drone.raw().set_yaw(1, 90);
    drone.raw().picture();

  --------------------------------------------------
  3) ตัวอย่าง mission แบบสั้น
  --------------------------------------------------

    void MyMission() {
      drone.calibration();
      drone.wait(3000);
      drone.takeOff();
      drone.wait(3000);
      drone.sh(125);
      drone.fw(180);
      drone.mr(90);
      drone.bw(120);
      drone.direction(7, 1);
      drone.wait(350);
      drone.autoLand();
    }

  ผูกกับรีโมต:

    void loopDroneMissionMode() {
      drone.onKey1(MyMission);
    }

  --------------------------------------------------
  4) Servo ปล่อยของ
  --------------------------------------------------

  คำสั่งที่ใช้บ่อย:

    drone.servoRelease(PORT3, 1000);
    drone.servoRelease(PORT6, 1900);
    drone.servoReleaseDual(PORT3, 1000, PORT6, 1000);
    drone.dropPayloadRound05(0);
    drone.dropPayloadRound10(1);
    drone.dropPayloadAll4();

  ค่าที่ใช้บ่อย:
  - 1900 = ปิด
  - 1000 = เปิดฝั่ง outer
  - 2550 = เปิดฝั่ง inner
  - 490  = เปิดสุดสำหรับปล่อยทั้งหมด

  วิธีจูน servo ปล่อยของ:
  1. ถ้าเปิดไม่สุด ให้ขยับ 1000 หรือ 2550 ทีละ 25-50
  2. ถ้าปิดไม่สนิท ให้จูน 1900 ทีละ 25-50
  3. ทดสอบทีละช่องก่อน แล้วค่อยทดสอบพร้อมกัน

  --------------------------------------------------
  5) Servo ยิงเป้า
  --------------------------------------------------

  ค่าจูนอยู่ใน config.hpp:

    S_CLOSE
    S_LEFT
    S_RIGHT

  ถ้ายิงไม่ตรง:
  1. ปรับ S_LEFT หรือ S_RIGHT ทีละน้อย
  2. ทดสอบใหม่
  3. อย่าปรับทีละเยอะ

  คำสั่งช่วยคุมความสูงก่อนยิง:

    drone.reachShootHeightStable();
    drone.reachShootHeightFast();

  --------------------------------------------------
  6) โครงสร้างไฟล์
  --------------------------------------------------

  ไฟล์หลัก:
  - ubon_ubu_new_2025_V1.ino

  wrapper ที่เขียนง่าย:
  - DroneEasy.hpp
  - DroneEasy.cpp

  โหมด:
  - Drone_Mission.ino
  - Aviation_Mastery.ino
  - Drone_Innovation_Challenge.ino

  low-level เดิม:
  - protocol.hpp
  - protocol.cpp
  - Servo.ino
  - shooting.ino
  - poke_controls.ino
  - config.hpp

  --------------------------------------------------
  7) แนวทางเวลาแก้โค้ด
  --------------------------------------------------

  ถ้าอยากแก้ route:
  - ไปที่ไฟล์โหมด เช่น Drone_Mission.ino

  ถ้าอยากแก้ค่าคงที่:
  - ไปที่ config.hpp

  ถ้าอยากแก้ protocol ล่าง:
  - ไปที่ protocol.hpp / protocol.cpp

  ถ้าอยากใช้คำสั่งให้ง่ายขึ้น:
  - เพิ่ม method ใน DroneEasy.hpp / DroneEasy.cpp

*/
