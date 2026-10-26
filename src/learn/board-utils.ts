/** ฟังก์ชันล้วนของ leaderboard: ระดับ (league) การจัดอันดับแบบเท่ากันได้อันดับเดียวกัน และขอบเขตสัปดาห์ */

export type League = { id: string; name: string; min: number; tone: string };

/** ระดับตาม XP รวม (หน่วยเรียนทั้งหมดรวมกันราว 700 XP ภารกิจรายวันเพิ่มได้อีกวันละสูงสุด 115) */
export const LEAGUES: League[] = [
  { id: 'rookie', name: 'ฝึกหัด', min: 0, tone: 'bg-surface-2 text-muted-foreground' },
  { id: 'cadet', name: 'นักบินฝึก', min: 100, tone: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  { id: 'pilot', name: 'นักบิน', min: 250, tone: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  { id: 'ace', name: 'นักบินเก๋า', min: 500, tone: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  { id: 'master', name: 'ปรมาจารย์', min: 800, tone: 'bg-amber-500/20 text-amber-700 dark:text-amber-300' },
  { id: 'legend', name: 'ตำนาน', min: 1200, tone: 'bg-brand-red/10 text-brand-red' },
];

export function leagueOf(xp: number): League {
  let cur = LEAGUES[0];
  for (const l of LEAGUES) if (xp >= l.min) cur = l;
  return cur;
}
/** ระดับถัดไป และ XP ที่ขาด (null = สูงสุดแล้ว) */
export function nextLeague(xp: number): { league: League; need: number } | null {
  const n = LEAGUES.find((l) => l.min > xp);
  return n ? { league: n, need: n.min - xp } : null;
}

/** Top Server = 10 อันดับแรกของ XP รวม และต้องอยู่ระดับ "ปรมาจารย์" ขึ้นไป (ไม่ใช่แค่ได้อันดับต้นตอนยังไม่มีใครเล่น) */
export const TOP_SERVER_SIZE = 10;
export const isTopServer = (rank: number, xp: number) => rank <= TOP_SERVER_SIZE && xp >= 800;

/**
 * จัดอันดับแบบแข่งขัน: ค่าเท่ากันได้อันดับเดียวกัน (เช่น 1,2,2,4) · rows ต้องเรียงจากดีไปแย่แล้ว
 * same(a,b) = ถือว่าเสมอกันหรือไม่
 */
export function rankRows<T>(rows: T[], same: (a: T, b: T) => boolean): Array<T & { rank: number }> {
  return rows.map((r, i) => {
    let rank = i + 1;
    if (i > 0 && same(rows[i - 1], r)) rank = (rowsRank(rows, i - 1, same));
    return { ...r, rank };
  });
}
function rowsRank<T>(rows: T[], i: number, same: (a: T, b: T) => boolean): number {
  let j = i;
  while (j > 0 && same(rows[j - 1], rows[j])) j--;
  return j + 1;
}

const dayNum = (key: string) => Math.floor(Date.parse(`${key}T00:00:00Z`) / 86_400_000);
const keyOf = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);
/** วันจันทร์ที่เป็นต้นสัปดาห์ของวัน (YYYY-MM-DD) · 1970-01-01 เป็นวันพฤหัสบดี */
export function weekStartKey(day: string): string {
  const n = dayNum(day);
  const dow = (n + 3) % 7; // จันทร์ = 0
  return keyOf(n - dow);
}
/** เวลาเริ่มสัปดาห์ (00:00 เวลาไทย) เป็น Date */
export const weekStartDate = (day: string) => new Date(`${weekStartKey(day)}T00:00:00+07:00`);

/** ชื่อที่แสดงในอันดับ: 2–30 ตัวอักษร ภาษาไทย/อังกฤษ/ตัวเลข ช่องว่าง . _ - เท่านั้น (กันลิงก์/อีเมล/อักขระควบคุม) */
export function cleanDisplayName(raw: string): string | null {
  const s = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (s.length < 2 || s.length > 30) return null;
  if (!/^[\p{L}\p{N}\p{M} ._-]+$/u.test(s)) return null;
  return s;
}
