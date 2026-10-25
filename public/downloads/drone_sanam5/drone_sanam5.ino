#include "DroneEasy.hpp"
#include "config.hpp"
#include "mode_config.hpp"
#include "poke_controls.h"
#include "protocol.hpp"

// =====================================================================
//  ตัวกระจายโหมด (Mode dispatcher)
//  - เลือกโหมดได้ที่ mode_config.hpp (แก้ ACTIVE_FLIGHT_MODE ที่เดียว)
//  - ตรงนี้แค่ map "โหมดที่เลือก" → ชื่อฟังก์ชัน setup/loop ของโหมดนั้น
//    โดยตั้งชื่อกลางเป็น MODE_SETUP / MODE_LOOP เพื่อไม่ต้องเขียน #if ซ้ำ
//    หลายที่ (กันลืมแก้ทีละจุดแล้วโหมดเพี้ยน)
//  - ถ้า ACTIVE_FLIGHT_MODE ตั้งผิด จะ #error ตอน compile ทันที (ไม่เงียบ)
// =====================================================================
#if  ACTIVE_FLIGHT_MODE == FLIGHT_MODE_DRONE_MISSION
  #define MODE_SETUP  setupDroneMissionMode
  #define MODE_LOOP   loopDroneMissionMode
#elif ACTIVE_FLIGHT_MODE == FLIGHT_MODE_AVIATION_MASTERY
  #define MODE_SETUP  setupAviationMasteryMode
  #define MODE_LOOP   loopAviationMasteryMode
#elif ACTIVE_FLIGHT_MODE == FLIGHT_MODE_DRONE_INNOVATION_CHALLENGE
  #define MODE_SETUP  setupDroneInnovationChallengeMode
  #define MODE_LOOP   loopDroneInnovationChallengeMode
#else
  #error "ACTIVE_FLIGHT_MODE ตั้งค่าไม่ถูก — เปิด mode_config.hpp แล้วตั้งเป็น FLIGHT_MODE_* ตัวใดตัวหนึ่ง"
#endif

void setup() {
  drone.beginDefault();   // เริ่มระบบ + I2C กับ Flight Controller (ทุกโหมดใช้ร่วมกัน)
  MODE_SETUP();           // setup เฉพาะของโหมดที่เลือก
}

void loop() {
  MODE_LOOP();            // loop เฉพาะของโหมดที่เลือก (คอยอ่านปุ่มจากรีโมท)
}
