import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { db } from '@/lib/db';
import { abs } from '@/lib/site';
import { latestRelease } from '@/lib/changelog';

export const revalidate = 3600;

/** แผนที่เว็บ: หน้าหลัก + บทเรียนทุกหน้า + ผลงานที่เผยแพร่ (ดึงจากฐานข้อมูล) */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const built = new Date(latestRelease()?.date ?? Date.now());
  const fixed: MetadataRoute.Sitemap = [
    { url: abs('/'), lastModified: built, changeFrequency: 'weekly', priority: 1 },
    { url: abs('/docs'), lastModified: built, changeFrequency: 'weekly', priority: 0.9 },
    { url: abs('/simulator'), lastModified: built, changeFrequency: 'weekly', priority: 0.8 },
    { url: abs('/field'), lastModified: built, changeFrequency: 'monthly', priority: 0.8 },
    { url: abs('/works'), lastModified: built, changeFrequency: 'weekly', priority: 0.7 },
    { url: abs('/team'), lastModified: built, changeFrequency: 'monthly', priority: 0.4 },
    { url: abs('/changelog'), lastModified: built, changeFrequency: 'monthly', priority: 0.3 },
  ];
  const docs: MetadataRoute.Sitemap = source.getPages().filter((p) => p.url !== '/docs').map((p) => ({
    url: abs(p.url), lastModified: built, changeFrequency: 'monthly', priority: p.url.split('/').length <= 3 ? 0.7 : 0.6,
  }));
  let works: MetadataRoute.Sitemap = [];
  try {
    const rows = await db.project.findMany({ where: { published: true }, select: { id: true, updatedAt: true } });
    works = rows.map((w) => ({ url: abs(`/works/${w.id}`), lastModified: w.updatedAt, changeFrequency: 'monthly', priority: 0.5 }));
  } catch { /* ฐานข้อมูลเชื่อมไม่ได้ตอน build: ข้ามผลงาน */ }
  return [...fixed, ...docs, ...works];
}
