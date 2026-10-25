import Link from 'next/link';
import { ArrowUpRight, Flag, FolderKanban, LayoutList, Puzzle, Users } from 'lucide-react';
import { db } from '@/lib/db';
import { PageHead, Panel, dateTh } from './ui';

export default async function AdminHome() {
  const [projects, seasons, challenges, sections, users, draft, recent] = await Promise.all([
    db.project.count(), db.season.count(), db.challenge.count(), db.section.count(), db.user.count(),
    db.project.count({ where: { published: false } }),
    db.project.findMany({ orderBy: { updatedAt: 'desc' }, take: 5 }),
  ]);
  const cards = [
    { href: '/admin/projects', label: 'ผลงาน', n: projects, note: draft ? `${draft} ฉบับร่าง` : 'เผยแพร่ครบ', icon: FolderKanban },
    { href: '/admin/seasons', label: 'ฤดูกาล / กติกา', n: seasons, note: 'ปีการแข่งขัน', icon: Flag },
    { href: '/admin/challenges', label: 'โจทย์ตัวจำลอง', n: challenges, note: 'ในตัวจำลอง', icon: Puzzle },
    { href: '/admin/sections', label: 'หมวดเนื้อหา', n: sections, note: 'จัดลำดับได้', icon: LayoutList },
    { href: '/admin/users', label: 'สมาชิก', n: users, note: 'ที่สมัครไว้', icon: Users },
  ];
  return (
    <>
      <PageHead title="แดชบอร์ด" desc="ภาพรวมเนื้อหาของเว็บไซต์ชมรม" newHref="/admin/projects/new" newLabel="เพิ่มผลงาน" />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="group flex items-start justify-between squircle-3xl border border-line bg-surface p-5 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
              <span>
                <span className="block text-base text-muted-foreground">{c.label}</span>
                <span className="mt-1 block font-display text-5xl font-extrabold text-brand-blue">{c.n}</span>
                <span className="mt-1 block text-base text-muted-foreground">{c.note}</span>
              </span>
              <span className="grid size-11 place-items-center squircle-xl bg-surface-2 transition-transform group-hover:-translate-y-0.5"><c.icon className="size-5" aria-hidden /></span>
            </Link>
          </li>
        ))}
      </ul>
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          <h2 className="font-display text-xl font-bold">แก้ไขล่าสุด</h2>
          <Link href="/admin/projects" className="inline-flex min-h-11 items-center text-base font-semibold text-brand-blue hover:underline">ผลงานทั้งหมด</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-lg text-muted-foreground">ยังไม่มีผลงาน เริ่มจากกด “เพิ่มผลงาน” ด้านบน</p>
        ) : (
          <ul className="grid gap-2">
            {recent.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/projects/${p.id}`} className="flex min-w-0 items-center justify-between gap-3 squircle-xl border border-line px-4 py-3 hover:bg-surface-2">
                  <span className="grid min-w-0 gap-0.5 sm:flex sm:flex-1 sm:items-center sm:justify-between sm:gap-3">
                    <span className="truncate text-lg font-medium">{p.title}</span>
                    <span className="shrink-0 text-base text-muted-foreground">{p.published ? '' : 'ฉบับร่าง · '}{dateTh(p.updatedAt)}</span>
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
