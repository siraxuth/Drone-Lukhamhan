void drop_payload() {
  uint32_t t = micros();
  while (micros() - t < 1500000) {
    digitalWrite(PORT1, HIGH);
    delayMicroseconds(500);
    digitalWrite(PORT1, LOW);
    delayMicroseconds(19500);
  }
}

void drop_payload_by_round05(int round) {
  switch (round) {
    case 0:
     release_servo_angle(PORT3, 1000);
      break;
    case 1:
     release_servo_angle(PORT6, 1000);
      break;
    case 2:
       release_servo_angle(PORT3, 2550);
      break;
    case 3:
      release_servo_angle(PORT6, 2550);
      break;
  }
}

void drop_payload_by_round10(int round) {
  switch (round) {
    case 0:
      release_dual_servo_angle(PORT3, 1000, PORT6, 1000);
      break;
    case 1:
     release_dual_servo_angle(PORT6, 2550, PORT3, 2550);
      break;
    case 2:
      release_dual_servo_angle(PORT6, 1000, PORT3, 1000);
      break;
    case 3:
      release_dual_servo_angle(PORT6, 2550, PORT3, 2550);
      break;
  }
}

void drop_payload_by_round_all(int round) {
  switch (round) {
    case 0:
      release_dual_servo_angle(PORT3, 1000,  PORT6, 1000);
      break;
    case 1:
      release_dual_servo_angle(PORT3, 2550, PORT6, 2550);
      break;
  }
}

void release_servo_angle(uint8_t port_pin, int pulseWidth) {
  uint32_t t = micros();
  while (micros() - t < 1500000) {
    digitalWrite(port_pin, HIGH);
    delayMicroseconds(pulseWidth);
    digitalWrite(port_pin, LOW);
    delayMicroseconds(20000 - pulseWidth);
  }
}

// void release_dual_servo_angle(uint8_t port_pin1, int pulse1,
//                               uint8_t port_pin2, int pulse2) {
//   // กันค่าเพี้ยน/ต่ำเกินพิสัย (ค่าต่ำไปทำให้เซอร์โวดันสุดแล้วสั่น)
//   pulse1 = constrain(pulse1, MIN_US, MAX_US);
//   pulse2 = constrain(pulse2, MIN_US, MAX_US);

//   const uint32_t HOLD_MS = 1500;
//   const uint32_t t0 = millis();

//   while (millis() - t0 < HOLD_MS) {
//     // ---------- ช่วงสร้างพัลส์ : ปิด interrupt กันพัลส์ถูกยืด ----------
//     noInterrupts();
//     digitalWrite(port_pin1, HIGH);
//     digitalWrite(port_pin2, HIGH);

//     delayMicroseconds(lo);                      // HIGH พร้อมกันทั้งคู่
//     if (pulse1 <= pulse2) digitalWrite(port_pin1, LOW);
//     if (pulse2 <= pulse1) digitalWrite(port_pin2, LOW);

//     if (gap) delayMicroseconds(gap);            // รอตัวที่พัลส์ยาวกว่า
//     digitalWrite(port_pin1, LOW);
//     digitalWrite(port_pin2, LOW);
//     interrupts();
//     // ---------- จบช่วง timing-critical ----------

//     // ช่วง LOW ที่เหลือของเฟรม 20ms : เปิด interrupt ให้ I2C ทำงานได้
//     // delayMicroseconds แม่นแค่ ≤16383us จึงแยก delay() + เศษ us
//     delayMicroseconds(rest % 1000);
//   }
// }
void release_dual_servo_angle(uint8_t port_pin1, int pulse1, uint8_t port_pin2, int pulse2) {
  uint32_t t = micros();
  while (micros() - t < 1500000) {
    digitalWrite(port_pin1, HIGH);
    digitalWrite(port_pin2, HIGH);
    delayMicroseconds(min(pulse1, pulse2));

    if (pulse1 < pulse2) digitalWrite(port_pin1, LOW);
    else if (pulse2 < pulse1) digitalWrite(port_pin2, LOW);
    else {
      digitalWrite(port_pin1, LOW);
      digitalWrite(port_pin2, LOW);
    }

    delayMicroseconds(abs(pulse1 - pulse2));

    digitalWrite(port_pin1, LOW);
    digitalWrite(port_pin2, LOW);
    delayMicroseconds(20000 - max(pulse1, pulse2));
  }
}

void smooth_set_height(uint16_t target_height, uint16_t step = 10, uint16_t delay_ms = 80) {
  static uint16_t current_height = HEIGHT_FLIGHT;
  if (target_height == current_height) return;

  if (target_height > current_height) {
    for (uint16_t h = current_height + step; h <= target_height; h += step) {
      pArduino->set_height(h);
      delay(delay_ms);
    }
  } else {
    for (uint16_t h = current_height - step; h >= target_height; h -= step) {
      pArduino->set_height(h);
      delay(delay_ms);
      if (h <= step) break;
    }
  }
  current_height = target_height;
}

void drop_payload_all4() {
  release_dual_servo_angle(PORT6, 490, PORT3, 490);
  delay(300);
  release_dual_servo_angle(PORT6, 1900, PORT3, 1900);
}
