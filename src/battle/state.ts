import { activeMatch, compareFinish, deadline, dnf, initialMatch, MAX_MATCHES, pairUp, START_WINDOW } from './rules';
import type { Match, Member, Room, Seat } from './types';

type NextMatch = (members: string[], round: number) => Match;

export function bracketRound(room: Room, members: string[]) {
  room.queue = pairUp(members);
  room.advancing = room.queue.at(-1)?.length === 1 ? room.queue.pop()! : [];
}

export function addNextMatch(room: Room, make: NextMatch) {
  const next = room.queue.shift();
  if (next) {
    room.matches.push(make(next, room.round));
    room.status = 'active';
  } else if (room.settings.format !== 'pairs') {
    room.status = 'complete';
  }
}

export function writingTime(room: Room, member: Member) {
  return Math.max(0, (member.stoppedAt ?? room.prepAt ?? 0) - (room.prepAt ?? 0));
}

export function advance(room: Room, now: number, make: NextMatch) {
  if (room.status !== 'active') return false;
  let dirty = false;
  const until = deadline(room);
  if (until !== null && now >= until) {
    for (const member of room.members) {
      if (room.selected.includes(member.id) && member.stoppedAt === null) {
        member.stoppedAt = until;
        dirty = true;
      }
    }
  }
  const match = activeMatch(room);
  if (!match) return dirty;

  const memberFor = (seat: Seat) => room.members.find(member => member.id === seat.member)!;
  const lockSeat = (seat: Seat, open: number) => {
    seat.opensAt = open;
    seat.code = memberFor(seat).draft;
    dirty = true;
  };

  if (room.settings.flight === 'parallel') {
    if (match.seats.every(seat => memberFor(seat).stoppedAt !== null)) {
      const opens = match.round === 1 && room.matches.length === 1
        ? Math.max(...match.seats.map(seat => memberFor(seat).stoppedAt!))
        : now;
      for (const seat of match.seats) if (seat.opensAt === null) lockSeat(seat, opens);
    }
  } else {
    for (let i = 0; i < match.seats.length; i++) {
      const seat = match.seats[i], previous = match.seats[i - 1], stopped = memberFor(seat).stoppedAt;
      if (seat.opensAt === null && stopped !== null && (!previous || (previous.endsAt !== null && previous.endsAt <= now))) {
        if (i === 0 && match.wheelAt === null && match.seats.length > 1) {
          match.wheelAt = now;
          dirty = true;
        }
        const opens = match.wheelAt === null ? (room.matches.length === 1 ? stopped : now)
          : Math.max(stopped, match.wheelAt + 2200, previous?.endsAt ?? 0);
        lockSeat(seat, opens);
      }
    }
  }
  for (const seat of match.seats) {
    if (seat.opensAt !== null && seat.startedAt === null && seat.endsAt === null && now >= seat.opensAt + START_WINDOW) {
      seat.result = dnf(writingTime(room, memberFor(seat)));
      seat.endsAt = seat.opensAt + START_WINDOW;
      dirty = true;
    }
  }

  if (!match.seats.every(seat => seat.endsAt !== null && seat.endsAt <= now)) return dirty;
  match.finishedAt = Math.max(...match.seats.map(seat => seat.endsAt!));
  if (room.settings.format === 'bracket') {
    const [a, b] = match.seats;
    const order = b ? compareFinish(a.result!, b.result!, room.settings.clock === 'stopwatch') : -1;
    if (!order && b && room.matches.length < MAX_MATCHES) room.queue.unshift([a.member, b.member]);
    else if (order) room.advancing.push(order < 0 ? a.member : b.member);
    if (!room.queue.length && room.advancing.length > 1 && room.matches.length < MAX_MATCHES) {
      room.round++;
      bracketRound(room, room.advancing);
    }
  }
  if (room.matches.length >= MAX_MATCHES) {
    room.queue = [];
    room.status = 'complete';
  } else addNextMatch(room, make);
  return true;
}

export function makeMatch(ids: string[], round: number, id: string, seed: number, shuffle: (ids: string[]) => string[], flight: Room['settings']['flight']) {
  return initialMatch(flight === 'turns' ? shuffle(ids) : ids, id, seed, round);
}
