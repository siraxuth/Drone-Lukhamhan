import { Eye, EyeOff } from 'lucide-react';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { leagueOf } from '@/learn/board-utils';
import { dayKey } from '@/learn/path';
import { Notice, PageHead } from '../ui';
import { resetName, resetProgress, setVisibility } from './actions';

export const dynamic = 'force-dynamic';

/** ส่งแบบฝึกเกินนี้ใน 24 ชั่วโมง ถือว่าผิดปกติ (ผู้เรียนปกติทำได้ไม่กี่สิบครั้งต่อวัน) */
const SUSPECT = 150;

/** ผู้เรียน: ดูความคืบหน้า ซ่อนชื่อจากอันดับ ตั้งชื่อใหม่ ล้างความคืบหน้า (เฉพาะแอดมิน) และเตือนบัญชีที่ส่งคำตอบถี่ผิดปกติ */
export default async function LearnersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; q?: string }> }) {
  const { ok, error, q } = await searchParams;
  const me = (await getSession())!.user as { role?: string };
  const since = new Date(Date.now() - 86_400_000);
  const [profiles, units, recent] = await Promise.all([
    db.learnProfile.findMany({ include: { user: { select: { name: true, email: true } } }, orderBy: [{ xp: 'desc' }, { createdAt: 'asc' }], take: 300 }),
    db.unitProgress.groupBy({ by: ['userId'], _count: { _all: true } }),
    db.attempt.groupBy({ by: ['userId'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
  ]);
  const doneBy = new Map(units.map((u) => [u.userId, u._count._all]));
  const recentBy = new Map(recent.map((r) => [r.userId, r._count._all]));
  const needle = (q ?? '').trim().toLowerCase();
  const rows = profiles.filter((p) => !needle || p.displayName.toLowerCase().includes(needle) || p.user.email.toLowerCase().includes(needle) || p.user.name.toLowerCase().includes(needle));
  const flagged = rows.filter((p) => (recentBy.get(p.userId) ?? 0) >= SUSPECT).length;
  const today = dayKey();

  return (
    <>
      <PageHead title="ผู้เรียน" desc="ความคืบหน้าของสมาชิกที่เข้าหน้าเรียน ซ่อนชื่อที่ไม่เหมาะสมจากอันดับ หรือล้างความคืบหน้า" />
      <Notice ok={ok} error={error} />
      <form className="flex flex-wrap items-center gap-2" role="search">
        <input name="q" defaultValue={q ?? ''} placeholder="ค้นหาชื่อหรืออีเมล" aria-label="ค้นหาผู้เรียน" className="h-11 w-full max-w-sm squircle-xl border border-line bg-surface px-3 text-base" />
        <Button type="submit" className="h-11 px-5 text-base">ค้นหา</Button>
        <p className="text-sm text-muted-foreground">{rows.length} คน{flagged ? ` · มี ${flagged} บัญชีส่งถี่ผิดปกติ` : ''}</p>
      </form>

      {rows.length === 0 ? <p className="squircle-2xl border border-dashed border-line p-8 text-center text-muted-foreground">ยังไม่มีผู้เรียน</p> : (
        <ul className="grid gap-3">
          {rows.map((p) => {
            const n = recentBy.get(p.userId) ?? 0;
            const sus = n >= SUSPECT;
            return (
              <li key={p.userId} className={`grid gap-3 squircle-2xl border bg-surface p-4 ${sus ? 'border-brand-red/50' : 'border-line'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-lg font-bold">{p.displayName}
                      <span className="squircle-xl bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted-foreground">{leagueOf(p.xp).name}</span>
                      {!p.showOnBoard && <span className="inline-flex items-center gap-1 squircle-xl bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300"><EyeOff className="size-3" aria-hidden /> ซ่อนจากอันดับ</span>}
                      {sus && <span className="squircle-xl bg-brand-red/10 px-2 py-0.5 text-xs font-bold text-brand-red">ส่งถี่ผิดปกติ {n} ครั้ง/วัน</span>}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{p.user.name} · {p.user.email}</p>
                  </div>
                  <p className="text-right text-xl font-extrabold">{p.xp} <span className="text-sm font-semibold text-muted-foreground">XP</span></p>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div><dt className="text-muted-foreground">จบหน่วย</dt><dd className="font-semibold">{doneBy.get(p.userId) ?? 0} หน่วย</dd></div>
                  <div><dt className="text-muted-foreground">เรียนต่อเนื่อง</dt><dd className="font-semibold">{p.streak} วัน</dd></div>
                  <div><dt className="text-muted-foreground">ใช้งานล่าสุด</dt><dd className="font-semibold">{p.lastActiveDay ? (p.lastActiveDay === today ? 'วันนี้' : p.lastActiveDay) : '—'}</dd></div>
                  <div><dt className="text-muted-foreground">ส่งใน 24 ชม.</dt><dd className="font-semibold">{n} ครั้ง</dd></div>
                </dl>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={setVisibility.bind(null, p.userId, !p.showOnBoard)}><Button type="submit" variant="outline" className="h-10 px-3 text-sm">{p.showOnBoard ? <><EyeOff className="size-4" aria-hidden /> ซ่อนจากอันดับ</> : <><Eye className="size-4" aria-hidden /> แสดงในอันดับ</>}</Button></form>
                  <form action={resetName.bind(null, p.userId)}><Button type="submit" variant="outline" className="h-10 px-3 text-sm">ตั้งชื่อใหม่เป็นชื่อแรกและซ่อน</Button></form>
                  {me.role === 'ADMIN' && (
                    <details className="ml-auto">
                      <summary className="cursor-pointer squircle-xl border border-brand-red/40 px-3 py-2 text-sm font-semibold text-brand-red">ล้างความคืบหน้า…</summary>
                      <form action={resetProgress.bind(null, p.userId)} className="mt-2 grid gap-2 squircle-xl border border-brand-red/40 bg-brand-red/5 p-3">
                        <p className="text-sm">ลบ XP หน่วยที่จบ ประวัติ ทักษะ และผลภารกิจรายวันของคนนี้ทั้งหมด ย้อนกลับไม่ได้ พิมพ์อีเมล <b>{p.user.email}</b> เพื่อยืนยัน</p>
                        <input name="confirm" autoComplete="off" aria-label="พิมพ์อีเมลเพื่อยืนยัน" className="h-10 squircle-xl border border-line bg-surface px-3 text-sm" />
                        <Button type="submit" variant="destructive" className="h-10 w-fit px-4 text-sm">ล้างความคืบหน้า</Button>
                      </form>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
