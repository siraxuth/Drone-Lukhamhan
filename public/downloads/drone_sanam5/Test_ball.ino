// ทดสอบ servo บอลด้วย pulse ดิบ (คนละตัวกับ release_the_ball() ใน Drone_Mission.ino)
void test_release_the_ball() {
  release_servo_angle(PORT3, 1000);
  delay(1000);
  release_servo_angle(PORT3, 1900);
  delay(1000);

  release_servo_angle(PORT6, 1000);
  delay(1000);
  release_servo_angle(PORT6, 1900);
  delay(1000);

  release_servo_angle(PORT3, 2550);
  delay(1000);
  release_servo_angle(PORT3, 1900);
  delay(1000);

  release_servo_angle(PORT6, 2550);
  delay(1000);
  release_servo_angle(PORT6, 1900);
  delay(1000);

  release_dual_servo_angle(PORT3, 490, PORT6, 490);
  delay(1000);
  release_dual_servo_angle(PORT3, 1900, PORT6, 1900);
  delay(1000);

  release_dual_servo_angle(PORT3, 1000, PORT6, 1000);
  delay(1000);
  release_dual_servo_angle(PORT3, 1900, PORT6, 1900);
  delay(1000);

  release_dual_servo_angle(PORT3, 2550, PORT6, 2550);
  delay(1000);
  release_dual_servo_angle(PORT3, 1900, PORT6, 1900);
}

void target_shooting() {
  swipe_left_S1();
  swipe_right_S1();
  swipe_left_S2();
  swipe_right_S2();
}
