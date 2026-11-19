import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileBattle, flightWindow, makeTape } from '../src/battle/flight';
import { canEdit, canPractice, chooseFinalists, compareFinish, deadline, elo, initialMatch, MAX_PRACTICES, pairUp, practiceCount, START_WINDOW, table } from '../src/battle/rules';
import { advance, bracketRound } from '../src/battle/state';
import { LIGHTS_OFF, CEILING_LIGHTS_ON } from '../src/flight/environment';
import type { Finish, Member, Room } from '../src/battle/types';

const run = 'void drive() { calibration(); delay(3000); take_off(); delay(3000); set_height(80); move_forward(80); move_backward(80); auto_land(); }';
const pilot = (id: string): Member => ({
  id, name: id, key: null, userId: id, role: 'pilot', tokenHash: '', ready: true, draft: run,
  savedAt: 1000, stoppedAt: null, practiceIds: [],
});

function makeRoom(clock: Room['settings']['clock'] = 'fixed'): Room {
  return {
    owner: 'host', status: 'active', prepAt: 1000, selected: ['a', 'b'],
    settings: { format: 'duel', flight: 'parallel', clock, minutes: 1, practices: 1, difficulty: 'easy', lights: LIGHTS_OFF, ceilingLights: CEILING_LIGHTS_ON, ranked: false },
    scenario: { id: 'qa', slug: 'qa', title: 'QA', briefHtml: '', starter: run, level: 'เริ่มต้น', order: 0, config: { pattern: 'blank', base: { mode: 'start' }, event: 'mission', objects: [] } },
    members: [pilot('a'), pilot('b')], matches: [initialMatch(['a', 'b'], 'm', 42, 1)], round: 1, queue: [], advancing: [],
  };
}

const next = (ids: string[], round: number) => initialMatch(ids, 'next', 43, round);
const finish = (overrides: Partial<Finish> = {}): Finish => ({ score: 10, totalMs: 10_000, exitMs: 8000, writingMs: 2500, dnf: false, ...overrides });

test('fixed writing uses the server deadline and locks the last saved code', () => {
  const room = makeRoom();
  assert.equal(deadline(room), 61_000);
  assert.equal(canEdit(room, room.members[0], 60_999), true);
  advance(room, 61_001, next);
  assert.equal(canEdit(room, room.members[0], 61_001), false);
  assert.deepEqual(room.matches[0].seats.map(seat => [seat.opensAt, seat.code]), [[61_000, run], [61_000, run]]);
  advance(room, 61_000 + START_WINDOW, next);
  assert.equal(room.status, 'complete');
  assert.ok(room.matches[0].seats.every(seat => seat.result?.dnf));
});

test('fixed writing opens both lanes early only after both drafts are locked', () => {
  for (const mode of ['parallel', 'turns'] as const) {
    const room = makeRoom();
    room.settings.flight = mode;
    const [a, b] = room.members;
    a.stoppedAt = 3_000;
    advance(room, 3_000, next);
    assert.equal(room.matches[0].seats[0].opensAt, null);
    assert.equal(canEdit(room, b, 3_000), true);
    b.stoppedAt = 5_000;
    advance(room, 5_000, next);
    assert.equal(room.matches[0].seats[0].opensAt, mode === 'parallel' ? 5_000 : 7_200);
    assert.equal(canEdit(room, a, 5_000), false);
    assert.equal(canEdit(room, b, 5_000), false);
  }
});

test('practice counters preserve older rooms and honor the million-round limit', () => {
  const room = makeRoom('open');
  room.settings.practices = MAX_PRACTICES;
  const [member] = room.members;
  member.practiceIds = ['older-id'];
  assert.equal(practiceCount(member), 1);
  member.practice = { count: MAX_PRACTICES - 1, requestId: 'recent-attempt', tapeId: 'recent-tape' };
  assert.equal(canPractice(room, member, 2_000), true);
  member.practice.count++;
  assert.equal(practiceCount(member), 1_000_000);
  assert.equal(canPractice(room, member, 2_000), false);
});

test('open writing stays editable beyond 30 minutes while practice quota is separate', () => {
  const room = makeRoom('open');
  const [a] = room.members;
  const now = 4_000_000;
  assert.equal(deadline(room), null);
  assert.equal(canPractice(room, a, now), true);
  a.practiceIds = ['practice'];
  assert.equal(canPractice(room, a, now), false);
  assert.equal(canEdit(room, a, now), true);
  a.stoppedAt = now;
  assert.equal(canEdit(room, a, now), false);
});

test('second pilot can edit while the first flies until they stop their own clock', () => {
  const room = makeRoom('stopwatch');
  room.settings.flight = 'turns';
  const [a, b] = room.members;
  a.stoppedAt = 4000;
  advance(room, 4000, next);
  const [first, second] = room.matches[0].seats;
  assert.equal(first.opensAt, 6200);
  first.startedAt = 6700;
  first.endsAt = 13_000;
  first.result = finish();
  assert.equal(canEdit(room, b, 8000), true);
  assert.equal(canPractice(room, b, 8000), false);
  assert.equal(second.opensAt, null);
  b.draft = run + '\n// last edit';
  b.stoppedAt = 12_000;
  advance(room, 13_000, next);
  assert.equal(second.opensAt, 13_000);
  assert.equal(second.code, b.draft);
  assert.equal(canEdit(room, b, 13_000), false);
});

test('stopwatch mode adds writing time after score and before flight tie breakers', () => {
  const fastWriting = finish({ writingMs: 1000, totalMs: 20_000 });
  const fastFlight = finish({ writingMs: 5000, totalMs: 5000 });
  assert.ok(compareFinish(fastWriting, fastFlight, true) < 0);
  assert.ok(compareFinish(fastWriting, fastFlight, false) > 0);
  assert.ok(compareFinish(fastWriting, finish({ score: 11 }), true) > 0);
  assert.ok(compareFinish(finish({ exitMs: 1 }), finish({ exitMs: null }), false) < 0);
  assert.equal(compareFinish(finish({ exitMs: null }), finish({ exitMs: null }), false), 0);
});

test('compile validates code without predicting whether a flight will crash', () => {
  assert.equal(compileBattle('void drive() { take_off(); move_forward(9999); }', null).ok, true);
  assert.equal(compileBattle('void drive() { move_foward(30); }', null).ok, false);
  assert.equal(compileBattle('void drive() { move_forward(); }', null).ok, false);
  assert.equal(compileBattle('void drive() { take_off() }', null).ok, false);
  assert.equal(compileBattle('void drive() { for (int i=0;i<500;i++) { for (int j=0;j<500;j++) {} } }', null).ok, false);
});

test('official tape exposes neither future points nor frames before their time', () => {
  const room = makeRoom();
  const tape = makeTape(room, run, 1, 42, 800);
  assert.ok(tape.finish.score > 0);
  assert.ok(tape.finish.exitMs !== null);
  assert.equal(tape.finish.totalMs, tape.duration + 800);
  const live = flightWindow(tape, 5000, true);
  assert.equal(live.score, 0);
  assert.equal(live.duration, 5000);
  assert.ok(live.frames.every(frame => frame.t <= 5000));
  assert.ok(live.events.every(event => event.t <= 5000));
  assert.equal(flightWindow(tape, tape.duration, false).score, tape.finish.score);
});

test('bracket byes skip a flight, ties request a new seed, and the champion ranks first', () => {
  const room = makeRoom('open');
  room.settings.format = 'bracket';
  bracketRound(room, ['a', 'b', 'c']);
  assert.deepEqual(room.advancing, ['c']);
  assert.deepEqual(room.queue, [['a', 'b']]);
  room.matches[0].seats.forEach(seat => { seat.endsAt = 1000; seat.result = finish(); });
  room.queue = [];
  advance(room, 1000, next);
  assert.deepEqual(room.matches.at(-1)?.seats.map(seat => seat.member), ['a', 'b']);
  assert.notEqual(room.matches.at(-1)?.seed, room.matches[0].seed);

  const final = initialMatch(['b', 'c'], 'final', 45, 2);
  final.finishedAt = 10_000;
  final.seats[0].result = finish({ score: 70 });
  final.seats[1].result = finish({ score: 60 });
  room.matches[0].seats[0].result = finish({ score: 100 });
  room.matches.push(final);
  assert.equal(table(room)[0].member, 'b');
});

test('top five uses Battle ratings and excludes guests; Elo is symmetric', () => {
  const members = 'abcdef'.split('').map(pilot);
  members[0].userId = null;
  assert.deepEqual(chooseFinalists(members, new Map([['f', 1250]])), ['f', 'b', 'c', 'd', 'e']);
  assert.deepEqual(pairUp(['a', 'b', 'c']), [['a', 'b'], ['c']]);
  assert.deepEqual(elo(1000, 1000, 1), [12, -12]);
});
