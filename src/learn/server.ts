import { db } from '@/lib/db';
import { dayKey } from './path';
import { effective, isSkill, PRIOR, updateMastery, type Stat } from './skills';
import type { SkillId } from './types';

type SessionUser = { id: string; name?: string | null };

/** โปรไฟล์ผู้เรียน (สร้างให้อัตโนมัติครั้งแรกที่เข้า) ชื่อที่แสดงเริ่มจากชื่อแรกใน Google */
export async function getOrCreateProfile(user: SessionUser) {
  const existing = await db.learnProfile.findUnique({ where: { userId: user.id } });
  if (existing) return existing;
  const first = (user.name ?? '').trim().split(/\s+/)[0] || 'ผู้เรียน';
  return db.learnProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, displayName: first.slice(0, 30) } });
}

/** ข้อมูลผู้เรียนสำหรับแสดงผล: XP วันนี้ถูกรีเซ็ตเป็น 0 ถ้าข้ามวันแล้ว และ streak ที่ขาดวันแสดงเป็น 0 */
export async function loadLearner(user: SessionUser) {
  const profile = await getOrCreateProfile(user);
  const rows = await db.unitProgress.findMany({ where: { userId: user.id }, select: { unitId: true } });
  const done = new Set(rows.map((r) => r.unitId));
  const today = dayKey();
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));
  const alive = profile.lastActiveDay === today || profile.lastActiveDay === yesterday;
  return {
    profile: {
      displayName: profile.displayName,
      xp: profile.xp,
      streak: alive ? profile.streak : 0,
      todayXp: profile.todayDay === today ? profile.todayXp : 0,
      dailyGoal: profile.dailyGoal,
      showOnBoard: profile.showOnBoard,
      activeToday: profile.lastActiveDay === today,
      placement: (profile.placement == null ? 'none' : (profile.placement as { skipped?: boolean }).skipped ? 'skipped' : 'done') as 'none' | 'skipped' | 'done',
    },
    done,
  };
}

/** ความชำนาญของผู้เรียนทุกทักษะที่เคยวัด (ค่าดิบ) */
export async function loadStats(userId: string): Promise<Stat[]> {
  const rows = await db.skillStat.findMany({ where: { userId } });
  return rows.filter((r) => isSkill(r.skill)).map((r) => ({ skill: r.skill as SkillId, mastery: r.mastery, answered: r.answered, correct: r.correct, lastAt: r.lastAt }));
}

/** บันทึกผลตอบ 1 ครั้งเข้าโมเดลความชำนาญของทุกทักษะที่แบบฝึกนั้นวัด */
export async function recordSkills(userId: string, skills: SkillId[], correct: boolean, level: 1 | 2 | 3 | 4 | 5) {
  const rows = await db.skillStat.findMany({ where: { userId, skill: { in: skills } } });
  const now = new Date();
  await Promise.all(skills.map((skill) => {
    const cur = rows.find((r) => r.skill === skill);
    const mastery = updateMastery(cur?.mastery ?? PRIOR, cur?.answered ?? 0, correct, level);
    const data = { mastery, answered: (cur?.answered ?? 0) + 1, correct: (cur?.correct ?? 0) + (correct ? 1 : 0), lastAt: now };
    return db.skillStat.upsert({ where: { userId_skill: { userId, skill } }, update: data, create: { userId, skill, ...data } });
  }));
}

/** ความชำนาญที่ปรับตามเวลาแล้ว ต่อทักษะ (ทักษะที่ยังไม่เคยวัด = PRIOR) */
export const effectiveMap = (stats: Stat[]) => new Map(stats.map((s) => [s.skill, effective(s.mastery, s.lastAt)] as const));
