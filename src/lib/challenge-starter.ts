export const DEFAULT_CHALLENGE_STARTER = `// วางโดรนบนฐานนิ่ง ๆ ก่อนกด KEY 1
void setup() {
  drone.onKey1(runMission);
  drone.onKey2(land);
}

void loop() {
}

void runMission() {
  calibration();
  delay(3000);
  take_off();
  delay(3000);
  set_height(100);
  poshold();
  delay(1000);

  // เพิ่มคำสั่งเดินทางและทำภารกิจตรงนี้

  auto_land();
}

void land() {
  auto_land();
}
`;
