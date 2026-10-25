static inline int clampPulse(int us) {
  const int MIN_US = 600, MAX_US = 2400;
  return us < MIN_US ? MIN_US : (us > MAX_US ? MAX_US : us);
}

static inline void servoPulse50Hz(int pin, int pulse_us) {
  pulse_us = clampPulse(pulse_us);
  noInterrupts();
  digitalWrite(pin, HIGH);
  delayMicroseconds(pulse_us);
  digitalWrite(pin, LOW);
  interrupts();
  delayMicroseconds(20000 - pulse_us);
}

static inline void servoHold(int pin, int pulse_us, uint16_t hold_ms) {
  const uint32_t t0 = millis();
  while (millis() - t0 < hold_ms) servoPulse50Hz(pin, pulse_us);
}

static void swipe_left_S1() {
  servoHold(SHOOT1_PIN, S_LEFT, FIRE_HOLD_MS);
  servoHold(SHOOT1_PIN, S_CLOSE, RESET_HOLD_MS);
  delay(POST_DELAY_MS);
}

static void swipe_right_S1() {
  servoHold(SHOOT1_PIN, S_RIGHT, FIRE_HOLD_MS);
  servoHold(SHOOT1_PIN, S_CLOSE, RESET_HOLD_MS);
  delay(POST_DELAY_MS);
}

static void swipe_left_S2() {
  servoHold(SHOOT2_PIN, S_LEFT, FIRE_HOLD_MS);
  servoHold(SHOOT2_PIN, S_CLOSE, RESET_HOLD_MS);
  delay(POST_DELAY_MS);
}

static void swipe_right_S2() {
  servoHold(SHOOT2_PIN, S_RIGHT, FIRE_HOLD_MS);
  servoHold(SHOOT2_PIN, S_CLOSE, RESET_HOLD_MS);
  delay(POST_DELAY_MS);
}

void ensure_shoot_height() {
  pArduino->set_height(HEIGHT_SHOOT);
  delay(200);

  uint16_t current_h = read_height_cm();

  if (current_h < (HEIGHT_SHOOT - 10) || current_h > (HEIGHT_SHOOT + 10)) {
      pArduino->set_height(HEIGHT_SHOOT);
      delay(500);
      hold_now(300);
  } else {
      hold_now(400);
  }
}

void reach_height_shoot_stable() {
  constexpr uint16_t TARGET = HEIGHT_SHOOT;
  constexpr uint8_t  TOL    = 4;
  constexpr uint16_t MAX_WAIT_MS   = 3500;
  constexpr uint16_t SAMPLE_DELAY  = 80;
  constexpr uint16_t STABLE_NEED_MS = 500;

  pArduino->set_direction(7, 2);
  delay(150);

  uint32_t t0 = millis();
  uint32_t stableSince = 0;

  while (millis() - t0 < MAX_WAIT_MS) {
    pArduino->set_height(TARGET);
    delay(SAMPLE_DELAY);

    pArduino->poll();
    uint16_t h = read_height_cm();

    if (h == 0 || h > 300) {
      stableSince = 0;
      continue;
    }

    int diff = (int)h - (int)TARGET;
    if (abs(diff) <= TOL) {
      if (stableSince == 0) stableSince = millis();
      if (millis() - stableSince >= STABLE_NEED_MS) {
        break;
      }
    } else {
      stableSince = 0;
    }
  }

  pArduino->set_direction(7, 2);
  delay(120);
}

void reach_height_shoot_fastb() {
  constexpr uint16_t TARGET = 127;
  constexpr uint8_t  TOL    = 6;
  constexpr uint16_t MAX_WAIT_MS   = 2000;
  constexpr uint16_t SAMPLE_DELAY  = 40;
  constexpr uint16_t STABLE_NEED_MS = 350;

  pArduino->set_direction(7, 2);

  uint32_t t0 = millis();
  uint32_t stableSince = 0;

  while (millis() - t0 < MAX_WAIT_MS) {
    pArduino->set_height(TARGET);
    delay(SAMPLE_DELAY);

    pArduino->poll();
    uint16_t h = read_height_cm();

    if (h == 0 || h > 250) { stableSince = 0; continue; }

    int diff = (int)h - (int)TARGET;
    if (abs(diff) <= TOL) {
      if (stableSince == 0) stableSince = millis();
      if (millis() - stableSince >= STABLE_NEED_MS) {
        break;
      }
    } else {
      stableSince = 0;
    }
  }
  pArduino->set_direction(7, 2);
  delay(50);
}

void reach_height_shoot_fast() {
  constexpr uint16_t TARGET = 125;
  constexpr uint8_t  TOL    = 6;
  constexpr uint16_t MAX_WAIT_MS   = 2000;
  constexpr uint16_t SAMPLE_DELAY  = 40;
  constexpr uint16_t STABLE_NEED_MS = 350;

  pArduino->set_direction(7, 2);

  uint32_t t0 = millis();
  uint32_t stableSince = 0;

  while (millis() - t0 < MAX_WAIT_MS) {
    pArduino->set_height(TARGET);
    delay(SAMPLE_DELAY);

    pArduino->poll();
    uint16_t h = read_height_cm();

    if (h == 0 || h > 250) { stableSince = 0; continue; }

    int diff = (int)h - (int)TARGET;
    if (abs(diff) <= TOL) {
      if (stableSince == 0) stableSince = millis();
      if (millis() - stableSince >= STABLE_NEED_MS) {
        break;
      }
    } else {
      stableSince = 0;
    }
  }
  pArduino->set_direction(7, 2);
  delay(50);
}

void reach_height_shoot_fast2() {
  constexpr uint16_t TARGET = HEIGHT_SHOOT;

  pArduino->set_direction(7, 2);
  pArduino->set_height(TARGET);
  delay(700);
  pArduino->set_direction(7, 2);
  delay(80);
}
