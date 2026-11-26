import type { ScenarioView } from '@/lib/scenarios';
import type { CeilingLights, FlightDifficulty, FieldLights } from '@/flight/environment';
import type { Frame, SimEvent } from '@/flight/engine';

export const FORMATS = {
  duel: 'แข่งสองคน', pairs: 'เจ้าของเลือกคู่', bracket: 'แพ้คัดออก',
  standings: 'แข่งทุกคน จัดอันดับรวม', final: 'รอบชิง 5 คน',
} as const;

export const CLOCKS = {
  open: 'เขียนได้เรื่อย ๆ', fixed: 'เขียนเท่าที่เวลามี',
  stopwatch: 'จับเวลาเขียน แล้วกดหยุดเพื่อล็อก',
} as const;

export const PARALLEL_START = {
  together: 'คนเดียวกด เริ่มทั้งคู่',
  separate: 'ต่างคนต่างกด',
} as const;

export type ParallelStart = keyof typeof PARALLEL_START;

export type Settings = {
  format: keyof typeof FORMATS;
  flight: 'parallel' | 'turns';
  parallelStart?: ParallelStart;
  clock: keyof typeof CLOCKS;
  minutes: number;
  practices: number;
  difficulty: FlightDifficulty;
  lights: FieldLights;
  ceilingLights: CeilingLights;
  ranked: boolean;
};

export type Member = {
  id: string;
  tokenHash: string;
  userId: string | null;
  name: string;
  role: 'pilot' | 'watch';
  ready: boolean;
  draft: string;
  key: number | null;
  savedAt: number;
  stoppedAt: number | null;
  practiceIds?: string[];
  practice?: { count: number; requestId: string; tapeId: string };
};

export type Finish = { score: number; totalMs: number; exitMs: number | null; writingMs: number; dnf: boolean };
export type Seat = { member: string; opensAt: number | null; flightId: string | null; startedAt: number | null; endsAt: number | null; code: string | null; result: Finish | null };
export type Match = { id: string; seats: Seat[]; seed: number; round: number; wheelAt: number | null; finishedAt: number | null; rating: number[] | null };
export type Room = {
  owner: string;
  listed?: boolean;
  status: 'lobby' | 'active' | 'complete' | 'archived' | 'closed';
  settings: Settings;
  scenario: ScenarioView;
  members: Member[];
  prepAt: number | null;
  selected: string[];
  round: number;
  queue: string[][];
  advancing: string[];
  matches: Match[];
};
export type Tape = {
  frames: Frame[];
  events: SimEvent[];
  scores: { t: number; score: number }[];
  visits: { id: string; t: number }[];
  duration: number;
  finish: Omit<Finish, 'writingMs'>;
};
export type FlightView = {
  frames: Frame[];
  events: SimEvent[];
  visits: Tape['visits'];
  score: number;
  offset: number;
  duration: number;
  live: boolean;
};

export type RoomView = {
  code: string;
  serverNow: number;
  status: Room['status'];
  settings: Settings;
  scenario: ScenarioView;
  owner: string;
  members: Pick<Member, 'id' | 'name' | 'role' | 'ready' | 'stoppedAt'>[];
  me: Pick<Member, 'id' | 'role' | 'ready' | 'draft' | 'key' | 'savedAt' | 'stoppedAt'> & { practices: number; canEdit: boolean; canPractice: boolean };
  prepAt: number | null;
  active: Match | null;
  queue: string[][];
  history: Match[];
  standings: { member: string; rank: number; finish: Finish }[];
  playback: Record<string, FlightView>;
};

export type ListedRoom = {
  code: string;
  title: string;
  host: string;
  status: 'lobby' | 'active';
  flight: Settings['flight'];
  format: Settings['format'];
  difficulty: Settings['difficulty'];
  ranked: boolean;
  pilots: number;
  watchers: number;
  pilotLimit: number;
  canCompete: boolean;
};
