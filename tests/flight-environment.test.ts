import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildScenarioConfig } from '../src/flight/config';
import { simulate } from '../src/flight/engine';
import { inLaunchZone, LIGHTS_OFF, LIGHTS_ON, opticalFlowQuality, type FlightEnvironment } from '../src/flight/environment';

const config = buildScenarioConfig({ pattern: 'blank', event: 'mission', objects: [] });
const code = `void setup() { drone.onKey1(fly); }
void fly() {
  calibration(); delay(3000); takeOff(); delay(3000);
  sh(100); fw(200); autoLand();
}`;
const env = (difficulty: FlightEnvironment['difficulty'], lights = LIGHTS_OFF, actions: FlightEnvironment['actions'] = []): FlightEnvironment => ({ difficulty, lights, actions });

describe('flight conditions', () => {
  test('easy lands exactly one commanded distance from launch', () => {
    const result = simulate(code, config, 711, 1, env('easy'));
    assert.equal(result.ok, true);
    assert.equal(result.finalPosition.x, 500);
    assert.equal(result.finalPosition.y, 300);
  });

  test('medium keeps the existing seeded run', () => {
    const before = simulate(code, config, 711, 1);
    const after = simulate(code, config, 711, 1, env('medium'));
    assert.deepEqual(after.frames, before.frames);
    assert.equal(after.score, before.score);
  });

  test('hard is repeatable and reacts to lamps and a blocking player', () => {
    const seed = 123456789;
    const dark = simulate(code, config, seed, 1, env('hard', LIGHTS_OFF));
    const lit = simulate(code, config, seed, 1, env('hard', LIGHTS_ON));
    const replay = simulate(code, config, seed, 1, env('hard', LIGHTS_ON));
    assert.deepEqual(lit.frames, replay.frames);
    assert.notDeepEqual(lit.finalPosition, dark.finalPosition);
    const openQuality = opticalFlowQuality(500, 500, 100, LIGHTS_ON);
    const blockedQuality = opticalFlowQuality(500, 500, 100, LIGHTS_ON, { x: -2.5, y: 2.5 });
    assert.ok(blockedQuality > openQuality);
    const blockingActions: NonNullable<FlightEnvironment['actions']> = [{ t: 0, type: 'walk', position: { x: -2.5, y: 2.5 } }];
    const shadowed = simulate(code, config, seed, 1, env('hard', LIGHTS_ON, blockingActions));
    assert.notDeepEqual(shadowed.finalPosition, lit.finalPosition);
    assert.deepEqual(shadowed.frames, simulate(code, config, seed, 1, env('hard', LIGHTS_ON, blockingActions)).frames);
    const weakLights = LIGHTS_OFF.map(light => ({ ...light })) as typeof LIGHTS_OFF;
    weakLights[0] = { enabled: true, color: 'ice', intensity: 0.2 };
    assert.ok(opticalFlowQuality(500, 500, 100, weakLights, { x: -2.5, y: 2.5 }) < opticalFlowQuality(500, 500, 100, weakLights));
  });

  test('manual intervention changes the route while the code clock continues', () => {
    const automatic = simulate(code, config, 123456789, 1, env('hard', LIGHTS_ON));
    const manual = simulate(code, config, 123456789, 1, env('hard', LIGHTS_ON, [
      { t: 8500, type: 'manual', enabled: true },
      { t: 8500, type: 'stick', value: { forward: 0, right: 1, up: 0, yaw: 0 } },
    ]));
    assert.ok(Math.abs(manual.finalPosition.x - automatic.finalPosition.x) > 0.1);
    assert.equal(manual.duration, automatic.duration);
  });

  test('flipping stops the propellers without granting a new flight clock', () => {
    const flipped = simulate(code, config, 123456789, 1, env('hard', LIGHTS_ON, [{ t: 8500, type: 'flip' }]));
    assert.equal(flipped.frames.at(-1)?.rpm, 0);
    assert.equal(flipped.events.some(event => event.text.includes('ใบพัดหยุด')), true);
    assert.ok(flipped.duration > 8500);
    const shortened = simulate(code, config, 123456789, 1, { ...env('hard', LIGHTS_ON), timeLimitMs: 9000 });
    assert.ok(shortened.duration <= 9000);
  });

  test('launch pose stays within the configured start area', () => {
    assert.equal(inLaunchZone(500, 500, 500, 500), true);
    assert.equal(inLaunchZone(563, 500, 500, 500), true);
    assert.equal(inLaunchZone(580, 500, 500, 500), false);
    const result = simulate(code, config, 7, 1, { ...env('easy'), launch: { x: 530, y: 500, yaw: 0 } });
    assert.equal(result.finalPosition.x, 530);
    assert.equal(result.finalPosition.y, 300);
  });

  test('reboot carries earned objects and waypoints without scoring them twice', () => {
    const mission = buildScenarioConfig({ pattern: 'blank', event: 'aviation', objects: [
      { type: 'balloon', id: 'balloon-1', x: 2, y: 2 },
      { type: 'waypoint', id: 'point-1', x: 1, y: 1, points: 7 },
    ] });
    const completed: NonNullable<FlightEnvironment['completed']> = { balls: [], balloons: ['balloon-1'], platforms: [], boards: [], visits: ['point-1'] };
    const first = simulate('', mission, 23, undefined, { ...env('hard'), completed });
    const next = simulate('', mission, 23, undefined, { ...env('hard'), completed });
    assert.equal(first.score, 12);
    assert.equal(next.score, 12);
    assert.equal(next.visits.filter(item => item.id === 'point-1').length, 1);
  });

  test('hard mode never drifts a grounded drone during calibration', () => {
    const result = simulate(code, config, 123456789, 1, env('hard', LIGHTS_ON));
    const grounded = result.frames.filter(frame => frame.t <= 3000);
    assert.ok(grounded.length > 2);
    assert.ok(grounded.every(frame => frame.x === 500 && frame.y === 500));
    assert.ok(opticalFlowQuality(500, 500, 25, LIGHTS_OFF) < opticalFlowQuality(500, 500, 100, LIGHTS_OFF));
  });

  test('hard landing position changes with commanded height', () => {
    const atHeight = (height: number) => simulate(code.replace('sh(100)', `sh(${height})`), config, 99, 1, env('hard', LIGHTS_ON));
    const low = atHeight(40).finalPosition;
    const high = atHeight(180).finalPosition;
    assert.ok(Math.hypot(low.x - high.x, low.y - high.y) > 3);
    assert.equal(low.z, high.z);
  });
});
