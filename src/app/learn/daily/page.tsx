import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Check, Flame } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ScenePreview } from '@/field/ScenePlan';
import { getMission, TIER_IDS, TIERS } from '@/learn/daily';
import { dayKey } from '@/learn/path';
import { shareMetadata } from '@/lib/og';

const title = 'ภารกิจบินโดรนประจำวัน';
const description = 'ฝึกเขียนโค้ดพาโดรนผ่านจุดหมายและกลับฐาน มีภารกิจใหม่ให้ลองทุกวัน';
export const metadata: Metadata = { title, description, ...shareMetadata({ title, description, path: '/learn/daily' }) };
export const dynamic = 'force-dynamic';

const TH_DAY = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Bangkok' });
const fmtTime = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)} วินาที`);

/** ภารกิจรายวัน: ทุกวันมีด่านใหม่ 3 ระดับ (สร้างจากวันที่ แก้ได้จริงเสมอ) ผ่านด่านเพื่อรับ XP ครั้งเดียวต่อด่านต่อวัน */
export default async function DailyPage() {
  const session = await requireUser();
  if (!session) redirect('/login?next=/learn/daily');
  const day = dayKey();
  const days = Array.from({ length: 7 }, (_, i) => dayKey(new Date(Date.now() - (6 - i) * 86_400_000)));
  const runs = await db.dailyRun.findMany({ where: { userId: session.user.id, day: { in: days } } });
  const today = new Map(runs.filter((r) => r.day === day).map((r) => [r.tier, r] as const));
  const solvedDays = new Set(runs.filter((r) => r.solved).map((r) => r.day));

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 pb-32 pt-28 sm:px-6">
      <header className="grid gap-2">
        <Link href="/learn" className="w-fit text-base font-semibold text-brand-blue underline underline-offset-4">← เส้นทางเรียน</Link>
        <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">ภารกิจรายวัน</h1>
        <p className="max-w-2xl text-lg leading-8 text-muted-foreground">{TH_DAY.format(new Date())} · ด่านใหม่ทุกวัน เขียนโค้ดพาโดรนผ่านจุดตามลำดับแล้วกลับลงฐาน ผ่านด่านได้ XP (ครั้งเดียวต่อด่านต่อวัน) ถ้าได้คะแนนเต็มเท่ากัน คนที่บินเร็วกว่าอยู่อันดับสูงกว่า</p>
      </header>

      <section aria-label="สัปดาห์นี้" className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"><Flame className="size-4 text-orange-500" aria-hidden /> 7 วันล่าสุด</span>
        {days.map((d) => (
          <span key={d} title={d} className={`grid size-9 place-items-center squircle-xl border text-sm font-bold ${solvedDays.has(d) ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : d === day ? 'border-brand-blue text-brand-blue' : 'border-line text-muted-foreground'}`}>
            {solvedDays.has(d) ? <Check className="size-4" aria-label="ผ่านแล้ว" /> : Number(d.slice(8))}
          </span>
        ))}
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {TIER_IDS.map((tier) => {
          const m = getMission(day, tier);
          const run = today.get(tier);
          return (
            <Link key={tier} href={`/learn/daily/${tier}`} className="grid content-start gap-3 squircle-2xl border border-line bg-surface p-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
              <div className="flex items-center justify-between gap-2">
                <span className={`squircle-xl px-3 py-1 text-sm font-bold ${tier === 'easy' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : tier === 'medium' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-brand-red/10 text-brand-red'}`}>{TIERS[tier].label}</span>
                <span className="text-sm font-semibold text-muted-foreground">+{TIERS[tier].xp} XP</span>
              </div>
              <ScenePreview config={m.config} className="mx-auto aspect-square w-full max-w-[14rem] squircle-xl" />
              <div className="grid gap-0.5">
                <p className="text-xl font-extrabold leading-snug">{m.title}</p>
                <p className="text-base text-muted-foreground">{TIERS[tier].blurb}</p>
              </div>
              <p className={`flex flex-wrap items-center gap-x-2 text-sm font-semibold ${run?.solved ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                {run?.solved ? <><Check className="size-4" aria-hidden /> ผ่านแล้ว · {run.bestScore}/{m.max} · {fmtTime(run.bestTimeMs)}</> : run ? `ลองแล้ว ${run.attempts} ครั้ง · ดีที่สุด ${run.bestScore}/${m.max}` : `คะแนนเต็ม ${m.max} · ยังไม่ได้ทำ`}
              </p>
              <span className="inline-flex items-center gap-1.5 text-base font-bold text-brand-blue">{run?.solved ? 'ทำอีกรอบเพื่อลดเวลา' : 'เริ่มภารกิจ'} <ArrowRight className="size-4" aria-hidden /></span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
