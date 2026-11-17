import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildScenarioConfig } from '../src/flight/config';
import { inLaunchZone, LIGHTS_OFF } from '../src/flight/environment';
import { forecastLaunch, recommendLaunch } from '../src/flight/placement';

const config = buildScenarioConfig({ pattern: 'blank', event: 'mission', objects: [] });
const code = `void setup() { drone.onKey1(fly); }
void fly() { calibration(); delay(3000); takeOff(); delay(3000); sh(100); fw(450); autoLand(); }`;

describe('launch placement analysis', () => {
  test('recommends a valid launch pose using the same forecast as the selected pose', () => {
    const recommendation = recommendLaunch(code, config, 1, 'easy', LIGHTS_OFF, 42);
    const center = forecastLaunch(code, config, 1, { x: 500, y: 500, yaw: 0 }, 'easy', LIGHTS_OFF, 42);
    assert.ok(inLaunchZone(recommendation.pose.x, recommendation.pose.y, config.start.x, config.start.y));
    assert.ok(recommendation.ok);
    assert.ok(recommendation.distanceM >= center.distanceM);
    assert.deepEqual(recommendation, forecastLaunch(code, config, 1, recommendation.pose, 'easy', LIGHTS_OFF, 42));
    assert.deepEqual(recommendation, recommendLaunch(code, config, 1, 'easy', LIGHTS_OFF, 42));
  });

  test('keeps the admin 0° start when forward 420 cm reaches the checkpoint then hoop', () => {
    const mission = buildScenarioConfig({ pattern: 'grid5', event: 'mission', start: { x: 0, y: 0, yaw: 0 }, objects: [
      { type: 'waypoint', id: 'checkpoint 1', x: 0, y: 2, order: 1, r: 45, zMin: 80, zMax: 130 },
      { type: 'hoop', id: 'hoop 1', x: 0, y: 3.5, yaw: 0, size: 1, zMin: 55, zMax: 150 },
    ] });
    const program = 'void setup(){drone.onKey1(fly);} void fly(){pArduino->calibration(); delay(3000); pArduino->take_off(); delay(3000); pArduino->set_height(100); pArduino->poshold(); delay(200); pArduino->move_forward_cm(420);}';
    const result = recommendLaunch(program, mission, 1, 'easy', LIGHTS_OFF, 1);
    assert.deepEqual(result.pose, { x: 500, y: 500, yaw: 0 });
    assert.deepEqual(result.reached, ['checkpoint 1', 'hoop 1']);
  });

  test('turns toward the coded route when the goals are east of the starting direction', () => {
    const mission = buildScenarioConfig({ pattern: 'grid5', event: 'mission', start: { x: 0, y: 0, yaw: 0 }, objects: [
      { type: 'waypoint', id: 'checkpoint 1', x: 2, y: 0, order: 1, r: 45, zMin: 80, zMax: 130 },
      { type: 'hoop', id: 'hoop 1', x: 3.5, y: 0, yaw: 90, size: 1, zMin: 55, zMax: 150 },
    ] });
    const program = 'void setup(){drone.onKey1(fly);} void fly(){calibration(); delay(3000); take_off(); delay(3000); set_height(100); move_forward_cm(420);}';
    const result = recommendLaunch(program, mission, 1, 'easy', LIGHTS_OFF, 1);
    assert.equal(result.pose.yaw, 90);
    assert.deepEqual(result.reached, ['checkpoint 1', 'hoop 1']);
  });
});
