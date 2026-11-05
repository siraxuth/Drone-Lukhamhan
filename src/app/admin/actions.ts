'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession, requireRole } from '@/lib/auth';
import { clean } from '@/lib/rich';
import { parseConfigStrict } from '@/lib/scenarios';
import { challengeSlug } from '@/lib/challenge-slug';

type Role = 'ADMIN' | 'TEACHER' | 'MEMBER';

async function guard(...roles: Role[]) {
  const s = await requireRole(...(roles.length ? roles : (['ADMIN', 'TEACHER'] as Role[])));
  if (!s) throw new Error('ไม่มีสิทธิ์');
  return s;
}

const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const on = (f: FormData, k: string) => f.get(k) === 'on';
const lines = (f: FormData, k: string) => text(f, k).split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
const url = z.string().url('ลิงก์ไม่ถูกต้อง').or(z.literal(''));
const back = (path: string, msg: string): never => redirect(`${path}?error=${encodeURIComponent(msg)}`);
const done = (path: string, msg = 'บันทึกแล้ว'): never => redirect(`${path}?ok=${encodeURIComponent(msg)}`);
const refresh = (...paths: string[]) => paths.forEach((p) => revalidatePath(p));

function check<T>(r: z.ZodSafeParseResult<T>, path: string): T {
  if (!r.success) back(path, r.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง');
  return (r as z.ZodSafeParseSuccess<T>).data;
}

// ---------- ผลงาน (รวมทุก action ของ /admin ไว้ที่ไฟล์นี้) ----------
const projectSchema = z.object({
  title: z.string().min(1, 'ใส่ชื่อผลงาน'),
  year: z.coerce.number().int().min(2000, 'ปีไม่ถูกต้อง').max(2100, 'ปีไม่ถูกต้อง'),
  description: z.string(),
  image: url,
  videoUrl: url,
});

export async function saveProject(id: string, f: FormData) {
  await guard();
  const here = `/admin/projects/${id}`;
  const d = check(projectSchema.safeParse({ title: text(f, 'title'), year: text(f, 'year'), description: clean(String(f.get('description') ?? '')), image: text(f, 'image'), videoUrl: text(f, 'videoUrl') }), here);
  // แกลเลอรี: JSON ของรายการลิงก์รูป (เก็บเฉพาะลิงก์ที่ถูกต้อง ไม่ซ้ำ ไม่เกิน 40 รูป)
  let gallery: string[] = [];
  try { gallery = JSON.parse(text(f, 'images') || '[]'); } catch { back(here, 'รายการรูปแกลเลอรีไม่ถูกต้อง'); }
  const images = [...new Set((Array.isArray(gallery) ? gallery : []).filter((u): u is string => typeof u === 'string' && /^(https:\/\/|\/)/.test(u)))].slice(0, 40);
  const data = { ...d, image: d.image || null, images, videoUrl: d.videoUrl || null, location: text(f, 'location'), published: on(f, 'published') };
  if (id === 'new') await db.project.create({ data });
  else await db.project.update({ where: { id }, data });
  refresh('/', '/works', `/works/${id}`, '/admin', '/admin/projects');
  done('/admin/projects');
}

// ---------- ฤดูกาล / กติกา ----------
const seasonSchema = z.object({
  year: z.coerce.number().int().min(2000, 'ปีไม่ถูกต้อง').max(2100, 'ปีไม่ถูกต้อง'),
  title: z.string().min(1, 'ใส่ชื่อฤดูกาล'),
  summary: z.string(),
  fieldImage: url,
});

export async function saveSeason(id: string, f: FormData) {
  await guard();
  const here = `/admin/seasons/${id}`;
  const d = check(seasonSchema.safeParse({ year: text(f, 'year'), title: text(f, 'title'), summary: text(f, 'summary'), fieldImage: text(f, 'fieldImage') }), here);
  let rules: unknown = [];
  try { rules = JSON.parse(text(f, 'rules') || '[]'); } catch { back(here, 'กติกาอ่านไม่ได้'); }
  const data = { ...d, summary: d.summary || null, fieldImage: d.fieldImage || null, rules: rules as object, videoUrls: lines(f, 'videoUrls'), published: on(f, 'published') };
  try {
    if (id === 'new') await db.season.create({ data });
    else await db.season.update({ where: { id }, data });
  } catch {
    back(here, 'ปีนี้มีอยู่แล้ว');
  }
  refresh('/admin', '/admin/seasons');
  done('/admin/seasons');
}

// ---------- หมวดเนื้อหา ----------
const sectionSchema = z.object({
  slug: z.string().min(1, 'ใส่ slug').regex(/^[a-z0-9-]+$/, 'slug ใช้ a-z 0-9 และ - เท่านั้น'),
  title: z.string().min(1, 'ใส่ชื่อหมวด'),
  quote: z.string(),
  body: z.string(),
  order: z.coerce.number().int(),
});

export async function saveSection(id: string, f: FormData) {
  await guard();
  const here = `/admin/sections/${id}`;
  const d = check(sectionSchema.safeParse({ slug: text(f, 'slug'), title: text(f, 'title'), quote: text(f, 'quote'), body: clean(String(f.get('body') ?? '')), order: text(f, 'order') || '0' }), here);
  const data = { ...d, quote: d.quote || null, published: on(f, 'published') };
  try {
    if (id === 'new') await db.section.create({ data });
    else await db.section.update({ where: { id }, data });
  } catch {
    back(here, 'slug นี้มีอยู่แล้ว');
  }
  refresh('/admin', '/admin/sections');
  done('/admin/sections');
}

// ---------- โจทย์ฝึกของตัวจำลอง ----------
const challengeSchema = z.object({
  title: z.string().min(1, 'ใส่ชื่อภารกิจก่อนบันทึก').max(200, 'ชื่อภารกิจยาวเกิน 200 ตัวอักษร'),
  brief: z.string(),
  starter: z.string(),
  level: z.enum(['เริ่มต้น', 'กลาง', 'ยาก', 'โหดมาก']),
  order: z.coerce.number().int().min(0, 'ลำดับต้องไม่น้อยกว่า 0').max(999, 'ลำดับต้องไม่เกิน 999'),
});

export async function saveChallenge(id: string, f: FormData): Promise<
  { ok: true; id: string; slug: string; published: boolean } | { ok: false; error: string; field?: string }
> {
  const session = await requireRole('ADMIN', 'TEACHER');
  if (!session) return { ok: false, error: 'ไม่มีสิทธิ์บันทึก กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลหรือครู' };
  const parsed = challengeSchema.safeParse({ title: text(f, 'title'), brief: clean(String(f.get('brief') ?? '')), starter: String(f.get('starter') ?? ''), level: text(f, 'level'), order: text(f, 'order') || '0' });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue?.path[0] ?? 'title');
    const labels: Record<string, string> = { title: 'ชื่อโจทย์', level: 'ระดับความยาก', order: 'ลำดับในรายการ' };
    return { ok: false, field, error: `${labels[field] ?? 'ข้อมูลโจทย์'}: ${issue?.message ?? 'ตรวจข้อมูลอีกครั้ง'}` };
  }
  const cfg = parseConfigStrict(text(f, 'config') || '{}');
  if (!cfg.ok) return { ok: false, field: 'config', error: `ตั้งค่าสนาม: ${cfg.error}` };
  try {
    const d = parsed.data;
    const existing = id === 'new' ? null : await db.challenge.findUnique({ where: { id }, select: { slug: true } });
    if (id !== 'new' && !existing) return { ok: false, error: 'ไม่พบภารกิจนี้ อาจถูกลบไปแล้ว' };
    const base = existing?.slug || challengeSlug(d.title);
    let slug = base;
    if (!existing?.slug) {
      const siblings = await db.challenge.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } });
      const used = new Set(siblings.map(row => row.slug));
      let suffix = 2;
      while (used.has(slug)) slug = `${base}-${suffix++}`;
    }
    const data = { ...d, config: { ...cfg.config, requiresPayload: cfg.config.event === 'mission' || cfg.config.objects.some(o => o.type === 'platform') }, slug, published: on(f, 'published') };
    const saved = id === 'new' ? await db.challenge.create({ data }) : await db.challenge.update({ where: { id }, data });
    refresh('/admin', '/admin/challenges', '/simulator', `/admin/challenges/${saved.id}`);
    return { ok: true, id: saved.id, slug, published: saved.published };
  } catch (error) {
    console.error('saveChallenge failed', error);
    return { ok: false, error: 'บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง ข้อมูลที่กรอกยังอยู่ครบ' };
  }
}

// ---------- ใช้ร่วมกัน ----------
const models = { project: db.project, season: db.season, section: db.section, challenge: db.challenge } as const;
export type ModelName = keyof typeof models;
const listPath: Record<ModelName, string> = { project: '/admin/projects', season: '/admin/seasons', section: '/admin/sections', challenge: '/admin/challenges' };

export async function setPublished(model: ModelName, id: string, value: boolean) {
  await guard();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (models[model] as any).update({ where: { id }, data: { published: value } });
  refresh('/', '/works', '/admin', '/simulator', listPath[model]);
}

export async function removeItem(model: ModelName, id: string) {
  await guard();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (models[model] as any).delete({ where: { id } });
  refresh('/', '/works', '/admin', listPath[model]);
}

// ---------- สมาชิก (เฉพาะแอดมิน) ----------
export async function setRole(userId: string, f: FormData) {
  const s = await guard('ADMIN');
  const role = text(f, 'role');
  if (!['ADMIN', 'TEACHER', 'MEMBER'].includes(role)) back('/admin/users', 'สิทธิ์ไม่ถูกต้อง');
  if (userId === s.user.id) back('/admin/users', 'เปลี่ยนสิทธิ์ของตัวเองไม่ได้');
  await db.user.update({ where: { id: userId }, data: { role: role as Role } });
  refresh('/admin/users');
  done('/admin/users', 'เปลี่ยนสิทธิ์แล้ว');
}

export async function removeUser(userId: string) {
  const s = await guard('ADMIN');
  if (userId === s.user.id) return;
  await db.user.delete({ where: { id: userId } });
  refresh('/admin/users', '/admin');
}

export async function currentUser() {
  return getSession();
}
