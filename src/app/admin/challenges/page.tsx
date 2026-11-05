import Link from 'next/link';
import { db } from '@/lib/db';
import { ScenePreview } from '@/field/ScenePlan';
import { LEVELS, parseConfig, PATTERNS } from '@/lib/scenarios';
import { scenarioSeeds } from '@/lib/scenario-seeds';
import { expandedMissions } from '@/lib/mission-expansion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RowMenu } from '../client';
import { Notice, PageHead, StatusBadge } from '../ui';
import { importMissingChallenges } from '../actions';
import { ImportButton } from './ImportButton';

const TONE: Record<string, string> = { เริ่มต้น: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', กลาง: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', ยาก: 'bg-rose-500/15 text-rose-700 dark:text-rose-300', 'โหดมาก': 'bg-brand-red/15 text-brand-red' };
const PAGE_SIZE = 30;

export default async function ChallengesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; q?: string; level?: string; page?: string }> }) {
  const { ok, error, q = '', level = '', page = '1' } = await searchParams;
  const saved = await db.challenge.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
  const builtIn = [...scenarioSeeds, ...expandedMissions];
  const savedSlugs = new Set(saved.map((row) => row.slug));
  const catalog = [
    ...saved.map((row) => ({ source: 'database' as const, id: row.id, slug: row.slug ?? row.id, title: row.title, level: row.level, order: row.order, config: parseConfig(row.config), published: row.published })),
    ...builtIn.filter((seed) => !savedSlugs.has(seed.slug)).map((seed) => ({ source: 'built-in' as const, id: seed.slug, slug: seed.slug, title: seed.title, level: seed.level, order: seed.order, config: seed.config, published: true })),
  ].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'th'));
  const term = q.trim().toLocaleLowerCase('th');
  const filtered = catalog.filter((row) => (!level || row.level === level) && (!term || `${row.title} ${row.slug}`.toLocaleLowerCase('th').includes(term)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(totalPages, Math.max(1, Number.parseInt(page, 10) || 1));
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const missingCount = builtIn.filter((seed) => !savedSlugs.has(seed.slug)).length;
  const playableCount = catalog.filter((row) => row.published).length;
  const pageHref = (n: number) => `/admin/challenges?${new URLSearchParams({ ...(q ? { q } : {}), ...(level ? { level } : {}), page: String(n) })}`;

  return (
    <>
      <PageHead title="โจทย์ฝึกตัวจำลอง" desc="ดูโจทย์ทั้งหมดที่ผู้เรียนเห็นในสนาม และจัดการโจทย์ที่บันทึกในฐานข้อมูล" newHref="/admin/challenges/new" newLabel="เพิ่มโจทย์" />
      <Notice ok={ok} error={error} />
      <div className="flex flex-wrap items-center justify-between gap-4 squircle-2xl border border-line bg-surface p-4">
        <div>
          <p className="text-lg font-bold">คลังโจทย์ทั้งหมด {catalog.length} ด่าน</p>
          <p className="text-sm text-muted-foreground">เปิดเล่นในตัวจำลอง {playableCount} ด่าน · บันทึกในฐานข้อมูล {saved.length} ด่าน · อยู่ในชุดโจทย์ของเว็บ {missingCount} ด่าน</p>
        </div>
        {missingCount > 0 && <form action={importMissingChallenges}><ImportButton count={missingCount} /></form>}
      </div>
      {missingCount > 0 && <p className="text-sm text-muted-foreground">ด่านจากชุดโจทย์เปิดเล่นได้อยู่แล้ว กดนำเข้าเพื่อแก้ไขโจทย์เหล่านั้นในหลังบ้าน ระบบจะเพิ่มเฉพาะด่านที่ยังไม่มีและเก็บด่านเดิมไว้</p>}
      <form action="/admin/challenges" className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-56 flex-1 gap-1 text-sm font-medium">ค้นหาชื่อหรือลิงก์<Input name="q" defaultValue={q} placeholder="เช่น ลอดห่วง" className="h-11 bg-surface text-base" /></label>
        <label className="grid gap-1 text-sm font-medium">ระดับ<select name="level" defaultValue={level} className="h-11 min-w-40 squircle-xl border border-line bg-surface px-3 text-base"><option value="">ทุกระดับ</option>{LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <Button type="submit" variant="outline" className="h-11">ค้นหา</Button>
        {(q || level) && <Link href="/admin/challenges" className="inline-flex h-11 items-center px-2 text-sm text-muted-foreground hover:text-foreground">ล้างตัวกรอง</Link>}
      </form>
      <p className="text-sm text-muted-foreground">พบ {filtered.length} ด่าน · แสดง {rows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{(currentPage - 1) * PAGE_SIZE + rows.length}</p>
      <div className="hidden overflow-hidden squircle-3xl border border-line bg-surface md:block">
        <Table>
          <TableHeader><TableRow><TableHead className="w-20">สนาม</TableHead><TableHead>ชื่อโจทย์</TableHead><TableHead>ระดับ</TableHead><TableHead>ลายสนาม</TableHead><TableHead className="w-16 text-right">ลำดับ</TableHead><TableHead className="w-36">สถานะ</TableHead><TableHead className="w-24"><span className="sr-only">จัดการ</span></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((row) => <TableRow key={row.id}>
              <TableCell><ScenePreview config={row.config} className="size-14 squircle-xl" /></TableCell>
              <TableCell className="whitespace-normal text-base">{row.source === 'database' ? <Link href={`/admin/challenges/${row.id}`} className="font-semibold hover:text-brand-blue hover:underline">{row.title}</Link> : <span className="font-semibold">{row.title}</span>}<span className="block text-sm text-muted-foreground">{row.config.objects.length} วัตถุ · /{row.slug}</span></TableCell>
              <TableCell><span className={`squircle-xl px-2.5 py-0.5 text-sm font-medium ${TONE[row.level] ?? 'bg-muted'}`}>{row.level}</span></TableCell>
              <TableCell className="text-base text-muted-foreground">{PATTERNS.find((p) => p.id === row.config.pattern)?.label}</TableCell>
              <TableCell className="text-right text-base">{row.order}</TableCell>
              <TableCell>{row.source === 'database' ? <StatusBadge published={row.published} /> : <span className="text-sm text-muted-foreground">ชุดโจทย์ของเว็บ</span>}</TableCell>
              <TableCell className="text-right">{row.source === 'database' ? <RowMenu model="challenge" id={row.id} label={row.title} editHref={`/admin/challenges/${row.id}`} viewHref={`/simulator?tab=${row.slug}`} published={row.published} /> : <Link href={`/simulator?tab=${row.slug}`} className="whitespace-nowrap text-sm font-semibold text-brand-blue hover:underline">ลองเล่น ↗</Link>}</TableCell>
            </TableRow>)}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-lg text-muted-foreground">ไม่พบโจทย์ที่ตรงกับคำค้น</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <ul className="grid gap-3 md:hidden">
        {rows.map((row) => <li key={row.id} className="flex items-start gap-3 squircle-3xl border border-line bg-surface p-3">
          <ScenePreview config={row.config} className="size-16 shrink-0 squircle-xl" />
          <div className="min-w-0 flex-1"><p className="line-clamp-2 text-lg font-bold leading-snug">{row.title}</p><p className="mt-1 text-sm text-muted-foreground">{row.level} · {row.config.objects.length} วัตถุ · {row.source === 'database' ? (row.published ? 'เผยแพร่' : 'ฉบับร่าง') : 'ชุดโจทย์ของเว็บ'}</p><Link href={row.source === 'database' ? `/admin/challenges/${row.id}` : `/simulator?tab=${row.slug}`} className="mt-2 inline-block text-sm font-semibold text-brand-blue">{row.source === 'database' ? 'แก้ไขโจทย์' : 'ลองเล่น'} ↗</Link></div>
          {row.source === 'database' && <RowMenu model="challenge" id={row.id} label={row.title} editHref={`/admin/challenges/${row.id}`} viewHref={`/simulator?tab=${row.slug}`} published={row.published} />}
        </li>)}
        {rows.length === 0 && <li className="squircle-3xl border border-line bg-surface p-8 text-center text-lg text-muted-foreground">ไม่พบโจทย์ที่ตรงกับคำค้น</li>}
      </ul>
      {totalPages > 1 && <nav aria-label="หน้าโจทย์" className="flex flex-wrap items-center justify-center gap-3 text-sm">
        {currentPage > 1 && <Link className="squircle-xl border border-line px-4 py-2 hover:bg-surface-2" href={pageHref(currentPage - 1)}>← ก่อนหน้า</Link>}
        <span>หน้า {currentPage} จาก {totalPages}</span>
        {currentPage < totalPages && <Link className="squircle-xl border border-line px-4 py-2 hover:bg-surface-2" href={pageHref(currentPage + 1)}>ถัดไป →</Link>}
      </nav>}
    </>
  );
}
