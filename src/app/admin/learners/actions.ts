'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { Prisma } from '@/generated/prisma/client';

const back = (msg: string): never => redirect(`/admin/learners?error=${encodeURIComponent(msg)}`);
const ok = (msg: string): never => redirect(`/admin/learners?ok=${encodeURIComponent(msg)}`);

/** ซ่อน/แสดงผู้เรียนในตารางอันดับ (ครูและแอดมิน) ใช้เมื่อชื่อที่ตั้งไม่เหมาะสมหรือผู้เรียนขอ */
export async function setVisibility(userId: string, show: boolean) {
  if (!(await requireRole('ADMIN', 'TEACHER'))) back('ไม่มีสิทธิ์');
  await db.learnProfile.update({ where: { userId }, data: { showOnBoard: show } }).catch(() => back('ไม่พบผู้เรียน'));
  revalidatePath('/learn/leaderboard');
  return ok(show ? 'แสดงในอันดับแล้ว' : 'ซ่อนจากอันดับแล้ว');
}

/** ตั้งชื่อที่แสดงกลับเป็นชื่อแรกของบัญชี (กรณีชื่อไม่เหมาะสม) และซ่อนจนกว่าผู้เรียนจะตั้งใหม่ */
export async function resetName(userId: string) {
  if (!(await requireRole('ADMIN', 'TEACHER'))) back('ไม่มีสิทธิ์');
  const u = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!u) back('ไม่พบผู้ใช้');
  const first = (u!.name ?? '').trim().split(/\s+/)[0] || 'ผู้เรียน';
  await db.learnProfile.update({ where: { userId }, data: { displayName: first.slice(0, 30), showOnBoard: false } }).catch(() => back('ผู้ใช้นี้ยังไม่เคยเข้าหน้าเรียน'));
  revalidatePath('/learn/leaderboard');
  return ok('ตั้งชื่อกลับเป็นชื่อแรกของบัญชีและซ่อนจากอันดับแล้ว');
}

/**
 * ล้างความคืบหน้าทั้งหมดของผู้เรียน (XP หน่วยที่จบ ประวัติ ทักษะ ผลภารกิจรายวัน แบบทดสอบก่อนเรียน) ย้อนกลับไม่ได้
 * เฉพาะแอดมิน และต้องกรอกอีเมลของผู้เรียนยืนยัน
 */
export async function resetProgress(userId: string, form: FormData) {
  if (!(await requireRole('ADMIN'))) back('เฉพาะแอดมินล้างความคืบหน้าได้');
  const u = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!u) back('ไม่พบผู้ใช้');
  if (String(form.get('confirm') ?? '').trim().toLowerCase() !== u!.email.toLowerCase()) back('อีเมลที่พิมพ์ยืนยันไม่ตรง ยังไม่ได้ล้างอะไร');
  await db.$transaction([
    db.unitProgress.deleteMany({ where: { userId } }),
    db.attempt.deleteMany({ where: { userId } }),
    db.skillStat.deleteMany({ where: { userId } }),
    db.dailyRun.deleteMany({ where: { userId } }),
    db.learnProfile.updateMany({ where: { userId }, data: { xp: 0, streak: 0, lastActiveDay: null, todayDay: null, todayXp: 0, placement: Prisma.DbNull } }),
  ]);
  revalidatePath('/learn', 'layout');
  return ok('ล้างความคืบหน้าแล้ว');
}
