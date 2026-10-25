import Link from 'next/link';
import { db } from '@/lib/db';
import { ScenePreview } from '@/field/ScenePlan';
import { parseConfig, PATTERNS } from '@/lib/scenarios';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RowMenu } from '../client';
import { Notice, PageHead, StatusBadge } from '../ui';

const TONE: Record<string, string> = { เริ่มต้น: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', กลาง: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', ยาก: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' };

export default async function ChallengesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const rows = await db.challenge.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
  return (
    <>
      <PageHead title="โจทย์ฝึกตัวจำลอง" desc="สนาม วัตถุ และโค้ดเริ่มต้นของโจทย์ในหน้า /simulator จัดวางได้ด้วยการลากวาง" newHref="/admin/challenges/new" newLabel="เพิ่มโจทย์" />
      <Notice ok={ok} error={error} />
      <div className="hidden overflow-hidden squircle-3xl border border-line bg-surface md:block">
        <Table>
          <TableHeader><TableRow><TableHead className="w-20">สนาม</TableHead><TableHead>ชื่อโจทย์</TableHead><TableHead>ระดับ</TableHead><TableHead>ลายสนาม</TableHead><TableHead className="w-16 text-right">ลำดับ</TableHead><TableHead className="w-36">สถานะ</TableHead><TableHead className="w-16"><span className="sr-only">เมนู</span></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((c) => {
              const cfg = parseConfig(c.config);
              return (
                <TableRow key={c.id}>
                  <TableCell><ScenePreview config={cfg} className="size-14 squircle-xl" /></TableCell>
                  <TableCell className="whitespace-normal text-base"><Link href={`/admin/challenges/${c.id}`} className="font-semibold hover:text-brand-blue hover:underline">{c.title}</Link><span className="block text-sm text-muted-foreground">{cfg.objects.length} วัตถุ · /{c.slug ?? '—'}</span></TableCell>
                  <TableCell><span className={`squircle-xl px-2.5 py-0.5 text-sm font-medium ${TONE[c.level] ?? 'bg-muted'}`}>{c.level}</span></TableCell>
                  <TableCell className="text-base text-muted-foreground">{PATTERNS.find((p) => p.id === cfg.pattern)?.label}</TableCell>
                  <TableCell className="text-right text-base">{c.order}</TableCell>
                  <TableCell><StatusBadge published={c.published} /></TableCell>
                  <TableCell className="text-right"><RowMenu model="challenge" id={c.id} label={c.title} editHref={`/admin/challenges/${c.id}`} viewHref={c.slug ? `/simulator?tab=${c.slug}` : undefined} published={c.published} /></TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-lg text-muted-foreground">ยังไม่มีโจทย์ (รัน bun run prisma/seed-challenges.ts เพื่อใส่ชุดตั้งต้น)</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <ul className="grid gap-3 md:hidden">
        {rows.map((c) => {
          const cfg = parseConfig(c.config);
          return (
            <li key={c.id} className="flex items-start gap-3 squircle-3xl border border-line bg-surface p-3">
              <Link href={`/admin/challenges/${c.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                <ScenePreview config={cfg} className="size-16 shrink-0 squircle-xl" />
                <span className="min-w-0">
                  <span className="line-clamp-2 block text-lg font-bold leading-snug">{c.title}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><span className={`squircle-xl px-2 py-0.5 font-medium ${TONE[c.level] ?? 'bg-muted'}`}>{c.level}</span>{cfg.objects.length} วัตถุ <StatusBadge published={c.published} /></span>
                </span>
              </Link>
              <RowMenu model="challenge" id={c.id} label={c.title} editHref={`/admin/challenges/${c.id}`} viewHref={c.slug ? `/simulator?tab=${c.slug}` : undefined} published={c.published} />
            </li>
          );
        })}
        {rows.length === 0 && <li className="squircle-3xl border border-line bg-surface p-8 text-center text-lg text-muted-foreground">ยังไม่มีโจทย์</li>}
      </ul>
    </>
  );
}
