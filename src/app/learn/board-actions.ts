'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { cleanDisplayName } from '@/learn/board-utils';
import { getOrCreateProfile } from '@/learn/server';

export type BoardSettingsResult = { ok: true; displayName: string; showOnBoard: boolean } | { ok: false; error: string };

/** ตั้งชื่อที่แสดงในอันดับ และเลือกว่าจะโชว์ชื่อในตารางหรือไม่ (ไม่แสดงอีเมลในทุกกรณี) */
export async function saveBoardSettings(rawName: unknown, rawShow: unknown): Promise<BoardSettingsResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: 'กรุณาเข้าสู่ระบบ' };
  const name = z.string().max(200).safeParse(rawName);
  const show = z.boolean().safeParse(rawShow);
  if (!name.success || !show.success) return { ok: false, error: 'ข้อมูลไม่ถูกต้อง' };
  const clean = cleanDisplayName(name.data);
  if (!clean) return { ok: false, error: 'ชื่อที่แสดงต้องยาว 2–30 ตัวอักษร ใช้ภาษาไทย อังกฤษ ตัวเลข ช่องว่าง . _ - เท่านั้น' };
  await getOrCreateProfile(session.user);
  await db.learnProfile.update({ where: { userId: session.user.id }, data: { displayName: clean, showOnBoard: show.data } });
  revalidatePath('/learn', 'layout');
  return { ok: true, displayName: clean, showOnBoard: show.data };
}
