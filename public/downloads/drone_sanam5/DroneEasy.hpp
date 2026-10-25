#pragma once

#include <Arduino.h>

#include "LegacyActions.hpp"
#include "protocol.hpp"

class DroneEasy {
 public:
  void beginDefault() const;

  void wait(unsigned long ms) const;
  void calibration() const;
  void calibrateAndDelay(unsigned long ms) const;
  void takeOff() const;
  void autoLand() const;
  void stopMotor() const;
  void poll() const;

  void settle(uint16_t ms = 220) const;
  void fw(int cm) const;
  void bw(int cm) const;
  void ml(int cm) const;
  void mr(int cm) const;
  void sh(int z) const;

  void moveForward(int cm, uint8_t speed = 2) const;
  void moveBackward(int cm, uint8_t speed = 2) const;
  void moveLeft(int cm, uint8_t speed = 2) const;
  void moveRight(int cm, uint8_t speed = 2) const;
  void moveFastForward(int cm, uint8_t speed = 3) const;
  void moveFastBackward(int cm, uint8_t speed = 3) const;
  void moveFastLeft(int cm, uint8_t speed = 3) const;
  void moveFastRight(int cm, uint8_t speed = 3) const;
  void setHeight(int z) const;
  void holdHeight(uint16_t height, uint8_t speed = 2) const;
  void smoothSetHeight(uint16_t target, uint16_t step = 10, uint16_t delay_ms = 200) const;
  void direction(uint8_t dir, uint8_t speed) const;
  void posHold(uint8_t speed = 2) const;

  void rotate() const;
  void flip() const;
  void circle360() const;
  void jump() const;
  void jumpEnd() const;
  void picture() const;
  void videoBegin() const;
  void videoEnd() const;
  void motor(uint8_t num, uint8_t speed) const;
  void setPos(int16_t x, int16_t y) const;
  void setYaw(uint8_t rotate, uint16_t angle) const;

  static uint16_t mToCm(float m);
  void moveTimeDir(uint8_t dir, uint16_t cm, float ms_per_cm, uint8_t speed = 2) const;

  void servoRelease(uint8_t pin, int pulseWidth) const;
  void servoReleaseDual(uint8_t pin1, int pulse1, uint8_t pin2, int pulse2) const;
  int servoPulseFromAngle(int angle) const;
  int servoPulseFromAngleCustom(int angle, int pulse_min, int pulse_max) const;
  void servoAngle(uint8_t pin, int angle) const;
  void servoAngleCustom(uint8_t pin, int angle, int pulse_min, int pulse_max) const;
  void servoAngleDual(uint8_t pin1, int angle1, uint8_t pin2, int angle2) const;
  void servoAngleDualCustom(uint8_t pin1, int angle1, int min1, int max1,
                            uint8_t pin2, int angle2, int min2, int max2) const;

  int clampPulse(int us) const;
  void servoPulse50Hz(int pin, int pulse_us) const;
  void servoHold(int pin, int pulse_us, uint16_t hold_ms) const;
  void swipeLeftS1() const;
  void swipeRightS1() const;
  void swipeLeftS2() const;
  void swipeRightS2() const;
  void ensureShootHeight() const;
  void reachShootHeightStable() const;
  void reachShootHeightFastb() const;
  void reachShootHeightFast() const;
  void reachShootHeightFast2() const;

  void up(int16_t speed = 3, int16_t time = 500) const;
  void down(int16_t speed = 3, int16_t time = 500) const;

  void dropPayload() const;
  void dropPayloadRound05(int round) const;
  void dropPayloadRound10(int round) const;
  void dropPayloadByRoundAll(int round) const;
  void dropPayloadAll4() const;

  void onKey(uint8_t key, void (*handler)(void)) const;
  void onKey1(void (*handler)(void)) const;
  void onKey2(void (*handler)(void)) const;
  void onKey3(void (*handler)(void)) const;
  void onKey4(void (*handler)(void)) const;
  void onKey5(void (*handler)(void)) const;
  void onKey6(void (*handler)(void)) const;
  void onKey7(void (*handler)(void)) const;
  void onKey8(void (*handler)(void)) const;
  void onKey9(void (*handler)(void)) const;
  void onKey10(void (*handler)(void)) const;
  void onKey11(void (*handler)(void)) const;
  void onKey12(void (*handler)(void)) const;
  void onKey13(void (*handler)(void)) const;
  void onKey14(void (*handler)(void)) const;

  uint16_t heightCm() const;
  Arduino& raw() const;
};

extern DroneEasy drone;
