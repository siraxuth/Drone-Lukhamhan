#pragma once
#include <Arduino.h>

void advance_and_poke_straight(uint16_t deltaFromHere,
                               uint8_t micro_bias_cm = 0,
                               bool relock_height = true);

void advance_and_poke_k6(uint16_t deltaFromHere,
                         uint8_t micro_bias_cm = 0,
                         bool relock_height = true);

void advance_and_poke_pedestal_safe(uint16_t deltaFromHere,
                                    uint8_t micro_bias_cm = 0,
                                    bool relock_after = true);

void reach_height_shoot_stable();
void reach_height_shoot_fast();

bool goto_height_smooth(uint16_t target,
                        uint8_t  stepUp,
                        uint8_t  stepDown,
                        uint8_t  tol,
                        uint16_t stable_ms,
                        uint16_t timeout_ms,
                        uint16_t tick_ms,
                        uint8_t  hold_speed);
