import { db } from '@/lib/db';
import { TIER_IDS, TIERS, type Tier } from './daily';
import { dayKey } from './path';
import { leagueOf, rankRows, weekStartDate, weekStartKey } from './board-utils';

export type BoardId = 'xp' | 'week' | 'daily' | 'hard';
export type BoardRow = { userId: string; name: string; xp: number; value: number; extra?: string; time?: number | null; rank: number; me: boolean; league: string; leagueTone: string };
export type Board = { rows: BoardRow[]; total: number; me: { rank: number | null; value: number; hidden: boolean } | null };

const LIMIT = 30;

type Prof = { userId: string; displayName: string; xp: number; showOnBoard: boolean };
const dailyXp = (tier: string) => TIERS[tier as Tier]?.xp ?? 0;

async function profilesOf(ids: string[]): Promise<Map<string, Prof>> {
  const rows = await db.learnProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, displayName: true, xp: true, showOnBoard: true } });
  return new Map(rows.map((r) => [r.userId, r]));
}

type Scored = { userId: string; value: number; time?: number | null; extra?: string };

/**
 * ประกอบตาราง: ตัดผู้ที่ซ่อนชื่อออก เรียงตาม value (มากก่อน) แล้วเวลา (น้อยก่อน) จัดอันดับให้ค่าเท่ากันได้อันดับเดียวกัน
 * ส่งเฉพาะ LIMIT อันดับแรก + อันดับของตัวเอง (แม้ซ่อนชื่ออยู่ก็เห็นอันดับตัวเองคนเดียว) ไม่ส่งอีเมล
 */
async function assemble(scored: Scored[], meId: string, withTime = false): Promise<Board> {
  const profs = await profilesOf(scored.map((s) => s.userId));
  const sorted = [...scored].filter((s) => s.value > 0).sort((a, b) => b.value - a.value || (withTime ? (a.time ?? Infinity) - (b.time ?? Infinity) : 0));
  const visible = sorted.filter((s) => profs.get(s.userId)?.showOnBoard);
  const ranked = rankRows(visible, (a, b) => a.value === b.value && (!withTime || (a.time ?? null) === (b.time ?? null)));
  const rows: BoardRow[] = ranked.slice(0, LIMIT).map((r) => {
    const p = profs.get(r.userId) as Prof;
    const l = leagueOf(p.xp);
    return { userId: r.userId, name: p.displayName, xp: p.xp, value: r.value, extra: r.extra, time: r.time, rank: r.rank, me: r.userId === meId, league: l.name, leagueTone: l.tone };
  });
  const mine = sorted.find((s) => s.userId === meId);
  let me: Board['me'] = null;
  if (mine) {
    const hidden = !profs.get(meId)?.showOnBoard;
    const shown = ranked.find((r) => r.userId === meId);
    // อันดับของคนที่ซ่อนชื่อ: นับจากทุกคนที่ยังโชว์และมีค่ามากกว่า (ไม่เปิดเผยตัวตนใคร)
    const rank = shown ? shown.rank : 1 + visible.filter((v) => v.value > mine.value || (withTime && v.value === mine.value && (v.time ?? Infinity) < (mine.time ?? Infinity))).length;
    me = { rank, value: mine.value, hidden };
  }
  return { rows, total: visible.length, me };
}

/** XP รวมตลอดกาล */
export async function boardXp(meId: string): Promise<Board> {
  const rows = await db.learnProfile.findMany({ where: { xp: { gt: 0 } }, select: { userId: true, xp: true } });
  return assemble(rows.map((r) => ({ userId: r.userId, value: r.xp })), meId);
}

/** XP สัปดาห์นี้ (จันทร์ 00:00 เวลาไทยถึงตอนนี้): XP จากการจบหน่วย (ครั้งแรก) + ภารกิจรายวันที่ผ่านในสัปดาห์นี้ */
export async function boardWeek(meId: string): Promise<Board> {
  const today = dayKey();
  const [units, daily] = await Promise.all([
    db.unitProgress.groupBy({ by: ['userId'], where: { completedAt: { gte: weekStartDate(today) }, xp: { gt: 0 } }, _sum: { xp: true } }),
    db.dailyRun.findMany({ where: { solved: true, day: { gte: weekStartKey(today) } }, select: { userId: true, tier: true } }),
  ]);
  const sum = new Map<string, number>();
  for (const u of units) sum.set(u.userId, (sum.get(u.userId) ?? 0) + (u._sum.xp ?? 0));
  for (const d of daily) sum.set(d.userId, (sum.get(d.userId) ?? 0) + dailyXp(d.tier));
  return assemble([...sum].map(([userId, value]) => ({ userId, value })), meId);
}

/** ภารกิจรายวันของวันนี้ตามระดับ: คะแนนมากก่อน คะแนนเท่ากันดูเวลาบินที่เร็วกว่า */
export async function boardDaily(meId: string, tier: Tier): Promise<Board> {
  const rows = await db.dailyRun.findMany({ where: { day: dayKey(), tier, bestScore: { gt: 0 } }, select: { userId: true, bestScore: true, bestTimeMs: true, solved: true, maxScore: true } });
  return assemble(rows.map((r) => ({ userId: r.userId, value: r.bestScore, time: r.bestTimeMs, extra: r.solved ? 'เต็ม' : `จาก ${r.maxScore}` })), meId, true);
}

/** ผู้ที่ผ่านภารกิจรายวันระดับยากมากที่สุด (นับจำนวนวันที่ผ่านตลอดกาล) */
export async function boardHard(meId: string): Promise<Board> {
  const rows = await db.dailyRun.groupBy({ by: ['userId'], where: { tier: 'hard', solved: true }, _count: { _all: true } });
  return assemble(rows.map((r) => ({ userId: r.userId, value: r._count._all })), meId);
}

export async function loadBoard(id: BoardId, meId: string, tier: Tier): Promise<Board> {
  return id === 'xp' ? boardXp(meId) : id === 'week' ? boardWeek(meId) : id === 'daily' ? boardDaily(meId, tier) : boardHard(meId);
}

export { TIER_IDS };
