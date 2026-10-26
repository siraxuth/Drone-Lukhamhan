import { db } from '@/lib/db';
import { dayKey } from './path';

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
      activeToday: profile.lastActiveDay === today,
    },
    done,
  };
}
