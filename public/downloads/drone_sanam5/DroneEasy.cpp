#include "DroneEasy.hpp"

#include "config.hpp"

DroneEasy drone;

void DroneEasy::beginDefault() const {
  Serial.begin(9600);
  pinMode(PORT1, OUTPUT);
  pinMode(PORT3, OUTPUT);
  pinMode(PORT4, OUTPUT);
  pinMode(PORT6, OUTPUT);
  pinMode(PORT5, OUTPUT);

}

void DroneEasy::wait(unsigned long ms) const { delay(ms); }
void DroneEasy::calibration() const { pArduino->calibration(); }
void DroneEasy::calibrateAndDelay(unsigned long ms) const { pArduino->calibrateAndDelay(ms); }
void DroneEasy::takeOff() const { pArduino->take_off(); }
void DroneEasy::autoLand() const { pArduino->auto_land(); }
void DroneEasy::stopMotor() const { pArduino->stop_motor(); }
void DroneEasy::poll() const { pArduino->poll(); }

void DroneEasy::settle(uint16_t ms) const {
  pArduino->set_direction(7, 1);
  delay(ms);
}

void DroneEasy::fw(int cm) const { pArduino->move_forward_cm(cm); settle(400); }
void DroneEasy::bw(int cm) const { pArduino->move_backward_cm(cm); settle(400); }
void DroneEasy::ml(int cm) const { pArduino->move_left_cm(cm); settle(400); }
void DroneEasy::mr(int cm) const { pArduino->move_right_cm(cm); settle(400); }

void DroneEasy::sh(int z) const {
  pArduino->set_height(z);
  delay(400);
}
void DroneEasy::up(int16_t speed, int16_t time) const {
    pArduino->set_direction(5, speed);
    delay(time);
}

void DroneEasy::down(int16_t speed, int16_t time) const {
    pArduino->set_direction(6, speed);
    delay(time);
}
void DroneEasy::moveForward(int cm, uint8_t speed) const { pArduino->move_forward_cm(cm, speed); }
void DroneEasy::moveBackward(int cm, uint8_t speed) const { pArduino->move_backward_cm(cm, speed); }
void DroneEasy::moveLeft(int cm, uint8_t speed) const { pArduino->move_left_cm(cm, speed); }
void DroneEasy::moveRight(int cm, uint8_t speed) const { pArduino->move_right_cm(cm, speed); }
void DroneEasy::moveFastForward(int cm, uint8_t speed) const { pArduino->move_forward_fast(cm, speed); }
void DroneEasy::moveFastBackward(int cm, uint8_t speed) const { pArduino->move_backward_fast(cm, speed); }
void DroneEasy::moveFastLeft(int cm, uint8_t speed) const { pArduino->move_left_fast(cm, speed); }
void DroneEasy::moveFastRight(int cm, uint8_t speed) const { pArduino->move_right_fast(cm, speed); }
void DroneEasy::setHeight(int z) const { pArduino->set_height(z); }
void DroneEasy::holdHeight(uint16_t height, uint8_t speed) const { pArduino->poshold_heights(height, speed); }
void DroneEasy::smoothSetHeight(uint16_t target, uint16_t step, uint16_t delay_ms) const { pArduino->smooth_set_height(target, step, delay_ms); }
void DroneEasy::direction(uint8_t dir, uint8_t speed) const { pArduino->set_direction(dir, speed); }
void DroneEasy::posHold(uint8_t speed) const { pArduino->poshold(speed); }

void DroneEasy::rotate() const { pArduino->rotate(); }
void DroneEasy::flip() const { pArduino->flip(); }
void DroneEasy::circle360() const { pArduino->circle_360(); }
void DroneEasy::jump() const { pArduino->jump(); }
void DroneEasy::jumpEnd() const { pArduino->jump_end(); }
void DroneEasy::picture() const { pArduino->picture(); }
void DroneEasy::videoBegin() const { pArduino->video_begin(); }
void DroneEasy::videoEnd() const { pArduino->video_end(); }
void DroneEasy::motor(uint8_t num, uint8_t speed) const { pArduino->motor(num, speed); }
void DroneEasy::setPos(int16_t x, int16_t y) const { pArduino->set_pos(x, y); }
void DroneEasy::setYaw(uint8_t rotate, uint16_t angle) const { pArduino->set_yaw(rotate, angle); }

uint16_t DroneEasy::mToCm(float m) {
  return (uint16_t)(m * 100.0f + 0.5f);
}

void DroneEasy::moveTimeDir(uint8_t dir, uint16_t cm, float ms_per_cm, uint8_t speed) const {
  pArduino->set_direction(dir, speed);
  delay(cm * ms_per_cm);
  pArduino->set_direction(7, 1);
  delay(220);
}

void DroneEasy::servoRelease(uint8_t pin, int pulseWidth) const { release_servo_angle(pin, pulseWidth); }
void DroneEasy::servoReleaseDual(uint8_t pin1, int pulse1, uint8_t pin2, int pulse2) const { release_dual_servo_angle(pin1, pulse1, pin2, pulse2); }
int DroneEasy::servoPulseFromAngle(int angle) const { return servo_degree_to_pulse(angle); }
int DroneEasy::servoPulseFromAngleCustom(int angle, int pulse_min, int pulse_max) const { return servo_degree_to_pulse_custom(angle, pulse_min, pulse_max); }
void DroneEasy::servoAngle(uint8_t pin, int angle) const { release_servo_degree(pin, angle); }
void DroneEasy::servoAngleCustom(uint8_t pin, int angle, int pulse_min, int pulse_max) const { release_servo_degree_custom(pin, angle, pulse_min, pulse_max); }
void DroneEasy::servoAngleDual(uint8_t pin1, int angle1, uint8_t pin2, int angle2) const { release_dual_servo_degree(pin1, angle1, pin2, angle2); }
void DroneEasy::servoAngleDualCustom(uint8_t pin1, int angle1, int min1, int max1,
                                     uint8_t pin2, int angle2, int min2, int max2) const {
  release_dual_servo_degree_custom(pin1, angle1, min1, max1, pin2, angle2, min2, max2);
}

int DroneEasy::clampPulse(int us) const {
  const int MIN_US = 600, MAX_US = 2400;
  return us < MIN_US ? MIN_US : (us > MAX_US ? MAX_US : us);
}

void DroneEasy::servoPulse50Hz(int pin, int pulse_us) const {
  pulse_us = clampPulse(pulse_us);
  noInterrupts();
  digitalWrite(pin, HIGH);
  delayMicroseconds(pulse_us);
  digitalWrite(pin, LOW);
  interrupts();
  delayMicroseconds(20000 - pulse_us);
}

void DroneEasy::servoHold(int pin, int pulse_us, uint16_t hold_ms) const {
  const uint32_t t0 = millis();
  while (millis() - t0 < hold_ms) servoPulse50Hz(pin, pulse_us);
}

void DroneEasy::swipeLeftS1() const {
  servoHold(SHOOT1_PIN, S_LEFT, FIRE_HOLD_MS);
  servoHold(SHOOT1_PIN, S_CLOSE, RESET_HOLD_MS);
  delay(POST_DELAY_MS);
}

void DroneEasy::swipeRightS1() const {
  servoHold(SHOOT1_PIN, S_RIGHT, FIRE_HOLD_MS);
  servoHold(SHOOT1_PIN, S_CLOSE, RESET_HOLD_MS);
  delay(POST_DELAY_MS);
}

void DroneEasy::swipeLeftS2() const {
  servoHold(SHOOT2_PIN, S_LEFT, FIRE_HOLD_MS);
  servoHold(SHOOT2_PIN, S_CLOSE, RESET_HOLD_MS);
  delay(POST_DELAY_MS);
}

void DroneEasy::swipeRightS2() const {
  servoHold(SHOOT2_PIN, S_RIGHT, FIRE_HOLD_MS);
  servoHold(SHOOT2_PIN, S_CLOSE, RESET_HOLD_MS);
  delay(POST_DELAY_MS);
}

void DroneEasy::ensureShootHeight() const {
  pArduino->set_height(HEIGHT_SHOOT);
  delay(200);

  uint16_t current_h = pArduino->get_height_cm();

  if (current_h < (HEIGHT_SHOOT - 10) || current_h > (HEIGHT_SHOOT + 10)) {
      pArduino->set_height(HEIGHT_SHOOT);
      delay(500);
      hold_now(300);
  } else {
      hold_now(400);
  }
}

void DroneEasy::reachShootHeightStable() const {
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
    uint16_t h = pArduino->get_height_cm();

    if (h == 0 || h > 300) {
      stableSince = 0;
      continue;
    }

    int diff = (int)h - (int)TARGET;
    if (abs(diff) <= TOL) {
      if (stableSince == 0) stableSince = millis();
      if (millis() - stableSince >= STABLE_NEED_MS) break;
    } else {
      stableSince = 0;
    }
  }

  pArduino->set_direction(7, 2);
  delay(120);
}

void DroneEasy::reachShootHeightFastb() const {
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
    uint16_t h = pArduino->get_height_cm();
    if (h == 0 || h > 250) { stableSince = 0; continue; }

    int diff = (int)h - (int)TARGET;
    if (abs(diff) <= TOL) {
      if (stableSince == 0) stableSince = millis();
      if (millis() - stableSince >= STABLE_NEED_MS) break;
    } else {
      stableSince = 0;
    }
  }
  pArduino->set_direction(7, 2);
  delay(50);
}

void DroneEasy::reachShootHeightFast() const {
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
    uint16_t h = pArduino->get_height_cm();
    if (h == 0 || h > 250) { stableSince = 0; continue; }

    int diff = (int)h - (int)TARGET;
    if (abs(diff) <= TOL) {
      if (stableSince == 0) stableSince = millis();
      if (millis() - stableSince >= STABLE_NEED_MS) break;
    } else {
      stableSince = 0;
    }
  }
  pArduino->set_direction(7, 2);
  delay(50);
}

void DroneEasy::reachShootHeightFast2() const {
  constexpr uint16_t TARGET = HEIGHT_SHOOT;
  pArduino->set_direction(7, 2);
  pArduino->set_height(TARGET);
  delay(700);
  pArduino->set_direction(7, 2);
  delay(80);
}

void DroneEasy::dropPayload() const { drop_payload(); }
void DroneEasy::dropPayloadRound05(int round) const { drop_payload_by_round05(round); }
void DroneEasy::dropPayloadRound10(int round) const { drop_payload_by_round10(round); }
void DroneEasy::dropPayloadByRoundAll(int round) const { drop_payload_by_round_all(round); }
void DroneEasy::dropPayloadAll4() const { drop_payload_all4(); }

void DroneEasy::onKey(uint8_t key, void (*handler)(void)) const { pArduino->keyDo(key, handler); }
void DroneEasy::onKey1(void (*handler)(void)) const { onKey(Arduino::KEY_1, handler); }
void DroneEasy::onKey2(void (*handler)(void)) const { onKey(Arduino::KEY_2, handler); }
void DroneEasy::onKey3(void (*handler)(void)) const { onKey(Arduino::KEY_3, handler); }
void DroneEasy::onKey4(void (*handler)(void)) const { onKey(Arduino::KEY_4, handler); }
void DroneEasy::onKey5(void (*handler)(void)) const { onKey(Arduino::KEY_5, handler); }
void DroneEasy::onKey6(void (*handler)(void)) const { onKey(Arduino::KEY_6, handler); }
void DroneEasy::onKey7(void (*handler)(void)) const { onKey(Arduino::KEY_7, handler); }
void DroneEasy::onKey8(void (*handler)(void)) const { onKey(Arduino::KEY_8, handler); }
void DroneEasy::onKey9(void (*handler)(void)) const { onKey(Arduino::KEY_9, handler); }
void DroneEasy::onKey10(void (*handler)(void)) const { onKey(Arduino::KEY_10, handler); }
void DroneEasy::onKey11(void (*handler)(void)) const { onKey(Arduino::KEY_11, handler); }
void DroneEasy::onKey12(void (*handler)(void)) const { onKey(Arduino::KEY_12, handler); }
void DroneEasy::onKey13(void (*handler)(void)) const { onKey(Arduino::KEY_13, handler); }
void DroneEasy::onKey14(void (*handler)(void)) const { onKey(Arduino::KEY_14, handler); }

uint16_t DroneEasy::heightCm() const { return pArduino->get_height_cm(); }
Arduino& DroneEasy::raw() const { return *pArduino; }
