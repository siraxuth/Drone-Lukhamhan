import 'server-only';

import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { getScenarios } from '@/lib/scenario-data';
import { activeMatch, canEdit, canPractice, chooseFinalists, compareFinish, dnf, elo, MAX_CODE, MAX_MATCHES, MAX_PILOTS, MAX_PRACTICES, MAX_WATCHERS, pairUp, practiceCount, RuleError, START_WINDOW, table } from './rules';
import { advance, bracketRound, makeMatch, writingTime } from './state';
import { compileBattle, flightWindow, makeTape } from './flight';
import { CLOCKS, FORMATS, type FlightView, type Member, type Room, type RoomView, type ListedRoom, type Settings, type Tape } from './types';

type Actor = { userId: string | null; token?: string; watchOnly?: boolean };
type Tx = Prisma.TransactionClient;
const json = (value: Room | Tape | unknown[]) => value as unknown as Prisma.InputJsonValue;
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
export const cookieName = (code: string, watchOnly = false) => `battle_${watchOnly ? 'watch_' : ''}${code}`;
export const rankedEnabled = () => process.env.NODE_ENV !== 'production' || process.env.BATTLE_RANKED_ENABLED === '1';

const name = z.string().trim().min(1).max(36).regex(/^[^\p{Cc}\p{Cf}]+$/u);
const role = z.enum(['pilot', 'watch']);
const id = z.uuid();
const draft = z.string().max(MAX_CODE);
const key = z.number().int().min(1).max(11).nullable();
const light = z.object({ enabled: z.boolean(), color: z.enum(['cyan', 'blue', 'ice']), intensity: z.number().min(0).max(1) });
const settings = z.object({
  format: z.enum(Object.keys(FORMATS) as [keyof typeof FORMATS, ...(keyof typeof FORMATS)[]]),
  flight: z.enum(['parallel', 'turns']),
  clock: z.enum(Object.keys(CLOCKS) as [keyof typeof CLOCKS, ...(keyof typeof CLOCKS)[]]),
  minutes: z.number().int().min(1).max(60),
  practices: z.number().int().min(0).max(MAX_PRACTICES),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  lights: z.tuple([light, light, light, light]),
  ceilingLights: z.tuple([z.boolean(), z.boolean(), z.boolean(), z.boolean()]),
  ranked: z.boolean(),
}).refine(data => data.clock !== 'stopwatch' || data.minutes <= 30, 'จับเวลาเขียนได้สูงสุด 30 นาที');

export const createInput = z.object({ name, role, scenario: z.string().max(100), listed: z.boolean().optional(), settings });
export const actionInput = z.discriminatedUnion('action', [
  z.object({ action: z.literal('join'), name, role }),
  z.object({ action: z.literal('ready'), value: z.boolean() }),
  z.object({ action: z.literal('save'), draft, key }),
  z.object({ action: z.literal('compile'), draft, key }),
  z.object({ action: z.literal('stop'), draft, key }),
  z.object({ action: z.literal('practice'), id, count: z.number().int().min(0).max(MAX_PRACTICES), draft, key }),
  z.object({ action: z.literal('begin'), pair: z.array(id).length(2).optional() }),
  z.object({ action: z.literal('start'), matchId: id }),
  z.object({ action: z.literal('archive') }),
  z.object({ action: z.literal('close') }),
  z.object({ action: z.literal('delete'), confirm: z.string() }),
]);

function authenticate(room: Room, actor: Actor) {
  const digest = actor.token && /^[a-f0-9]{64}$/.test(actor.token) ? Buffer.from(hash(actor.token), 'hex') : null;
  if (actor.userId && !actor.watchOnly) return room.members.find(member => member.userId === actor.userId);
  if (!digest) return undefined;
  return room.members.find(member => !member.userId && (!actor.watchOnly || member.role === 'watch')
    && timingSafeEqual(digest, Buffer.from(member.tokenHash, 'hex')));
}

function memberOf(room: Room, actor: Actor) {
  const member = authenticate(room, actor);
  if (!member) throw new RuleError('เข้าห้องนี้ก่อนจึงจะเปิดดูได้', 403);
  return member;
}

function newMember(room: Pick<Room, 'scenario'>, actor: Actor, input: { name: string; role: Member['role'] }, token: string): Member {
  return {
    id: randomUUID(), tokenHash: hash(token), userId: actor.userId, name: input.name, role: input.role,
    ready: false, draft: input.role === 'pilot' && room.scenario.starter.length <= MAX_CODE ? room.scenario.starter : '', key: null,
    stoppedAt: null, savedAt: Date.now(),
  };
}

function adjusted(input: Settings): Settings {
  return { ...input, ranked: input.ranked && input.format === 'duel' && rankedEnabled() };
}

export async function createRoom(actor: Actor, input: z.infer<typeof createInput>) {
  const scenario = (await getScenarios()).find(scenario => scenario.slug === input.scenario);
  if (!scenario) throw new RuleError('ไม่พบโจทย์ที่เลือก', 404);
  const token = randomBytes(32).toString('hex');
  const owner = newMember({ scenario }, actor, input, token);
  const room: Room = {
    owner: owner.id, listed: input.listed ?? false, status: 'lobby', settings: adjusted(input.settings), scenario,
    members: [owner], prepAt: null, selected: [], round: 1, queue: [], advancing: [], matches: [],
  };
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomBytes(4).toString('hex').toUpperCase();
    const inserted = await db.battleRoom.createMany({ data: { code, state: json(room) }, skipDuplicates: true });
    if (inserted.count) return { code, token };
  }
  throw new RuleError('สร้างรหัสห้องไม่ได้ ลองใหม่อีกครั้ง', 503);
}

export async function listBattleRooms(): Promise<ListedRoom[]> {
  return db.$queryRaw<ListedRoom[]>`
    WITH candidates AS (
      SELECT code, state, "createdAt"
      FROM "BattleRoom"
      WHERE state->>'listed' = 'true' AND state->>'status' IN ('lobby', 'active')
    ), rooms AS (
      SELECT code, state, "createdAt",
        state->>'status' AS status,
        state->'settings'->>'format' AS format,
        CASE WHEN state->'settings'->>'format' = 'duel' THEN 2 ELSE ${MAX_PILOTS}::int END AS "pilotLimit",
        counts.host, counts.pilots, counts.watchers
      FROM candidates
      CROSS JOIN LATERAL (
        SELECT
          MAX(member->>'name') FILTER (WHERE member->>'id' = state->>'owner') AS host,
          COUNT(*) FILTER (WHERE member->>'role' = 'pilot')::int AS pilots,
          COUNT(*) FILTER (WHERE member->>'role' = 'watch')::int AS watchers
        FROM jsonb_array_elements(state->'members') AS member
      ) counts
    )
    SELECT code, state->'scenario'->>'title' AS title, COALESCE(host, '') AS host, status, format,
      state->'settings'->>'flight' AS flight,
      state->'settings'->>'difficulty' AS difficulty,
      (state->'settings'->>'ranked')::boolean AND ${rankedEnabled()} AS ranked,
      pilots, watchers, "pilotLimit", status = 'lobby' AND pilots < "pilotLimit" AS "canCompete"
    FROM rooms
    WHERE watchers < ${MAX_WATCHERS} OR (status = 'lobby' AND pilots < "pilotLimit")
    ORDER BY (status = 'lobby') DESC, "createdAt" DESC
    LIMIT 60
  `;
}

function shuffle<T>(ids: T[]) {
  const order = [...ids];
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function createMatch(room: Room) {
  return (members: string[], round: number) =>
    makeMatch(members, round, randomUUID(), randomInt(1, 2_147_483_647), shuffle, room.settings.flight);
}

async function lockedRoom(tx: Tx, code: string) {
  const [row] = await tx.$queryRaw<{ state: Room }[]>`SELECT state FROM "BattleRoom" WHERE code = ${code} FOR UPDATE`;
  if (!row) throw new RuleError('ไม่พบห้องนี้', 404);
  return row.state;
}

async function readRoom(code: string) {
  const record = await db.battleRoom.findUnique({ where: { code }, select: { state: true } });
  if (!record) throw new RuleError('ไม่พบห้องนี้', 404);
  return record.state as unknown as Room;
}

async function issueRatings(tx: Tx, room: Room) {
  if (!room.settings.ranked || !rankedEnabled() || room.settings.format !== 'duel') return false;
  const match = room.matches[0];
  if (!match || match.finishedAt === null || match.rating || match.seats.length !== 2) return false;
  const [a, b] = match.seats.map(seat => room.members.find(member => member.id === seat.member)!);
  if (!a.userId || !b.userId || a.userId === b.userId) return false;
  const [first, second] = match.seats;
  const order = compareFinish(first.result!, second.result!, room.settings.clock === 'stopwatch');

  // Lock ratings in the same account order even for simultaneous matches in separate rooms.
  const users = [{ id: a.userId, name: a.name }, { id: b.userId, name: b.name }].sort((a, b) => a.id.localeCompare(b.id));
  for (const user of users) await tx.battleRating.upsert({
    where: { userId: user.id }, create: { userId: user.id, name: user.name }, update: { name: user.name },
  });
  const scores = await tx.battleRating.findMany({ where: { userId: { in: [a.userId, b.userId] } } });
  const rating = new Map(scores.map(score => [score.userId, score.rating]));
  const delta = elo(rating.get(a.userId)!, rating.get(b.userId)!, order < 0 ? 1 : order > 0 ? 0 : 0.5);
  const logged = await tx.battleRatingGame.createMany({
    data: { id: match.id, players: json([{ userId: a.userId, delta: delta[0] }, { userId: b.userId, delta: delta[1] }]) },
    skipDuplicates: true,
  });
  if (!logged.count) return false;
  for (const [index, userId] of [a.userId, b.userId].entries()) {
    await tx.battleRating.update({ where: { userId }, data: { rating: { increment: delta[index] }, games: { increment: 1 } } });
  }
  match.rating = delta;
  return true;
}

function publicMatch(match: Room['matches'][number], now: number, revealCode: boolean) {
  return {
    ...match,
    seed: 0,
    seats: match.seats.map(seat => ({
      ...seat,
      endsAt: seat.endsAt !== null && seat.endsAt <= now ? seat.endsAt : null,
      result: seat.endsAt !== null && seat.endsAt <= now ? seat.result : null,
      code: revealCode ? seat.code : null,
    })),
  };
}

// Flight tapes are immutable. Reuse a bounded set across viewers polling the same match.
const tapes = new Map<string, Promise<Tape | null>>();
function readTape(code: string, id: string) {
  const cached = tapes.get(id);
  if (cached) {
    tapes.delete(id);
    tapes.set(id, cached);
    return cached;
  }
  const result = db.battleFlight.findFirst({ where: { roomCode: code, id }, select: { tape: true } })
    .then(record => record ? record.tape as unknown as Tape : null)
    .catch(error => { tapes.delete(id); throw error; });
  tapes.set(id, result);
  if (tapes.size > 32) tapes.delete(tapes.keys().next().value!);
  return result;
}

export async function roomView(code: string, actor: Actor, replay: string | null, offset: number): Promise<RoomView> {
  let room = await readRoom(code);
  let me = memberOf(room, actor);
  if (advance(structuredClone(room), Date.now(), createMatch(room))) {
    room = await db.$transaction(async tx => {
      const current = await lockedRoom(tx, code);
      memberOf(current, actor);
      if (advance(current, Date.now(), createMatch(current))) {
        await issueRatings(tx, current);
        await tx.battleRoom.update({ where: { code }, data: { state: json(current) } });
      }
      return current;
    });
    me = memberOf(room, actor);
  }
  const serverNow = Date.now();
  const active = activeMatch(room);
  const latest = room.matches.at(-1);
  const finished = room.status === 'complete' || room.status === 'archived';
  const selectedMatch = finished && replay
    ? room.matches.find(match => match.id === replay && match.finishedAt !== null)
    : active ?? latest;
  const playback: Record<string, FlightView> = {};
  const seats = selectedMatch?.seats.filter(seat => !!seat.flightId && seat.startedAt !== null) ?? [];
  if (seats.length && room.status !== 'closed') {
    await Promise.all(seats.map(async seat => {
      const tape = await readTape(code, seat.flightId!);
      if (!tape) return;
      const live = seat.endsAt !== null && serverNow < seat.endsAt;
      const at = finished && replay && Number.isFinite(offset) ? offset : serverNow - seat.startedAt!;
      playback[seat.member] = flightWindow(tape, at, live);
    }));
  }
  return {
    code, serverNow, status: room.status, settings: room.settings, scenario: { ...room.scenario, starter: '' }, owner: room.owner,
    members: room.members.map(({ id, name, ready, role, stoppedAt }) => ({ id, name, ready, role, stoppedAt })),
    me: {
      id: me.id, role: me.role, ready: me.ready, draft: me.role === 'pilot' ? me.draft : '', key: me.role === 'pilot' ? me.key : null, savedAt: me.savedAt, stoppedAt: me.stoppedAt,
      practices: practiceCount(me), canEdit: canEdit(room, me, serverNow), canPractice: canPractice(room, me, serverNow),
    },
    prepAt: room.prepAt, queue: room.status === 'active' ? room.queue : [],
    active: selectedMatch ? publicMatch(selectedMatch, serverNow, finished && selectedMatch.finishedAt !== null) : null,
    history: room.matches.filter(match => match.finishedAt !== null).map(match => publicMatch(match, serverNow, false)),
    standings: table(room), playback,
  };
}

async function startRoom(tx: Tx, room: Room, now: number, pair?: string[]) {
  const format = room.settings.format;
  const first = room.prepAt === null;
  if (room.matches.length >= MAX_MATCHES || (first ? room.status !== 'lobby' : format !== 'pairs' || room.status !== 'active' || activeMatch(room))) {
    throw new RuleError('ยังจัดคู่ใหม่ไม่ได้');
  }
  const pilots = room.members.filter(member => member.role === 'pilot');
  let eligible = pilots.map(member => member.id);
  if (format === 'final') {
    const scores = await tx.battleRating.findMany({ where: { userId: { in: pilots.flatMap(pilot => pilot.userId ? [pilot.userId] : []) } } });
    eligible = chooseFinalists(pilots, new Map(scores.map(score => [score.userId, score.rating])));
    if (eligible.length < 5) throw new RuleError('รอบชิงต้องมีผู้แข่งที่ล็อกอินอย่างน้อย 5 คน');
  }
  if (eligible.length < 2) throw new RuleError('ต้องมีผู้แข่งอย่างน้อย 2 คน');
  if (first && eligible.some(id => !pilots.find(pilot => pilot.id === id)?.ready)) throw new RuleError('รอผู้แข่งกดพร้อมให้ครบก่อน');
  if (format === 'pairs') {
    if (!pair || pair[0] === pair[1] || !pair.every(id => eligible.includes(id) && pilots.find(pilot => pilot.id === id)?.ready)) {
      throw new RuleError('เลือกผู้แข่งที่พร้อมสองคนจากคิว');
    }
    room.queue = [pair];
  } else if (format === 'bracket') {
    bracketRound(room, shuffle(eligible));
  } else {
    room.queue = pairUp(eligible);
  }
  if (first) {
    room.prepAt = now;
    room.selected = eligible;
  }
  const next = room.queue.shift()!;
  room.matches.push(createMatch(room)(next, room.round));
  room.status = 'active';
}

const save = (member: Member, code: string, key: number | null, now: number) => {
  member.draft = code;
  member.key = key;
  member.savedAt = now;
};

export async function act(code: string, actor: Actor, input: z.infer<typeof actionInput>) {
  if (actor.watchOnly && (input.action !== 'join' || input.role !== 'watch')) {
    throw new RuleError('ลิงก์นี้ใช้ดูการแข่งขัน', 403);
  }
  if (input.action === 'compile') {
    const room = await readRoom(code);
    const member = memberOf(room, actor);
    if (member.role !== 'pilot' || room.status === 'closed') throw new RuleError('เฉพาะผู้แข่งตรวจโค้ดได้', 403);
    return { compile: compileBattle(input.draft, input.key) };
  }

  return db.$transaction(async tx => {
    const room = await lockedRoom(tx, code);
    const now = Date.now();
    const existing = authenticate(room, actor);
    const advanced = advance(room, now, createMatch(room));
    if (advanced) await issueRatings(tx, room);
    if (input.action === 'join') {
      if (existing) return { joined: true };
      if (room.status !== 'lobby' && !((room.status === 'active' || room.status === 'complete') && input.role === 'watch')) throw new RuleError('ห้องนี้ปิดรับสมาชิกแล้ว');
      const count = room.members.filter(member => member.role === input.role).length;
      if (count >= (input.role === 'watch' ? MAX_WATCHERS : room.settings.format === 'duel' ? 2 : MAX_PILOTS)) throw new RuleError('ที่นั่งประเภทนี้เต็มแล้ว');
      if (room.members.some(member => member.role === input.role && member.name.toLowerCase() === input.name.toLowerCase())) throw new RuleError('ชื่อนี้มีคนใช้ในห้องแล้ว');
      const token = randomBytes(32).toString('hex');
      room.members.push(newMember(room, actor, input, token));
      await tx.battleRoom.update({ where: { code }, data: { state: json(room) } });
      return { joined: true, token };
    }

    const me = existing ?? memberOf(room, actor);
    const host = () => { if (room.owner !== me.id) throw new RuleError('เฉพาะเจ้าของห้องทำรายการนี้ได้', 403); };
    let payload: { compile?: ReturnType<typeof compileBattle>; tape?: Tape; savedAt?: number; deleted?: boolean } = {};
    switch (input.action) {
      case 'ready':
        if (room.status !== 'lobby' || me.role !== 'pilot') throw new RuleError('กดพร้อมได้ในห้องรอก่อนเริ่ม');
        me.ready = input.value;
        break;
      case 'save':
      case 'stop': {
        if (!canEdit(room, me, now)) throw new RuleError('โค้ดถูกล็อกแล้ว');
        if (input.action === 'stop') {
          const compiled = compileBattle(input.draft, input.key);
          if (!compiled.ok) return { compile: compiled };
          me.stoppedAt = now;
        }
        save(me, input.draft, input.key, now);
        payload = { savedAt: now };
        break;
      }
      case 'practice': {
        if (!canEdit(room, me, now)) throw new RuleError('หมดเวลาเขียนโค้ดแล้ว');
        if (me.practice?.requestId === input.id) {
          const flight = await tx.battleFlight.findFirst({ where: { id: me.practice.tapeId, roomCode: code } });
          return { tape: flight?.tape as unknown as Tape };
        }
        const count = practiceCount(me);
        if (input.count !== count) throw new RuleError('จำนวนรอบซ้อมเปลี่ยนแล้ว ลองกดอีกครั้ง');
        if (!canPractice(room, me, now)) throw new RuleError('หมดรอบทดลองบิน หรือถึงเวลาบินจริงแล้ว');
        const compiled = compileBattle(input.draft, input.key);
        if (!compiled.ok) return { compile: compiled };
        const tape = makeTape(room, input.draft, compiled.key, randomInt(1, 2_147_483_647));
        const tapeId = randomUUID();
        await tx.battleFlight.create({ data: { id: tapeId, roomCode: code, tape: json(tape) } });
        if (me.practice) await tx.battleFlight.deleteMany({ where: { id: me.practice.tapeId, roomCode: code } });
        me.practice = { count: count + 1, requestId: input.id, tapeId };
        delete me.practiceIds;
        payload = { tape };
        break;
      }
      case 'begin':
        host();
        await startRoom(tx, room, now, input.pair);
        break;
      case 'start': {
        const match = activeMatch(room);
        const seat = room.matches.find(item => item.id === input.matchId)?.seats.find(item => item.member === me.id);
        if (seat?.startedAt != null) {
          if (advanced) await tx.battleRoom.update({ where: { code }, data: { state: json(room) } });
          return {};
        }
        if (!match || match.id !== input.matchId || !seat || seat.endsAt !== null || seat.opensAt === null || seat.code === null || now < seat.opensAt) {
          throw new RuleError('ยังไม่ถึงคิวบิน หรือหมดเวลาของรอบนี้แล้ว');
        }
        const writingMs = writingTime(room, me);
        const compiled = compileBattle(seat.code, me.key);
        seat.startedAt = now;
        if (!compiled.ok || now >= seat.opensAt + START_WINDOW) {
          seat.result = dnf(writingMs);
          seat.endsAt = now;
          payload = { compile: compiled };
        } else {
          const tape = makeTape(room, seat.code, compiled.key, match.seed, now - seat.opensAt);
          seat.flightId = randomUUID();
          seat.endsAt = now + tape.duration;
          seat.result = { ...tape.finish, writingMs };
          await tx.battleFlight.create({ data: { id: seat.flightId, roomCode: code, tape: json(tape) } });
        }
        break;
      }
      case 'archive':
        host();
        if (activeMatch(room) || !room.matches.some(match => match.finishedAt !== null) || room.status === 'lobby') {
          throw new RuleError('รอให้รอบปัจจุบันจบก่อนเก็บห้อง');
        }
        room.status = 'archived';
        room.queue = [];
        break;
      case 'close':
        host();
        if (room.status === 'archived') throw new RuleError('ห้องนี้เก็บไว้แล้ว');
        if (activeMatch(room)) room.matches.pop();
        room.status = 'closed';
        break;
      case 'delete':
        host();
        if (input.confirm !== code) throw new RuleError('ยืนยันรหัสห้องก่อนลบ');
        for (const match of room.matches) for (const seat of match.seats) if (seat.flightId) tapes.delete(seat.flightId);
        await tx.battleRoom.delete({ where: { code } });
        return { deleted: true };
    }
    if (advance(room, Date.now(), createMatch(room))) await issueRatings(tx, room);
    await tx.battleRoom.update({ where: { code }, data: { state: json(room) } });
    return payload;
  }, { timeout: 10_000 });
}
