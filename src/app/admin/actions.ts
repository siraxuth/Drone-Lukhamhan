'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession, requireRole } from '@/lib/auth';
import { clean } from '@/lib/rich';
import { parseConfigStrict } from '@/lib/scenarios';

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
  title: z.string().min(1, 'ใส่ชื่อโจทย์'),
  brief: z.string(),
  starter: z.string(),
  seasonId: z.string(),
  level: z.enum(['เริ่มต้น', 'กลาง', 'ยาก']),
  order: z.coerce.number().int().min(0).max(999),
  slug: z.string().regex(/^[a-z0-9-]{0,60}$/, 'slug ใช้ได้เฉพาะ a-z 0-9 และขีดกลาง'),
});

export async function saveChallenge(id: string, f: FormData) {
  await guard();
  const here = `/admin/challenges/${id}`;
  const d = check(challengeSchema.safeParse({ title: text(f, 'title'), brief: clean(String(f.get('brief') ?? '')), starter: String(f.get('starter') ?? ''), seasonId: text(f, 'seasonId'), level: text(f, 'level') || 'เริ่มต้น', order: text(f, 'order') || '0', slug: text(f, 'slug').toLowerCase() }), here);
  const cfg = parseConfigStrict(text(f, 'config') || '{}');
  if (!cfg.ok) return back(here, cfg.error);
  const slug = d.slug || `c-${Date.now().toString(36)}`;
  const clash = await db.challenge.findFirst({ where: { slug, ...(id === 'new' ? {} : { NOT: { id } }) } });
  if (clash) return back(here, `slug "${slug}" ซ้ำกับโจทย์ "${clash.title}"`);
  const data = { title: d.title, brief: d.brief, starter: d.starter, seasonId: d.seasonId || null, config: cfg.config as object, level: d.level, order: d.order, slug, published: on(f, 'published') };
  if (id === 'new') await db.challenge.create({ data });
  else await db.challenge.update({ where: { id }, data });
  refresh('/admin', '/admin/challenges', '/simulator');
  done('/admin/challenges');
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
