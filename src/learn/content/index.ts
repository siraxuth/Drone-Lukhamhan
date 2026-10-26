import type { Track, TrackId, Unit } from '../types';
import { basicsTrack } from './basics';
import { codeTrack } from './code';
import { physicsTrack } from './physics';

/** ลำดับสายที่แสดงบนหน้า /learn */
export const TRACKS: Track[] = [codeTrack, basicsTrack, physicsTrack];

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
