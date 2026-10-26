'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { findUnit } from '@/learn/content';
import { canStart, dayKey, levelOf, nextStreak } from '@/learn/path';
import { getOrCreateProfile } from '@/learn/server';

export type CompleteResult =
  | { ok: true; firstTime: boolean; xpGained: number; xp: number; level: number; streak: number }
  | { ok: false; error: string };

/**
 * จบหน่วยเรียน: ให้ XP เฉพาะครั้งแรกที่จบ (จบซ้ำนับจำนวนครั้งแต่ไม่ให้ XP เพิ่ม) · อัปเดต streak และ XP ของวันนี้
 * ตัดสินฝั่งเซิร์ฟเวอร์ทั้งหมด: ตรวจว่าหน่วยมีจริงและผู้เรียนปลดล็อกแล้ว
 */
export async function completeUnit(raw: string): Promise<CompleteResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: 'กรุณาเข้าสู่ระบบ' };
  const parsed = z.string().min(1).max(80).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'ข้อมูลไม่ถูกต้อง' };
  const found = findUnit(parsed.data);
  if (!found) return { ok: false, error: 'ไม่พบหน่วยเรียนนี้' };

  const userId = session.user.id;
  const rows = await db.unitProgress.findMany({ where: { userId }, select: { unitId: true } });
  const done = new Set(rows.map((r) => r.unitId));
  if (!canStart(found.unit.id, done)) return { ok: false, error: 'ยังไม่ปลดล็อกหน่วยนี้ ต้องจบหน่วยก่อนหน้าก่อน' };

  const profile = await getOrCreateProfile(session.user);
  const created = await db.unitProgress.createMany({ data: [{ userId, unitId: found.unit.id, xp: found.unit.xp, bestScore: 100 }], skipDuplicates: true });
  const firstTime = created.count === 1;
  if (!firstTime) await db.unitProgress.update({ where: { userId_unitId: { userId, unitId: found.unit.id } }, data: { attempts: { increment: 1 } } });

  const today = dayKey();
  const xpGained = firstTime ? found.unit.xp : 0;
  const sameDay = profile.todayDay === today;
  const updated = await db.learnProfile.update({
    where: { userId },
    data: {
      xp: { increment: xpGained },
      streak: nextStreak(profile, today),
      lastActiveDay: today,
      todayDay: today,
      todayXp: (sameDay ? profile.todayXp : 0) + xpGained,
    },
  });
  await db.attempt.create({ data: { userId, kind: 'unit', refId: found.unit.id, score: 100, passed: true, skills: [] } });
  revalidatePath('/learn');
  return { ok: true, firstTime, xpGained, xp: updated.xp, level: levelOf(updated.xp), streak: updated.streak };
}
