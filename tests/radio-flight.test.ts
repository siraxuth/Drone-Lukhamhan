import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildScenarioConfig } from '../src/flight/config';
import { frameAt, parse, REST_CM, simulate } from '../src/flight/engine';
import { LIGHTS_OFF, type FlightAction } from '../src/flight/environment';
import { NEUTRAL_STICK, RADIO_READY_MS } from '../src/flight/radio-physics';
import { axisValue, liteBeeStatusReader } from '../src/flight/remote-input';
import { scenarioSeeds } from '../src/lib/scenario-seeds';
import { hybridStarter } from '../src/flight/hybrid-program';
import type { ScenarioView } from '../src/lib/scenarios';

const config = buildScenarioConfig({ event: 'mission', pattern: 'blank', objects: [] });
const withRadio = (actions: FlightAction[], radioUntilMs = 12_000) =>
  simulate('invalid editor text', config, 0, undefined, { difficulty: 'medium', lights: LIGHTS_OFF, radio: true, radioUntilMs, actions });

test('radio flight spools for three seconds before liftoff, and lands independently of editor code', () => {
  const result = withRadio([{ type: 'radio-land', t: 6000 }]);
  assert.equal(result.events.find(event => event.kind === 'takeoff')?.t, 3000);
  assert.equal(frameAt(result.frames, 1500).z, REST_CM);
  assert.equal(frameAt(result.frames, 1500).rpm, 0.5);
  assert.ok(frameAt(result.frames, RADIO_READY_MS).z > 100);
  assert.equal(result.commandTimeline.length, 0);
  assert.equal(result.ok, true);
  assert.equal(result.landedOnPad, true);
  assert.equal(result.frames.at(-1)?.rpm, 0);
});

test('sticks use aircraft axes, with inertia and tilt measured in the frame', () => {
  const result = withRadio([
    { type: 'stick', t: 5200, value: { ...NEUTRAL_STICK, forward: 1, up: 0.5 } },
    { type: 'stick', t: 6600, value: { ...NEUTRAL_STICK, yaw: 1, right: 0.65 } },
    { type: 'stick', t: 8200, value: NEUTRAL_STICK },
  ]);
  const start = frameAt(result.frames, 5200);
  const moving = frameAt(result.frames, 6200);
  const turning = frameAt(result.frames, 7600);
  assert.ok(moving.y < start.y - 45 && moving.z > start.z + 15);
  assert.ok((moving.pitch ?? 0) > 0);
  assert.ok(turning.x > moving.x + 15 && turning.yaw > 45);
  assert.ok(frameAt(result.frames, 8400).yaw > frameAt(result.frames, 8200).yaw);
});

test('a rolling forecast keeps the flown path, including checkpoint and hoop scoring', () => {
  const course = buildScenarioConfig({ event: 'mission', pattern: 'blank', objects: [
    { id: 'checkpoint', type: 'waypoint', x: 0, y: 0.65, r: 20, zMin: 85, zMax: 135, points: 10 },
    { id: 'hoop', type: 'hoop', x: 0, y: 1.1, yaw: 0, size: 1, zMin: 80, zMax: 150, points: 15 },
  ] });
  const actions: FlightAction[] = [
    { type: 'stick', t: 5200, value: { ...NEUTRAL_STICK, forward: 1 } },
    { type: 'stick', t: 6900, value: NEUTRAL_STICK },
  ];
  const run = (radioUntilMs: number) => simulate('', course, 0, undefined, { difficulty: 'medium', lights: LIGHTS_OFF, radio: true, radioUntilMs, actions });
  const ahead = run(6700), later = run(8000);
  assert.deepEqual(later.frames.slice(0, ahead.frames.length), ahead.frames);
  assert.deepEqual(later.visits.map(visit => visit.id), ['checkpoint', 'hoop']);
  assert.equal(later.score, 25);
  assert.equal(later.timedOut, false);
});

test('axis calibration applies dead zone, expo, reversal and full travel', () => {
  assert.equal(axisValue(0.22, 0.2, false), 0);
  assert.equal(axisValue(1, 0.2, false), 1);
  assert.equal(axisValue(-1, 0.2, true), 1);
  assert.ok(axisValue(0.5, 0, false) < 0.5);
});

test('the beginner hoop course awards the same points for code and a complete stick flight', () => {
  const scenario = scenarioSeeds.find(item => item.slug === 'first-hoop');
  assert.ok(scenario);
  const course = buildScenarioConfig(scenario.config);
  const code = simulate(scenario.solution, course, 0, 1);
  const radio = simulate('', course, 0, undefined, {
    difficulty: 'medium', lights: LIGHTS_OFF, radio: true,
    actions: [
      { type: 'stick', t: 5400, value: { ...NEUTRAL_STICK, forward: 1 } },
      { type: 'stick', t: 7500, value: NEUTRAL_STICK },
      { type: 'stick', t: 9100, value: { ...NEUTRAL_STICK, forward: -1 } },
      { type: 'stick', t: 11200, value: NEUTRAL_STICK },
      { type: 'radio-land', t: 12700 },
    ],
  });
  assert.equal(code.score, 35);
  assert.equal(radio.score, code.score);
  assert.equal(radio.landedOnPad, true);
});

test('hybrid keys execute on the airborne state, and K1 cancels the rest of the active program', () => {
  const script = 'void setup(){drone.onKey3(fw); drone.onKey7(turnRight);} void fw(){move_forward(300); set_height(200);} void turnRight(){set_yaw(1, 90);}';
  const commands = (key: number) => parse(script, 'full', key).calls;
  const result = withRadio([
    { type: 'stick', t: 5200, value: { ...NEUTRAL_STICK, right: 0.8 } },
    { type: 'stick', t: 6200, value: NEUTRAL_STICK },
    { type: 'radio-key', t: 6400, key: 3, calls: commands(3) },
    { type: 'radio-cancel-code', t: 7200 },
    { type: 'stick', t: 7400, value: { ...NEUTRAL_STICK, right: 1 } },
    { type: 'stick', t: 8200, value: NEUTRAL_STICK },
    { type: 'radio-key', t: 8400, key: 7, calls: commands(7) },
  ], 14_000);
  assert.deepEqual(result.commandTimeline.map(item => item.key), [3, 7]);
  assert.equal(result.commandTimeline[0].end, 7200);
  assert.ok(frameAt(result.frames, 7200).y < frameAt(result.frames, 6400).y - 30);
  assert.ok(frameAt(result.frames, 8300).x > frameAt(result.frames, 7400).x + 20);
  assert.ok(result.finalPosition.z < 150);
  assert.ok(result.finalPosition.yaw > 80);
  assert.equal(result.events.filter(event => event.kind === 'takeoff').length, 1);
});

test('the remote starter binds every Coding key from K2 through K10', () => {
  const scenario = scenarioSeeds.find(item => item.slug === 'first-hoop');
  assert.ok(scenario);
  const starter = hybridStarter({ config: scenario.config } as ScenarioView);
  for (let key = 2; key <= 10; key++) {
    const plan = parse(starter, 'full', key);
    assert.deepEqual(plan.errors, []);
    assert.ok(plan.calls.length);
  }
  assert.deepEqual(parse(starter, 'full', 7).calls[0].args, [90]);
  assert.deepEqual(parse(starter, 'full', 9).calls[0].args, [-90]);
});

test('LiteBee USB diagnostics ignore noise and assemble split status frames', () => {
  const read = liteBeeStatusReader();
  assert.deepEqual(read(Uint8Array.of(0x7f, 0xff, 0xdc)), { replies: 0, version: undefined });
  assert.deepEqual(read(Uint8Array.of(0xba, 2, 0xe9)), { replies: 0, version: undefined });
  assert.deepEqual(read(Uint8Array.of(0, 0xdc, 0xba, 3, 0x0d, 110, 123)), { replies: 2, version: 123 });
  assert.deepEqual(read(Uint8Array.of(0xdc, 0xba, 1, 0x0d, 0xff)), { replies: 0, version: undefined });
});
