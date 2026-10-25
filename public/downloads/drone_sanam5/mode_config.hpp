#pragma once
// =====================================================================
//  เลือกโหมดบิน — แก้ที่เดียว บรรทัดเดียว (ตรง ACTIVE_FLIGHT_MODE ด้านล่าง)
// =====================================================================
//  วิธีใช้: เปลี่ยนค่า ACTIVE_FLIGHT_MODE ให้เป็น 1 ตัวจากรายการ แล้ว Upload ใหม่
//          โหมดที่เลือกจะรัน setup()/loop() ของตัวเองอัตโนมัติ
//
//  รายการโหมด:
//    FLIGHT_MODE_DRONE_MISSION              ภารกิจหลัก ปล่อยบอล/เจาะ/ยิง (KEY1-13)
//                                           โค้ดอยู่ใน  Drone_Mission.ino
//    FLIGHT_MODE_AVIATION_MASTERY           ชุดบินสนาม Aviation Mastery (KEY1-4)
//                                           โค้ดอยู่ใน  Aviation_Mastery.ino
//    FLIGHT_MODE_DRONE_INNOVATION_CHALLENGE โหมดว่างไว้เขียนเพิ่ม (KEY1-4)
//                                           โค้ดอยู่ใน  Drone_Innovation_Challenge.ino
// =====================================================================

#define FLIGHT_MODE_DRONE_MISSION              1
#define FLIGHT_MODE_AVIATION_MASTERY           2
#define FLIGHT_MODE_DRONE_INNOVATION_CHALLENGE 3


// ┌─────────────────────────────────────────────────────────────────┐
// │  ▼▼▼  แก้โหมดบินตรงนี้ที่เดียว  ▼▼▼                                     │
#define ACTIVE_FLIGHT_MODE   FLIGHT_MODE_DRONE_MISSION
// │  ▲▲▲  แก้โหมดบินตรงนี้ที่เดียว  ▲▲▲                                    │
// └─────────────────────────────────────────────────────────────────┘
