'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { findUnit } from '@/learn/content';
import { gradeCode, MAX_CODE_CHARS } from '@/learn/grade';
import { canStart, dayKey, levelOf, nextStreak } from '@/learn/path';
import { getOrCreateProfile } from '@/learn/server';
import { wrapSetup } from '@/learn/wrap';
import { isInteractive, stepRef } from '@/learn/types';

export type StepResult =
  | { ok: true; passed: boolean; message: string; explain?: string; detail?: { score: number; max: number | null; problems: string[]; missing: string[] }; wrong?: number[] }
  | { ok: false; error: string };

export type CompleteResult =
  | { ok: true; firstTime: boolean; xpGained: number; xp: number; level: number; streak: number; accuracy: number }
  | { ok: false; error: string };

const MISSING_HINT = (m: string[]) => `ยังไม่ได้ใช้คำสั่ง ${m.join(', ')} (หรืออยู่ผิดลำดับ)`;

/**
 * ตรวจคำตอบแบบฝึกหนึ่งข้อ ตัดสินที่เซิร์ฟเวอร์ทั้งหมด (เฉลยไม่เคยถูกส่งไปไคลเอนต์) แล้วบันทึก Attempt
 * answer: quiz = ลำดับตัวเลือก · fill = ลำดับตัวเลือกของแต่ละช่อง · arrange = บล็อกที่เรียงแล้ว · write = ข้อความโค้ด
 */
export async function submitStep(unitId: string, stepIndex: number, answer: unknown): Promise<StepResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: 'กรุณาเข้าสู่ระบบ' };
  const found = findUnit(String(unitId).slice(0, 80));
  const step = found?.unit.steps[Number(stepIndex)];
  if (!found || !step || !isInteractive(step)) return { ok: false, error: 'ไม่พบแบบฝึกข้อนี้' };
  const userId = session.user.id;

  const rows = await db.unitProgress.findMany({ where: { userId }, select: { unitId: true } });
  if (!canStart(found.unit.id, new Set(rows.map((r) => r.unitId)))) return { ok: false, error: 'ยังไม่ปลดล็อกหน่วยนี้' };
  const recent = await db.attempt.count({ where: { userId, kind: 'step', createdAt: { gt: new Date(Date.now() - 60_000) } } });
  if (recent >= 40) return { ok: false, error: 'ส่งคำตอบถี่เกินไป รอสักครู่แล้วลองใหม่' };

  let passed = false, score = 0, message = '', detail: Extract<StepResult, { ok: true }>['detail'], wrong: number[] | undefined;

  if (step.kind === 'quiz') {
    const a = z.number().int().min(0).max(step.options.length - 1).safeParse(answer);
    if (!a.success) return { ok: false, error: 'คำตอบไม่ถูกต้อง' };
    passed = a.data === step.answer; score = passed ? 100 : 0;
    message = passed ? 'ถูกต้อง!' : 'ยังไม่ใช่ ลองอ่านตัวเลือกอีกรอบ';
  } else if (step.kind === 'fill') {
    const a = z.array(z.number().int().min(0).max(50)).length(step.blanks.length).safeParse(answer);
    if (!a.success) return { ok: false, error: 'ต้องเลือกให้ครบทุกช่อง' };
    wrong = a.data.flatMap((v, i) => (v === step.blanks[i].answer ? [] : [i]));
    passed = wrong.length === 0; score = Math.round(100 * (1 - wrong.length / step.blanks.length));
    message = passed ? 'ถูกครบทุกช่อง!' : `ถูก ${step.blanks.length - wrong.length} จาก ${step.blanks.length} ช่อง ช่องที่ผิดถูกไฮไลต์ไว้`;
  } else {
    const code = step.kind === 'arrange'
      ? (() => { const a = z.array(z.string().max(120)).max(30).safeParse(answer); return a.success && a.data.every((l) => step.blocks.includes(l)) ? wrapSetup(a.data) : null; })()
      : (() => { const a = z.string().max(MAX_CODE_CHARS).safeParse(answer); return a.success ? a.data : null; })();
    if (code === null) return { ok: false, error: 'คำตอบไม่ถูกต้อง' };
    const g = gradeCode(code, step.scenario, step.minScore, step.mustInclude);
    passed = g.passed; score = g.max ? Math.min(100, Math.round((100 * g.score) / g.max)) : g.passed ? 100 : 0;
    detail = { score: g.score, max: g.max, problems: g.problems.slice(0, 4), missing: g.missing };
    message = passed ? `โดรนทำภารกิจสำเร็จ ได้ ${g.score}${g.max ? ` / ${g.max}` : ''} คะแนน` : g.problems.length ? 'โค้ดยังมีข้อผิดพลาด ดูสาเหตุด้านล่าง' : g.missing.length ? MISSING_HINT(g.missing) : `ได้ ${g.score} คะแนน ยังไม่ถึงเกณฑ์ ${step.minScore} ลองกด "ดูโดรนบิน" แล้วสังเกตว่าพลาดตรงไหน`;
  }

  await db.attempt.create({ data: { userId, kind: 'step', refId: stepRef(found.unit.id, Number(stepIndex)), score, passed, skills: step.skills } });
  return { ok: true, passed, message, explain: passed ? step.explain : undefined, detail, wrong };
}

/** ข้อที่ผู้เรียนผ่านแล้วของหน่วยนี้ (ลำดับ index ในหน่วย) */
export async function passedSteps(userId: string, unitId: string): Promise<number[]> {
  const rows = await db.attempt.findMany({ where: { userId, kind: 'step', passed: true, refId: { startsWith: `${unitId}#` } }, select: { refId: true } });
  return [...new Set(rows.map((r) => Number(r.refId.split('#')[1])))];
}

/**
 * จบหน่วยเรียน: ต้องผ่านแบบฝึกทุกข้อของหน่วยก่อน (ตรวจจากประวัติฝั่งเซิร์ฟเวอร์ ข้ามไม่ได้)
 * ให้ XP เฉพาะครั้งแรกที่จบ · คะแนนหน่วย = % ของแบบฝึกที่ตอบถูกตั้งแต่ครั้งแรก · อัปเดต streak และ XP วันนี้
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

  const interactive = found.unit.steps.map((s, i) => (isInteractive(s) ? i : -1)).filter((i) => i >= 0);
  const attempts = interactive.length
    ? await db.attempt.findMany({ where: { userId, kind: 'step', refId: { startsWith: `${found.unit.id}#` } }, orderBy: { createdAt: 'asc' }, select: { refId: true, passed: true } })
    : [];
  const byStep = new Map<number, boolean[]>();
  for (const a of attempts) { const i = Number(a.refId.split('#')[1]); byStep.set(i, [...(byStep.get(i) ?? []), a.passed]); }
  if (interactive.some((i) => !(byStep.get(i) ?? []).includes(true))) return { ok: false, error: 'ยังทำแบบฝึกไม่ครบ ทำให้ผ่านทุกข้อก่อนจบหน่วย' };
  const firstTry = interactive.filter((i) => byStep.get(i)?.[0] === true).length;
  const accuracy = interactive.length ? Math.round((100 * firstTry) / interactive.length) : 100;

  const profile = await getOrCreateProfile(session.user);
  const created = await db.unitProgress.createMany({ data: [{ userId, unitId: found.unit.id, xp: found.unit.xp, bestScore: accuracy }], skipDuplicates: true });
  const firstTime = created.count === 1;
  if (!firstTime) {
    const cur = await db.unitProgress.findUnique({ where: { userId_unitId: { userId, unitId: found.unit.id } }, select: { bestScore: true } });
    await db.unitProgress.update({ where: { userId_unitId: { userId, unitId: found.unit.id } }, data: { attempts: { increment: 1 }, bestScore: Math.max(cur?.bestScore ?? 0, accuracy) } });
  }

  const today = dayKey();
  const xpGained = firstTime ? found.unit.xp : 0;
  const sameDay = profile.todayDay === today;
  const updated = await db.learnProfile.update({
    where: { userId },
    data: { xp: { increment: xpGained }, streak: nextStreak(profile, today), lastActiveDay: today, todayDay: today, todayXp: (sameDay ? profile.todayXp : 0) + xpGained },
  });
  await db.attempt.create({ data: { userId, kind: 'unit', refId: found.unit.id, score: accuracy, passed: true, skills: [] } });
  revalidatePath('/learn');
  return { ok: true, firstTime, xpGained, xp: updated.xp, level: levelOf(updated.xp), streak: updated.streak, accuracy };
}
