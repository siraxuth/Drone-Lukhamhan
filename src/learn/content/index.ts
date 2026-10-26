import type { Track, TrackId, Unit } from '../types';
import { basicsTrack } from './basics';
import { codeTrack } from './code';
import { EXERCISES } from './exercises';
import { physicsTrack } from './physics';
import { systemsTrack } from './systems';

/** ลำดับสายที่แสดงบนหน้า /learn */
/** แบบฝึกต่อท้ายการ์ดอ่านของแต่ละหน่วย (แยกไฟล์ exercises.ts เพราะมีเฉลย อยู่ฝั่งเซิร์ฟเวอร์เท่านั้น) */
const withExercises = (t: Track): Track => ({ ...t, units: t.units.map((u) => ({ ...u, steps: [...u.steps, ...(EXERCISES[u.id] ?? [])] })) });
export const TRACKS: Track[] = [basicsTrack, codeTrack, systemsTrack, physicsTrack].map(withExercises);

export const trackById = (id: string): Track | undefined => TRACKS.find((t) => t.id === id);

/** หาหน่วยพร้อมสายที่สังกัด จากรหัสหน่วย */
export function findUnit(unitId: string): { track: Track; unit: Unit; index: number } | null {
  for (const track of TRACKS) {
    const index = track.units.findIndex((u) => u.id === unitId);
    if (index >= 0) return { track, unit: track.units[index], index };
  }
  return null;
}

export const ALL_UNIT_IDS = TRACKS.flatMap((t) => t.units.map((u) => u.id));
export type { TrackId };
