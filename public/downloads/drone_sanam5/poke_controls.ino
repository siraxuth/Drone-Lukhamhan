#include "protocol.hpp"
#include "config.hpp"

uint16_t read_height_cm() {
  return pArduino->get_height_cm();
}

static inline void needle_poke(uint16_t approachFast, uint16_t approachSlow, uint16_t retreatBack) {
  if (approachFast > 0)  pArduino->move_forward_cm(approachFast, 2);
  if (approachSlow > 0)  pArduino->move_forward_cm(approachSlow, 1);
  if (retreatBack > 0)   pArduino->move_backward_cm(retreatBack, 2);
}

static inline void set_height_drop_stable() {
  pArduino->set_height(HEIGHT_DROP);
  delay(120);
  pArduino->set_height(HEIGHT_DROP);
  hold_now(250);
}

void advance_and_poke_straight(uint16_t deltaFromHere,
                                             uint8_t micro_bias_cm,
                                             bool relock_height) {
  if (deltaFromHere > PRE_STOP_CM) {
    pArduino->move_forward_cm(deltaFromHere - PRE_STOP_CM, 2);
  }

  uint16_t h = read_height_cm();
  if (h >= ALT_GUARD_MIN_CM) {
    set_height_drop_stable();
  } else {
    delay(80);
  }

  if (micro_bias_cm > 0) {
    pArduino->move_forward_cm(micro_bias_cm, 1);
  }

  needle_poke(POKE_FAST_CM, POKE_SLOW_CM, POKE_RETREAT_CM);

  if (relock_height) {
    h = read_height_cm();
    if (h >= ALT_GUARD_MIN_CM) {
      pArduino->set_height(HEIGHT_DROP);
      delay(70);
    }
  }
}

static inline void auto_land_safe() {
  constexpr uint16_t LAND_H_CM = 10;
  constexpr uint16_t STABLE_MS = 700;
  constexpr uint16_t MIN_DESC_MS = 1800;
  constexpr uint16_t TIMEOUT_MS = 9000;

  pArduino->auto_land();

  uint32_t t0 = millis(), tStable = 0;
  while (millis() - t0 < TIMEOUT_MS) {
    pArduino->poll();
    uint16_t h = read_height_cm();

    if (millis() - t0 < MIN_DESC_MS) { delay(25); continue; }

    if (h > 0 && h < LAND_H_CM) {
      if (tStable == 0) tStable = millis();
      if (millis() - tStable >= STABLE_MS) break;
    } else {
      tStable = 0;
    }
    delay(25);
  }

  pArduino->set_direction(7, 2);
  for (int m = 0; m < 8; ++m) pArduino->motor(m, 0);
  for (uint8_t i = 0; i < 4; ++i) { pArduino->stop_motor(); delay(80); }
}

void advance_and_poke_k6(uint16_t deltaFromHere,
                                       uint8_t micro_bias_cm,
                                       bool   relock_height) {
  if (deltaFromHere > PRE_STOP_K6) {
    pArduino->move_forward_cm(deltaFromHere - PRE_STOP_K6, 2);
  }

  uint16_t h = read_height_cm();
  if (h >= ALT_GUARD_MIN_CM) {
    set_height_drop_stable();
  } else {
    delay(80);
  }

  if (micro_bias_cm > 0) {
    pArduino->move_forward_cm(micro_bias_cm, 1);
  }

  needle_poke(POKE_FAST_K6, POKE_SLOW_K6, POKE_RETREAT_K6);

  if (relock_height) {
    h = read_height_cm();
    if (h >= ALT_GUARD_MIN_CM) {
      pArduino->set_height(HEIGHT_DROP);
      delay(70);
    }
  }
}

bool goto_height_smooth(uint16_t target,
                        uint8_t  stepUp,
                        uint8_t  stepDown,
                        uint8_t  tol,
                        uint16_t stable_ms,
                        uint16_t timeout_ms,
                        uint16_t tick_ms,
                        uint8_t  hold_speed)
{
  pArduino->poshold(hold_speed);
  delay(80);

  uint32_t t0 = millis();
  uint32_t stableSince = 0;

  pArduino->poll();
  uint16_t h = read_height_cm();

  if (h == 0 || h > 300) {
    static uint16_t est = HEIGHT_TAKEOFF;
    int16_t cur = (int16_t)est;
    int16_t tar = (int16_t)target;

    while (millis() - t0 < timeout_ms && cur != tar) {
      int16_t diff = tar - cur;
      int16_t step = (diff > 0) ? stepUp : -stepDown;
      if (abs(diff) < abs(step)) step = diff;

      cur += step;
      pArduino->set_height((uint16_t)cur);
      pArduino->poshold(hold_speed);
      delay(tick_ms);
    }
    est = target;
    pArduino->set_height(target);
    pArduino->poshold(hold_speed);
    delay(60);
    return true;
  }

  uint16_t lastCmd = h;

  while (millis() - t0 < timeout_ms) {
    pArduino->poll();
    h = read_height_cm();
    if (h == 0 || h > 300) { stableSince = 0; delay(tick_ms); continue; }

    int16_t diff = (int16_t)target - (int16_t)h;

    if (abs(diff) <= tol) {
      if (stableSince == 0) stableSince = millis();
      if (millis() - stableSince >= stable_ms) break;
    } else {
      stableSince = 0;

      int16_t cmd = (int16_t)lastCmd + ((diff > 0) ? stepUp : -stepDown);
      if ((diff > 0 && cmd > (int16_t)target) || (diff < 0 && cmd < (int16_t)target)) cmd = target;

      lastCmd = (uint16_t)cmd;
      pArduino->set_height(lastCmd);
    }

    pArduino->poshold(hold_speed);
    delay(tick_ms);
  }

  pArduino->set_height(target);
  pArduino->poshold(hold_speed);
  delay(80);
  return true;
}
