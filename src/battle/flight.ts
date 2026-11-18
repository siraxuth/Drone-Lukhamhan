import { buildScenarioConfig } from '@/flight/config';
import { frameAt, LEG_CM, REST_CM, simulate, TIME_LIMIT_MS } from '@/flight/engine';
import { KNOWN, canon } from '@/flight/commands';
import { parse } from '@/flight/parser';
import type { FlightView, Room, Tape } from './types';
import { START_WINDOW } from './rules';

const editorOnly = new Set(['setup', 'loop', 'main', 'begin', 'begindefault', 'pinmode', 'digitalwrite',
  'poll', 'keydo', 'print', 'println', 'for', 'if', 'while', 'switch', 'return', 'servodegreetopulse', 'servodegreetopulsecustom']);
const arity: Record<string, [number, number]> = {
  calibration: [0, 0], takeoff: [0, 0], autoland: [0, 0],
  delay: [1, 1], settle: [0, 1], wait: [1, 1], sh: [1, 1], yaw: [1, 1],
  fw: [1, 2], bw: [1, 2], ml: [1, 2], mr: [1, 2], fwt: [1, 2], bwt: [1, 2], mlt: [1, 2], mrt: [1, 2],
  drop: [0, 0], dropall: [0, 0], dropl: [0, 1], dropr: [0, 1], droppair: [1, 1],
  servoconfig: [3, 3], servowrite: [2, 2], servowritepair: [4, 4], servorate: [1, 1], flightconfig: [3, 3],
};

export function compileBattle(code: string, key: number | null) {
  const preview = parse(code);
  const selectedKey = key ?? preview.keyBindings[0]?.key;
  const result = selectedKey === undefined || preview.errors.length ? preview : parse(code, 'any', selectedKey);
  const errors = result.errors.map(error => error.text);
  for (const call of result.calls) {
    const command = canon(call.name);
    const limits = arity[command];
    if (!KNOWN.has(command) || editorOnly.has(command) || /^onkey\d+$/.test(command)) {
      errors.push(`บรรทัด ${call.line}: ไม่รู้จักคำสั่ง ${call.name}()`);
    } else if (call.args.some(value => !Number.isFinite(value)) ||
      (limits && (call.args.length < limits[0] || call.args.length > limits[1]))) {
      errors.push(`บรรทัด ${call.line}: ตรวจจำนวนและค่าที่ส่งให้ ${call.name}()`);
    }
  }
  if (!errors.length && !result.calls.length) errors.push('ยังไม่มีคำสั่งที่รันได้ ลองเลือกปุ่ม KEY หรือเขียนฟังก์ชันที่จะรัน');
  return { ok: errors.length === 0, errors: [...new Set(errors)].slice(0, 20), keys: preview.keyBindings, key: selectedKey };
}

export function makeTape(room: Pick<Room, 'settings' | 'scenario'>, code: string, key: number | undefined, seed: number, waitMs = 0): Tape {
  const cfg = buildScenarioConfig(room.scenario.config);
  const environment = { difficulty: room.settings.difficulty, lights: room.settings.lights, ceilingLights: room.settings.ceilingLights };
  const result = simulate(code, {
    ...cfg, stopAtFinish: true, initialPayload: room.scenario.config.requiresPayload ? { L: 20, R: 20 } : undefined,
  }, seed, key, environment);

  const counts = new Map<string, number>();
  const best = new Map<string, number>();
  const changes = result.visits.map(visit => ({ t: visit.t, delta: visit.points }));
  for (const event of result.events) {
    if (!event.ok || !event.id || event.points === undefined) continue;
    let delta = event.points;
    if (event.kind === 'drop') {
      const cap = cfg.platforms.find(p => p.id === event.id)?.requiredBalls ?? cfg.ballCap;
      const previous = counts.get(event.id) ?? 0;
      const total = previous + (event.n ?? 0);
      delta -= (Math.max(0, total - cap) - Math.max(0, previous - cap)) * cfg.points.ball;
      counts.set(event.id, total);
    } else if (event.kind === 'shot' || event.kind === 'shot_b') {
      const previous = best.get(event.id);
      const next = Math.min(previous ?? Infinity, delta);
      delta = next - (previous ?? 0);
      best.set(event.id, next);
    }
    changes.push({ t: event.t, delta });
  }

  const duration = Math.min(TIME_LIMIT_MS, result.stopTime ?? result.duration);
  let score = 0;
  const scores = changes.sort((a, b) => a.t - b.t).map(change => ({ t: Math.min(duration, change.t), score: score += change.delta }));
  if (score !== result.score) scores.push({ t: duration, score: result.score });

  const center = cfg.padAt ?? cfg.start;
  const outside = (x: number, y: number) => Math.max(Math.abs(x - center.x), Math.abs(y - center.y)) > cfg.pad.half;
  const flightStart = result.events.find(event => event.kind === 'takeoff')?.t;
  const exitIndex = flightStart === undefined ? -1 : result.frames.findIndex(frame =>
    frame.t >= flightStart && frame.t <= duration && outside(frame.x, frame.y));
  let exitMs = null;
  if (exitIndex >= 0) {
    const to = result.frames[exitIndex], from = result.frames[Math.max(0, exitIndex - 1)];
    const fractions = (['x', 'y'] as const).filter(axis => Math.abs(to[axis] - center[axis]) > cfg.pad.half)
      .map(axis => (center[axis] + Math.sign(to[axis] - center[axis]) * cfg.pad.half - from[axis]) / (to[axis] - from[axis]));
    const crossing = Math.max(0, Math.min(1, ...fractions.filter(Number.isFinite)));
    exitMs = waitMs + Math.round(Math.max(flightStart!, from.t + (to.t - from.t) * crossing));
  }
  const dnf = !result.ok || result.stopTime === null || result.timedOut;
  // Sample once. Frames are stored separately from room state and only elapsed samples are served.
  const frames = [];
  let index = 0;
  for (let t = 0; t < duration; t += 100) {
    while (index + 1 < result.frames.length && result.frames[index + 1].t <= t) index++;
    frames.push({ ...frameAt(result.frames.slice(index, index + 2), t), t });
  }
  frames.push({ ...frameAt(result.frames, duration), t: duration });
  return {
    frames, duration, scores,
    events: result.events.filter(event => ['drop', 'pop', 'shot', 'shot_b', 'servo', 'land'].includes(event.kind))
      .map(({ line: _line, text: _text, ...event }) => ({ ...event, text: '' })),
    visits: result.visits.map(({ id, t }) => ({ id, t })),
    finish: {
      score: result.score, totalMs: dnf ? START_WINDOW + TIME_LIMIT_MS : waitMs + duration,
      exitMs, dnf,
    },
  };
}

export function flightWindow(tape: Tape, at: number, live: boolean): FlightView {
  const offset = Math.max(0, Math.min(tape.duration, at));
  const crossed = tape.frames.findIndex(frame => frame.t > offset);
  const end = crossed < 0 ? tape.frames.length : crossed;
  return {
    offset, duration: live ? offset : tape.duration, live,
    frames: tape.frames.slice(Math.max(0, end - 24), end),
    events: tape.events.filter(event => event.t <= offset),
    visits: tape.visits.filter(visit => visit.t <= offset),
    score: tape.scores.findLast(score => score.t <= offset)?.score ?? 0,
  };
}

export function restingFrame(room: Pick<Room, 'scenario'>): FlightView {
  const cfg = buildScenarioConfig(room.scenario.config);
  const pad = cfg.padAt === undefined ? cfg.start : cfg.padAt;
  const onPad = pad && Math.max(Math.abs(cfg.start.x - pad.x), Math.abs(cfg.start.y - pad.y)) <= cfg.pad.half;
  return { frames: [{ ...cfg.start, t: 0, yaw: cfg.startYaw ?? 0, z: onPad ? REST_CM : LEG_CM }], duration: 0, offset: 0, live: false, events: [], visits: [], score: 0 };
}
