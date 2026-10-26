import { findUnit, TRACKS } from './content';
import type { Track, Unit } from './types';

export type UnitState = 'locked' | 'ready' | 'done';

/** หน่วยที่ต้องจบก่อน: ตามที่ระบุ หรือหน่วยก่อนหน้าในสายเดียวกัน (หน่วยแรกเปิดเสมอ) */
export function prerequisites(track: Track, index: number): string[] {
  const u = track.units[index];
  if (u.requires) return u.requires;
  return index === 0 ? [] : [track.units[index - 1].id];
}

export function unitState(track: Track, index: number, done: ReadonlySet<string>): UnitState {
  const u = track.units[index];
  if (done.has(u.id)) return 'done';
  return prerequisites(track, index).every((id) => done.has(id)) ? 'ready' : 'locked';
}

/** สถานะทุกหน่วยของทุกสาย */
export function pathStates(done: ReadonlySet<string>): Record<string, UnitState> {
  const out: Record<string, UnitState> = {};
  for (const t of TRACKS) t.units.forEach((u, i) => { out[u.id] = unitState(t, i, done); });
  return out;
}

/** หน่วยถัดไปที่ควรทำ (หน่วยแรกที่พร้อมในสายบังคับ) */
export function nextUnit(done: ReadonlySet<string>): { track: Track; unit: Unit } | null {
  for (const t of TRACKS) {
    if (t.optional) continue;
    const i = t.units.findIndex((_, k) => unitState(t, k, done) === 'ready');
    if (i >= 0) return { track: t, unit: t.units[i] };
  }
  return null;
}

export function canStart(unitId: string, done: ReadonlySet<string>): boolean {
  const f = findUnit(unitId);
  return !!f && unitState(f.track, f.index, done) !== 'locked';
}

export const XP_PER_LEVEL = 100;
/** ระดับจาก XP: ทุก 100 XP = 1 ระดับ เริ่มที่ระดับ 1 */
export const levelOf = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;

/** วันที่แบบ YYYY-MM-DD ตามเวลาไทย (UTC+7) */
export function dayKey(d: Date = new Date()): string {
  return new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

const dayNum = (key: string) => Math.floor(Date.parse(`${key}T00:00:00Z`) / 86_400_000);

/** streak ใหม่เมื่อมีกิจกรรมวันนี้: วันเดียวกัน = เดิม · เมื่อวาน = +1 · ขาดวัน = เริ่ม 1 */
export function nextStreak(prev: { streak: number; lastActiveDay: string | null }, today: string): number {
  if (!prev.lastActiveDay) return 1;
  const gap = dayNum(today) - dayNum(prev.lastActiveDay);
  if (gap <= 0) return Math.max(1, prev.streak);
  return gap === 1 ? prev.streak + 1 : 1;
}
