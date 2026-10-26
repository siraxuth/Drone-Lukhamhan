'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getMission, isTier, TIERS } from '@/learn/daily';
import { gradeCode, MAX_CODE_CHARS } from '@/learn/grade';
import { dayKey, levelOf, nextStreak } from '@/learn/path';
import { getOrCreateProfile, recordSkills } from '@/learn/server';

export type DailyResult =
  | { ok: true; passed: boolean; score: number; max: number; timeMs: number | null; best: { score: number; timeMs: number | null }; improved: boolean; problems: string[]; xpGained: number; xp: number; level: number; attempts: number }
  | { ok: false; error: string };

/**
 * ส่งคำตอบภารกิจรายวัน (เฉพาะของ "วันนี้" ตามเวลาไทย) ตัดสินด้วยการรันโค้ดซ้ำในเอนจินที่เซิร์ฟเวอร์ ไม่เชื่อคะแนนจากไคลเอนต์
 * ผ่านเมื่อได้คะแนนเต็มของด่าน · เก็บคะแนนดีที่สุด (คะแนนเท่ากันเก็บเวลาบินที่เร็วกว่า) · ให้ XP ครั้งแรกที่ผ่านของ (วัน, ระดับ) เท่านั้น
 */
export async function submitDaily(tierRaw: string, code: unknown): Promise<DailyResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: 'กรุณาเข้าสู่ระบบ' };
  if (!isTier(tierRaw)) return { ok: false, error: 'ไม่พบระดับภารกิจ' };
  if (typeof code !== 'string' || code.length > MAX_CODE_CHARS) return { ok: false, error: 'โค้ดไม่ถูกต้องหรือยาวเกินไป' };
  const userId = session.user.id;
  const day = dayKey();
  const tier = tierRaw;
  const mission = getMission(day, tier);

  const recent = await db.attempt.count({ where: { userId, kind: 'daily', createdAt: { gt: new Date(Date.now() - 60_000) } } });
  if (recent >= 20) return { ok: false, error: 'ส่งถี่เกินไป รอสักครู่แล้วลองใหม่' };

  const g = gradeCode(code, mission.config, mission.max, []);
  const passed = g.passed;
  const prev = await db.dailyRun.findUnique({ where: { userId_day_tier: { userId, day, tier } } });
  const better = !prev || g.score > prev.bestScore || (g.score === prev.bestScore && g.timeMs !== null && (prev.bestTimeMs === null || g.timeMs < prev.bestTimeMs));
  const data = {
    bestScore: better ? g.score : prev!.bestScore,
    maxScore: mission.max,
    bestTimeMs: better ? g.timeMs : prev!.bestTimeMs,
    bestCode: better ? code : prev!.bestCode,
    attempts: (prev?.attempts ?? 0) + 1,
    solved: (prev?.solved ?? false) || passed,
  };
  await db.dailyRun.upsert({ where: { userId_day_tier: { userId, day, tier } }, update: data, create: { userId, day, tier, ...data } });
  await db.attempt.create({ data: { userId, kind: 'daily', refId: `${day}:${tier}`, score: Math.round((100 * g.score) / mission.max), passed, skills: mission.skills } });
  await recordSkills(userId, mission.skills, passed, TIERS[tier].level);

  const profile = await getOrCreateProfile(session.user);
  let xpGained = 0;
  if (passed && !prev?.solved) {
    xpGained = TIERS[tier].xp;
    const sameDay = profile.todayDay === day;
    await db.learnProfile.update({ where: { userId }, data: { xp: { increment: xpGained }, streak: nextStreak(profile, day), lastActiveDay: day, todayDay: day, todayXp: (sameDay ? profile.todayXp : 0) + xpGained } });
  }
  const after = xpGained ? profile.xp + xpGained : profile.xp;
  revalidatePath('/learn/daily');
  revalidatePath('/learn');
  return {
    ok: true, passed, score: g.score, max: mission.max, timeMs: g.timeMs,
    best: { score: data.bestScore, timeMs: data.bestTimeMs }, improved: better, problems: g.problems.slice(0, 4),
    xpGained, xp: after, level: levelOf(after), attempts: data.attempts,
  };
}
