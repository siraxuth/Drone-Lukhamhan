import { test } from 'node:test';
import assert from 'node:assert/strict';
import { challengeSlug } from '../src/lib/challenge-slug';
import { DEFAULT_CHALLENGE_STARTER } from '../src/lib/challenge-starter';
import { maxScore, parseConfigStrict, type ScenarioConfig } from '../src/lib/scenarios';
import { buildScenarioConfig } from '../src/flight/config';
import { simulate } from '../src/flight/engine';

const scene: ScenarioConfig = { pattern: 'blank', event: 'mission', base: { mode: 'none' }, objects: [
  { type: 'platform', id: 'ball pad', x: 0, y: 0, r: 1, requiredBalls: 5 },
] };
test('Thai mission names produce readable safe slugs', () => {
  assert.equal(challengeSlug('ภารกิจ ลอดห่วง ๑'), 'mission-hoop-flight-1');
  assert.equal(challengeSlug('ปล่อยบอล'), 'ball-drop');
  for (const s of ['ฝึกบิน ขั้นสูง','ทดสอบชื่อใหม่','🚀','Hello world!']) assert.match(challengeSlug(s), /^[a-z0-9-]{1,50}$/);
});
test('ball goals roundtrip through saved config and reject impossible values', () => {
  const parsed = parseConfigStrict(JSON.stringify(scene));
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(buildScenarioConfig(parsed.config).platforms[0].requiredBalls, 5);
  for (const n of [0, 41, 1.5]) assert.equal(parseConfigStrict({ ...scene, objects: [{ ...scene.objects[0], requiredBalls: n }] }).ok, false);
  assert.equal(maxScore(scene), 15);
});
test('ball scoring uses the goal of the actual platform, including excess penalty', () => {
  const code = 'void setup() { calibration(); delay(3000); take_off(); delay(3000); set_height(100); poshold(); delay(1000); drop(); auto_land(); }';
  const cfg = buildScenarioConfig(scene);
  for (const count of [3, 5, 7]) {
    const result = simulate(code, { ...cfg, initialPayload: { L: count, R: 0 } }, 42);
    const drop = result.events.find(e => e.kind === 'drop');
    assert.equal(drop?.ok, true);
    assert.equal(drop?.points, Math.min(count, 5));
    const penalty = result.breakdown.filter(b => b.points < 0).reduce((sum,b) => sum + b.points,0);
    assert.equal(penalty, count > 5 ? 5-count : 0);
  }
});
test('starter waits for KEY 1 before calibration and completes a basic flight', () => {
  const cfg = buildScenarioConfig({ ...scene, objects: [] });
  const idle = simulate(DEFAULT_CHALLENGE_STARTER, cfg, 42);
  assert.equal(idle.events.some(e => e.kind === 'takeoff'), false);
  const run = simulate(DEFAULT_CHALLENGE_STARTER, cfg, 42, 1);
  assert.equal(run.events.filter(e => e.kind === 'error').length, 0);
  assert.equal(run.events.some(e => e.kind === 'takeoff'), true);
  assert.equal(run.events.some(e => e.kind === 'land'), true);
});
