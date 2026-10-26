'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { PLACEMENT_BANK, type PQ } from '@/learn/content/placement';
import { findUnit, TRACKS } from '@/learn/content';
import { canStart } from '@/learn/path';
import { bandOf, effective, levelOfTrack, PLACEMENT_LENGTH, pickPlacement, pickReview, PRIOR, REVIEW_SIZE, updateMastery, type Band, type Candidate, type CandidateHistory, type Level, type Stat } from '@/learn/skills';
import { getOrCreateProfile, loadStats } from '@/learn/server';
import { isInteractive, toPublic, type PublicStep, type SkillId } from '@/learn/types';

const answersSchema = z.array(z.object({ id: z.string().max(20), choice: z.number().int().min(0).max(10) })).max(PLACEMENT_LENGTH);
type Answers = z.infer<typeof answersSchema>;
const publicQ = (q: PQ) => ({ id: q.id, question: q.question, code: q.code, options: q.options });

export type PlacementNext =
  | { ok: true; done: false; number: number; total: number; question: ReturnType<typeof publicQ> }
  | { ok: true; done: true }
  | { ok: false; error: string };

/** ตรวจประวัติคำตอบฝั่งเซิร์ฟเวอร์: แต่ละข้อต้องเป็นข้อที่ระบบจะถามจริงตามลำดับ (กันไคลเอนต์เลือกข้อเอง) แล้วคืนประวัติถูก/ผิด */
function replay(answers: Answers) {
  const history: Array<{ id: string; correct: boolean }> = [];
  for (const a of answers) {
    const expected = pickPlacement(PLACEMENT_BANK, history);
    if (!expected || expected.id !== a.id) return null;
    history.push({ id: a.id, correct: a.choice === expected.answer });
  }
  return history;
}

/** ข้อถัดไปของแบบทดสอบก่อนเรียน (adaptive) ส่งคำตอบทั้งหมดที่ทำมาแล้ว เซิร์ฟเวอร์ตรวจและเลือกข้อใหม่ให้ */
export async function placementNext(raw: unknown): Promise<PlacementNext> {
  const session = await requireUser();
  if (!session) return { ok: false, error: 'กรุณาเข้าสู่ระบบ' };
  const parsed = answersSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'ข้อมูลไม่ถูกต้อง' };
  const history = replay(parsed.data);
  if (!history) return { ok: false, error: 'ลำดับคำตอบไม่ถูกต้อง เริ่มทำใหม่อีกครั้ง' };
  const next = pickPlacement(PLACEMENT_BANK, history);
  return next ? { ok: true, done: false, number: history.length + 1, total: PLACEMENT_LENGTH, question: publicQ(next) } : { ok: true, done: true };
}

export type PlacementResult =
  | { ok: true; levels: Record<'code' | 'basics' | 'physics', Level | null>; skills: Array<{ skill: SkillId; mastery: number; band: Band; correct: number; answered: number }>; unlocked: Array<{ id: string; title: string }>; score: number }
  | { ok: false; error: string };

/**
 * จบแบบทดสอบก่อนเรียน: ตรวจคำตอบทั้งชุด ปรับความชำนาญของทักษะที่วัด สรุประดับต่อสาย
 * และปลดล็อกหน่วยตั้งแต่ต้นสายที่ทักษะที่ใช้ผ่านเกณฑ์ ≥ 0.8 ทุกตัว (ไม่ให้ XP เป็นเพียงข้ามให้ ผู้เรียนกลับไปเรียนหน่วยนั้นได้เสมอ)
 */
export async function placementFinish(raw: unknown): Promise<PlacementResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: 'กรุณาเข้าสู่ระบบ' };
  const parsed = answersSchema.safeParse(raw);
  if (!parsed.success || parsed.data.length !== PLACEMENT_LENGTH) return { ok: false, error: 'ยังทำแบบทดสอบไม่ครบ' };
  const history = replay(parsed.data);
  if (!history) return { ok: false, error: 'ลำดับคำตอบไม่ถูกต้อง เริ่มทำใหม่อีกครั้ง' };
  const userId = session.user.id;
  const profile = await getOrCreateProfile(session.user);
  const prev = profile.placement as { skipped?: boolean } | null;
  if (prev && !prev.skipped) return { ok: false, error: 'ทำแบบทดสอบก่อนเรียนไปแล้ว' };

  const stats = new Map((await loadStats(userId)).map((s) => [s.skill, s] as const));
  const fresh = new Map<SkillId, { m: number; n: number; c: number }>();
  for (const h of history) {
    const q = PLACEMENT_BANK.find((b) => b.id === h.id) as PQ;
    const cur = fresh.get(q.skill) ?? { m: stats.get(q.skill)?.mastery ?? PRIOR, n: stats.get(q.skill)?.answered ?? 0, c: stats.get(q.skill)?.correct ?? 0 };
    fresh.set(q.skill, { m: updateMastery(cur.m, cur.n, h.correct, q.level), n: cur.n + 1, c: cur.c + (h.correct ? 1 : 0) });
  }
  const now = new Date();
  await Promise.all([...fresh].map(([skill, v]) => db.skillStat.upsert({ where: { userId_skill: { userId, skill } }, update: { mastery: v.m, answered: v.n, correct: v.c, lastAt: now }, create: { userId, skill, mastery: v.m, answered: v.n, correct: v.c, lastAt: now } })));

  const all = [...(await loadStats(userId))];
  const levels = { code: levelOfTrack('code', all), basics: levelOfTrack('basics', all), physics: levelOfTrack('physics', all) };
  const skills = [...fresh].map(([skill, v]) => ({ skill, mastery: v.m, band: bandOf(effective(v.m, now), v.n), correct: v.c, answered: v.n }));

  // ปลดล็อกหน่วยตั้งแต่ต้นสาย (ต่อเนื่อง) ที่ทักษะทุกตัวที่หน่วยนั้นใช้ผ่านเกณฑ์
  const unlocked: Array<{ id: string; title: string }> = [];
  for (const track of TRACKS) {
    for (const unit of track.units) {
      const need = new Set(unit.steps.flatMap((s) => (isInteractive(s) ? s.skills : [])));
      const ok = need.size > 0 && [...need].every((sk) => (fresh.get(sk)?.m ?? 0) >= 0.8 && (fresh.get(sk)?.c ?? 0) >= 2);
      if (!ok) break;
      unlocked.push({ id: unit.id, title: unit.title });
    }
  }
  if (unlocked.length) await db.unitProgress.createMany({ data: unlocked.map((u) => ({ userId, unitId: u.id, xp: 0, bestScore: 0, attempts: 0 })), skipDuplicates: true });
  const score = Math.round((100 * history.filter((h) => h.correct).length) / history.length);
  await db.learnProfile.update({ where: { userId }, data: { placement: { at: now.toISOString(), score, levels, unlocked: unlocked.map((u) => u.id) } } });
  revalidatePath('/learn');
  return { ok: true, levels, skills, unlocked, score };
}

/** ข้ามแบบทดสอบก่อนเรียน (กลับมาทำทีหลังได้จากหน้า "วิเคราะห์ของฉัน") */
export async function skipPlacement(): Promise<{ ok: boolean }> {
  const session = await requireUser();
  if (!session) return { ok: false };
  const profile = await getOrCreateProfile(session.user);
  if (profile.placement == null) await db.learnProfile.update({ where: { userId: session.user.id }, data: { placement: { skipped: true } } });
  revalidatePath('/learn');
  return { ok: true };
}

export type ReviewItem = { unitId: string; index: number; trackId: string; unitTitle: string; step: Extract<PublicStep, { kind: 'quiz' }> };
export type ReviewStart = { ok: true; items: ReviewItem[]; weak: SkillId[] } | { ok: false; error: string };

/**
 * ชุดทบทวน 5 ข้อ จากข้อเลือกตอบที่ผู้เรียนเคยทำผ่านแล้ว: ~60% จากทักษะอ่อนที่สุด ~30% ข้อที่เคยพลาดหรือไม่ได้ทำนาน ~10% ข้อที่ยังไม่เคยตอบ
 * เฉลยไม่ถูกส่งไป (ตรวจด้วย submitStep เหมือนแบบฝึกปกติ)
 */
export async function startReview(): Promise<ReviewStart> {
  const session = await requireUser();
  if (!session) return { ok: false, error: 'กรุณาเข้าสู่ระบบ' };
  const userId = session.user.id;
  const rows = await db.attempt.findMany({ where: { userId, kind: 'step' }, orderBy: { createdAt: 'asc' }, select: { refId: true, passed: true, createdAt: true } });
  const hist = new Map<string, CandidateHistory>();
  const learned = new Set<string>();
  for (const r of rows) {
    const h = hist.get(r.refId) ?? { lastAt: null, everWrong: false };
    hist.set(r.refId, { lastAt: r.createdAt, everWrong: h.everWrong || !r.passed });
    if (r.passed) learned.add(r.refId);
  }
  const done = new Set((await db.unitProgress.findMany({ where: { userId }, select: { unitId: true } })).map((r) => r.unitId));
  const cands: Array<Candidate & { trackId: string; unitTitle: string }> = [];
  // เฉพาะหน่วยที่เข้าได้จริง (ไม่งั้นส่งคำตอบไม่ผ่านการตรวจสิทธิ์ของ submitStep)
  for (const t of TRACKS) for (const u of t.units) if (canStart(u.id, done)) u.steps.forEach((s, i) => { if (s.kind === 'quiz' && learned.has(`${u.id}#${i}`)) cands.push({ unitId: u.id, index: i, skills: s.skills, level: s.level, trackId: t.id, unitTitle: u.title }); });
  if (cands.length < 3) return { ok: false, error: 'ยังมีข้อทบทวนไม่พอ ลองจบหน่วยเรียนสัก 2 หน่วยก่อน แล้วกลับมาทบทวนได้' };
  const stats = await loadStats(userId);
  const eff = new Map(stats.map((s) => [s.skill, effective(s.mastery, s.lastAt)] as const));
  const picked = pickReview(cands, hist, eff, new Date(), REVIEW_SIZE);
  const items: ReviewItem[] = picked.map((c) => {
    const found = findUnit(c.unitId)!;
    const step = toPublic(found.unit.steps[c.index]) as Extract<PublicStep, { kind: 'quiz' }>;
    const meta = cands.find((x) => x.unitId === c.unitId && x.index === c.index)!;
    return { unitId: c.unitId, index: c.index, trackId: meta.trackId, unitTitle: meta.unitTitle, step };
  });
  const weak = stats.filter((s) => bandOf(effective(s.mastery, s.lastAt), s.answered) === 'weak').map((s) => s.skill);
  return { ok: true, items, weak };
}

export type { Stat };
