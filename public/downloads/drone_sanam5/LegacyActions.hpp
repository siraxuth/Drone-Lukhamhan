#pragma once

#include <Arduino.h>

void drop_payload();
void drop_payload_by_round05(int round);
void drop_payload_by_round10(int round);
void drop_payload_by_round_all(int round);
void drop_payload_all4();

void release_servo_angle(uint8_t port_pin, int pulseWidth);
void release_dual_servo_angle(uint8_t port_pin1, int pulse1, uint8_t port_pin2, int pulse2);

int servo_degree_to_pulse(int angle);
int servo_degree_to_pulse_custom(int angle, int pulse_min, int pulse_max);
void release_servo_degree(uint8_t port_pin, int angle);
void release_servo_degree_custom(uint8_t port_pin, int angle, int pulse_min, int pulse_max);
void release_dual_servo_degree(uint8_t port_pin1, int angle1, uint8_t port_pin2, int angle2);
void release_dual_servo_degree_custom(uint8_t port_pin1, int angle1, int pulse1_min, int pulse1_max,
                                      uint8_t port_pin2, int angle2, int pulse2_min, int pulse2_max);

void ensure_shoot_height();
void reach_height_shoot_stable();
void reach_height_shoot_fastb();
void reach_height_shoot_fast();
void reach_height_shoot_fast2();
