#pragma once

#include <Arduino.h>

#define SHOOT1_PIN PORT4
#define SHOOT2_PIN PORT5

constexpr uint16_t HEIGHT_FLIGHT   = 100;
constexpr uint16_t HEIGHT_TAKEOFF  = 110;
constexpr uint16_t HEIGHT_GROUND   = 100;
constexpr uint16_t HEIGHT_DROP     = 45;
constexpr uint16_t HEIGHT_K5       = 170;
constexpr uint16_t HEIGHT_SHOOT    = 120;
constexpr uint16_t Forward_cm      = 275;

constexpr uint16_t PRE_STOP_CM     = 20;
constexpr uint16_t POKE_FAST_CM    = 14;
constexpr uint16_t POKE_SLOW_CM    = 6;
constexpr uint16_t POKE_RETREAT_CM = 14;

constexpr uint16_t PRE_STOP_K6     = 20;
constexpr uint16_t POKE_FAST_K6    = 10;
constexpr uint16_t POKE_SLOW_K6    = 10;
constexpr uint16_t POKE_RETREAT_K6 = 14;

constexpr uint16_t ALT_GUARD_MIN_CM   = 70;
constexpr uint16_t PILLAR_MICRO_SHIFT = 8;
constexpr uint16_t PED_ALERT_CM       = 30;
constexpr uint16_t BUMP_UP_CM         = 10;

static inline void hold_now(uint16_t ms = 250){
  pArduino->set_direction(7,2);
  delay(ms);
}

static inline unsigned long ms_round(float x){ return (unsigned long)(x + 0.5f); }

// constexpr float MS_PER_CM_FWD       = 16.39f;
constexpr float MS_PER_CM_FWD       = 15.46f;
constexpr float MS_PER_CM_BACK      = 15.16f;
constexpr float MS_PER_CM_LEFT      = 15.65f;
constexpr float MS_PER_CM_RIGHT     = 15.65f;

constexpr float MS_PER_CM_FWD_FAST  = 11.89f;
constexpr float MS_PER_CM_BACK_FAST = 11.89f;
constexpr float MS_PER_CM_LEFT_FAST = 11.89f;
constexpr float MS_PER_CM_RIGHT_FAST= 11.89f;

const int S_CLOSE = 1500;
const int S_LEFT = 1200;
const int S_RIGHT = 2000;

const int S_CLOSE_ANGLE = 88;
const int S_LEFT_ANGLE = 62;
const int S_RIGHT_ANGLE = 132;

const uint16_t PRE_HOLD_MS = 60;
const uint16_t FIRE_HOLD_MS = 220;
const uint16_t RESET_HOLD_MS = 150;
const uint16_t POST_DELAY_MS = 60;

static const uint16_t YAW_MS_PER_DEG = 42;
static const uint16_t YAW_EXTRA_MS   = 120;
static const uint16_t YAW_SETTLE_MS  = 220;
static const uint8_t  YAW_TRIM_DEG   = 4;

static inline void yaw_block(uint8_t dir, uint16_t deg){
  pArduino->set_yaw(dir, deg);
  delay((uint32_t)deg * YAW_MS_PER_DEG + YAW_EXTRA_MS);
}

static inline void yaw_soft_stop(bool to_right, uint16_t deg, uint8_t trim_deg = YAW_TRIM_DEG){
  const uint8_t DIR  = to_right ? 1 : 2;
  const uint8_t ANTI = to_right ? 2 : 1;
  const uint16_t a = (deg * 7) / 10;
  const uint16_t b = deg - a;

  yaw_block(DIR, a);
  pArduino->set_direction(7, 3); delay(YAW_SETTLE_MS);

  yaw_block(DIR, b);
  pArduino->set_direction(7, 3); delay(YAW_SETTLE_MS / 2);

  if (trim_deg){
    yaw_block(ANTI, trim_deg);
    pArduino->set_direction(7, 3); delay(YAW_SETTLE_MS);
  }
}

static inline void smart_yaw(int16_t angle_deg){
  const bool to_right = (angle_deg >= 0);
  yaw_soft_stop(to_right, (uint16_t)abs(angle_deg), YAW_TRIM_DEG);
}
