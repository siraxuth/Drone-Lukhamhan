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
});
