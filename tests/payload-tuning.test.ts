import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildScenarioConfig } from '../src/flight/config';
import { simulate } from '../src/flight/engine';
import { parse } from '../src/flight/parser';

const config = buildScenarioConfig({ pattern: 'blank', event: 'mission', objects: [] });
const full = { ...config, style: 'full' as const, initialPayload: { L: 20, R: 20 } };

function fly(body: string) {
  return `void runMission() {
    calibration();
    delay(3000);
    take_off();
    delay(3000);
    set_height(80);
    ${body}
    auto_land();
  }`;
}

test('a standalone void runs from KEY 1, with a matched pair of ten balls per side', () => {
  const code = fly('drop(); drop();');
  assert.deepEqual(parse(code, 'full').keyBindings, [{ key: 1, functionName: 'runMission' }]);
  const result = simulate(code, full, 0, 1);
  const drops = result.events.filter(event => event.kind === 'drop');
  assert.deepEqual(drops.map(event => event.from), [{ L: 10, R: 10 }, { L: 10, R: 10 }]);
  assert.deepEqual(drops[0].payload?.channels, { 1: 0, 3: 10, 4: 0, 6: 10 });
  assert.deepEqual(result.payloadRemaining.installed, { 1: 10, 3: 10, 4: 10, 6: 10 });
});

test('side commands preserve inventory by channel across flights and paired drops use the matched amount', () => {
  const result = simulate(fly('drop_l(3); drop_r(4);'), full, 0, 1);
  assert.deepEqual(result.payloadRemaining.channels, { 1: 10, 3: 0, 4: 0, 6: 10 });
  const next = simulate(fly('drop_l(); drop_r();'), { ...full, initialPayload: result.payloadRemaining }, 0, 1);
  assert.deepEqual(next.payloadRemaining.channels, { 1: 0, 3: 0, 4: 0, 6: 0 });
  const uneven = simulate(fly('drop_pair(1);'), { ...full, initialPayload: { L: 10, R: 5 } }, 0, 1);
  assert.deepEqual(uneven.events.find(event => event.kind === 'drop')?.from, { L: 5, R: 5 });
});

test('custom servo code sends a calibrated pulse, drains by delay and closes the same channel', () => {
  const code = `
    void waitForBalls(int intervals) {
      int elapsed = 0;
      for (int i = 0; i < intervals; i++) { elapsed += 80; }
      if (elapsed >= 240) { delay(elapsed); } else { delay(80); }
    }
    void runMission() {
      servo_config(1, 10, 120);
      servo_pulse(1, servo_degree_to_pulse(120));
      waitForBalls(3);
      servo_write(1, 10);
      delay(800);
    }
  `;
  const result = simulate(code, { ...full, servoBench: true }, 0, 1);
  assert.deepEqual(result.events.filter(event => event.kind === 'error'), []);
  assert.deepEqual(result.events.filter(event => event.kind === 'drop').map(event => [event.t, event.n]),
    [[80, 2], [160, 2], [240, 2]]);
  assert.equal(result.payloadRemaining.channels?.[1], 4);
  assert.equal(result.payloadRemaining.channels?.[4], 10);
  assert.equal(result.events.filter(event => event.kind === 'servo').at(-1)?.gatePositions?.[1], 0);
});

test('manual opening on the ground does not backdate a drop in flight', () => {
  const code = fly('delay(80); servo_write(1, 0);')
    .replace('calibration();', 'servo_write(1, 110); delay(600); calibration();');
  const result = simulate(code, full, 0, 1);
  const drops = result.events.filter(event => event.kind === 'drop');
  assert.equal(drops.length, 1);
  assert.equal(drops[0].n, 2);
  assert.ok(drops[0].t >= (result.events.find(event => event.kind === 'takeoff')?.t ?? Infinity));
});

test('both rear-shot spellings parse in all editor styles', () => {
  for (const style of ['full', 'drone', 'parduino', 'any'] as const) {
    const result = parse('void runMission() { shoot(); shoot_b(); shot_b(); }', style, 1);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.calls.map(call => call.name), ['shoot', 'shoot_b', 'shot_b']);
  }
});
