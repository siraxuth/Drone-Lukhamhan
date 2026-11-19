import type { Finish, Match, Member, Room } from './types';
import { TIME_LIMIT_MS } from '@/flight/engine';

export const START_WINDOW = 30_000;
export const MAX_PILOTS = 16;
export const MAX_MATCHES = 64;
export const MAX_CODE = 20_000;
export const MAX_WATCHERS = 32;
export const MAX_PRACTICES = 1_000_000;

export class RuleError extends Error {
  constructor(message: string, readonly status = 409) { super(message); }
}

export function deadline(room: Pick<Room, 'prepAt' | 'settings'>) {
  return room.prepAt === null || room.settings.clock === 'open' ? null : room.prepAt + room.settings.minutes * 60_000;
}

export function activeMatch(room: Room) {
  const match = room.matches.at(-1);
  return match && match.finishedAt === null && room.status === 'active' ? match : null;
}

export function canEdit(room: Room, member: Member, now: number) {
  if (member.role !== 'pilot' || member.stoppedAt !== null) return false;
  if (room.status !== 'active' || !room.selected.includes(member.id)) return false;
  const until = deadline(room);
  return until === null || now < until;
}

export function practiceCount(member: Member) {
  return member.practice?.count ?? member.practiceIds?.length ?? 0;
}

export function canPractice(room: Room, member: Member, now: number) {
  return room.status === 'active' && canEdit(room, member, now) && practiceCount(member) < room.settings.practices
    && !activeMatch(room)?.seats.some(seat => seat.opensAt !== null);
}

export function compareFinish(a: Finish, b: Finish, stopwatch: boolean) {
  return b.score - a.score || (stopwatch ? a.writingMs - b.writingMs : 0)
    || a.totalMs - b.totalMs || (a.exitMs ?? Infinity) - (b.exitMs ?? Infinity) || 0;
}

export function table(room: Room) {
  const best = new Map<string, { finish: Finish; round: number; won: boolean }>();
  const stopwatch = room.settings.clock === 'stopwatch';
  for (const match of room.matches) {
    if (match.finishedAt === null) continue;
    const [first, second] = match.seats;
    const order = first?.result && second?.result ? compareFinish(first.result, second.result, stopwatch) : -1;
    for (const [index, seat] of match.seats.entries()) {
      if (!seat.result) continue;
      const previous = best.get(seat.member);
      const rankByRound = room.settings.format === 'bracket';
      if (!previous || (rankByRound ? match.round >= previous.round : compareFinish(seat.result, previous.finish, stopwatch) < 0)) {
        best.set(seat.member, { finish: seat.result, round: match.round, won: index === 0 ? order < 0 : order > 0 });
      }
    }
  }
  type Entry = [string, { finish: Finish; round: number; won: boolean }];
  const compare = (a: Entry, b: Entry) =>
    (room.settings.format === 'bracket' ? b[1].round - a[1].round || Number(b[1].won) - Number(a[1].won) : 0)
    || compareFinish(a[1].finish, b[1].finish, stopwatch);
  const sorted = [...best].sort(compare);
  let rank = 1;
  return sorted.map(([member, finish], i) => {
    if (i && compare(sorted[i - 1], sorted[i])) rank = i + 1;
    return { member, rank, finish: finish.finish };
  });
}

export function pairUp(entries: string[]) {
  const pairs: string[][] = [];
  for (let i = 0; i < entries.length; i += 2) pairs.push(entries.slice(i, i + 2));
  return pairs;
}

export function chooseFinalists(members: Member[], ratings: Map<string, number>) {
  return members.filter(member => member.role === 'pilot' && member.userId)
    .sort((a, b) => (ratings.get(b.userId!) ?? 1000) - (ratings.get(a.userId!) ?? 1000))
    .slice(0, 5).map(member => member.id);
}

export function elo(a: number, b: number, outcome: number) {
  const change = Math.round(24 * (outcome - 1 / (1 + 10 ** ((b - a) / 400))));
  return [change, -change];
}

export function dnf(writingMs: number): Finish {
  return { score: 0, totalMs: START_WINDOW + TIME_LIMIT_MS, exitMs: null, writingMs, dnf: true };
}

export function initialMatch(ids: string[], id: string, seed: number, round: number): Match {
  return {
    id, seed, round, finishedAt: null, rating: null, wheelAt: null,
    seats: ids.map(member => ({ member, opensAt: null, flightId: null, startedAt: null, endsAt: null, code: null, result: null })),
  };
}
