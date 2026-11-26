import type { ScenarioView } from '@/lib/scenarios';

export function hybridStarter(scenario: ScenarioView): string {
  const hasBall = scenario.config.requiresPayload;
  return `// ขึ้นบินใน Manual แล้วกด K1 เข้า Coding
void setup() {
  drone.onKey2(hover);
  drone.onKey3(forward);
  drone.onKey4(backward);
  drone.onKey5(left);
  drone.onKey6(right);
  drone.onKey7(turnRight);
  drone.onKey8(raiseToHoop);
  drone.onKey9(${hasBall ? 'releaseBall' : 'turnLeft'});
  drone.onKey10(land);
}

void hover() { poshold(); }
void forward() { move_forward(100); }
void backward() { move_backward(100); }
void left() { move_left(100); }
void right() { move_right(100); }
void turnRight() { set_yaw(1, 90); }
void raiseToHoop() { set_height(110); }
${hasBall ? 'void releaseBall() { drop(); }' : 'void turnLeft() { set_yaw(2, 90); }'}
void land() { auto_land(); }
`;
}
