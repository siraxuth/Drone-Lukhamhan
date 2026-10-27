import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, ClipboardCheck, RefreshCw } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { findUnit } from '@/learn/content';
import { loadLearner, loadStats } from '@/learn/server';
import { SkillRadar } from '@/learn/SkillRadar';
import { ADVICE, BAND_LABEL, bandOf, effective, levelOfTrack, SHORT, SKILL_IDS, type Band } from '@/learn/skills';
import { SKILLS } from '@/learn/types';
import { shareMetadata } from '@/lib/og';

const title = 'วิเคราะห์ทักษะการเรียนโดรนของฉัน';
const description = 'ดูจุดแข็งและหัวข้อที่ควรทบทวนจากผลแบบฝึกหัดและบทเรียนที่ทำไปแล้ว';
export const metadata: Metadata = { title, description, ...shareMetadata({ title, description, path: '/learn/skills' }) };

const BAND_TONE: Record<Band, string> = { unknown: 'bg-surface-2 text-muted-foreground', weak: 'bg-brand-red/10 text-brand-red', ok: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', strong: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };

/** วิเคราะห์ของฉัน: ความชำนาญต่อทักษะ (ปรับตามเวลาที่ไม่ได้ฝึก) จุดถนัด จุดที่ควรเสริม พร้อมคำแนะนำและทางลัดไปหน่วยที่ช่วยได้ */
export default async function SkillsPage() {
  const session = await requireUser();
  if (!session) redirect('/login?next=/learn/skills');
  const [{ profile }, stats] = await Promise.all([loadLearner(session.user), loadStats(session.user.id)]);
  const now = new Date();
  const rows = SKILL_IDS.map((skill) => {
    const s = stats.find((x) => x.skill === skill);
    const eff = s ? effective(s.mastery, s.lastAt, now) : null;
    const band = s ? bandOf(eff as number, s.answered) : 'unknown';
    return { skill, eff, band, answered: s?.answered ?? 0, correct: s?.correct ?? 0 };
  });
  const measured = rows.filter((r) => r.band !== 'unknown');
  const weak = rows.filter((r) => r.band === 'weak').sort((a, b) => (a.eff as number) - (b.eff as number));
  const strong = rows.filter((r) => r.band === 'strong').sort((a, b) => (b.eff as number) - (a.eff as number));
  const levels = { code: levelOfTrack('code', stats), basics: levelOfTrack('basics', stats), physics: levelOfTrack('physics', stats) };
  const btn = 'inline-flex h-12 items-center gap-2 squircle-xl px-5 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue';

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 pb-32 pt-28 sm:px-6">
      <header className="grid gap-2">
        <p className="text-base font-semibold text-brand-blue">การเรียนของฉัน</p>
        <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">วิเคราะห์ของฉัน</h1>
        <p className="text-lg leading-8 text-muted-foreground">ระบบคำนวณจากทุกแบบฝึกที่คุณทำ ยิ่งทำมาก ภาพยิ่งแม่น ทักษะที่ไม่ได้ฝึกนานจะค่อยๆ ถอยกลับไปที่ 50% เพราะความจำจางลง</p>
      </header>

      {measured.length === 0 ? (
        <section className="grid gap-4 squircle-2xl border border-line bg-surface p-6 text-center">
          <p className="text-lg">ยังไม่มีข้อมูลพอวิเคราะห์ ลองทำแบบทดสอบก่อนเรียน (ประมาณ 5 นาที) หรือเรียนไปสักหน่วยแล้วกลับมาดู</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/learn/placement" className={`${btn} bg-brand-blue text-background`}><ClipboardCheck className="size-4" aria-hidden /> ทำแบบทดสอบก่อนเรียน</Link>
            <Link href="/learn" className={`${btn} border border-line hover:bg-surface-2`}>ไปเรียน</Link>
          </div>
        </section>
      ) : (
        <>
          <section aria-label="แผนภาพความชำนาญ" className="grid gap-4 squircle-2xl border border-line bg-surface p-4 sm:p-6">
            <SkillRadar items={rows.map((r) => ({ skill: r.skill, value: r.band === 'unknown' ? null : (r.eff as number) }))} />
            <div className="grid gap-2 sm:grid-cols-3">
              {(['code', 'basics', 'physics'] as const).map((t) => (
                <div key={t} className="squircle-xl bg-surface-2 px-3 py-2 text-center">
                  <p className="text-sm text-muted-foreground">{t === 'code' ? 'สายเขียนโค้ด' : t === 'basics' ? 'สายความรู้โดรน' : 'สายฟิสิกส์'}</p>
                  <p className="text-lg font-bold">{levels[t] ?? 'ยังไม่พอวัด'}</p>
                </div>
              ))}
            </div>
          </section>

          {weak.length > 0 && (
            <section aria-labelledby="weak" className="grid gap-3">
              <h2 id="weak" className="font-display text-2xl font-extrabold">จุดที่ควรเสริม</h2>
              {weak.map((r) => {
                const unit = ADVICE[r.skill].unit ? findUnit(ADVICE[r.skill].unit as string) : null;
                return (
                  <article key={r.skill} className="grid gap-1.5 squircle-2xl border border-brand-red/30 bg-surface p-4">
                    <p className="flex flex-wrap items-center gap-2 text-lg font-bold">{SHORT[r.skill]} <span className="text-sm font-semibold text-brand-red">{Math.round((r.eff as number) * 100)}%</span></p>
                    <p className="text-base leading-7">{ADVICE[r.skill].weak}</p>
                    {unit && <Link href={`/learn/${unit.track.id}/${unit.unit.id}`} className="w-fit text-base font-semibold text-brand-blue underline underline-offset-4">ทบทวนหน่วย “{unit.unit.title}”</Link>}
                  </article>
                );
              })}
            </section>
          )}

          {strong.length > 0 && (
            <section aria-labelledby="strong" className="grid gap-3">
              <h2 id="strong" className="font-display text-2xl font-extrabold">จุดที่ถนัด</h2>
              <ul className="grid gap-2">{strong.map((r) => <li key={r.skill} className="squircle-xl border border-emerald-500/30 bg-surface px-4 py-3 text-base leading-7"><b>{SHORT[r.skill]}</b> ({Math.round((r.eff as number) * 100)}%) · {ADVICE[r.skill].strong}</li>)}</ul>
            </section>
          )}
        </>
      )}

      <section aria-labelledby="all" className="grid gap-3">
        <h2 id="all" className="font-display text-2xl font-extrabold">ทุกทักษะ</h2>
        <ul className="grid gap-2">
          {rows.map((r) => (
            <li key={r.skill} className="grid gap-1.5 squircle-xl border border-line bg-surface px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-bold">{SHORT[r.skill]} <span className="font-normal text-muted-foreground">· {SKILLS[r.skill]}</span></p>
                <span className={`squircle-xl px-2.5 py-0.5 text-sm font-semibold ${BAND_TONE[r.band]}`}>{BAND_LABEL[r.band]}</span>
              </div>
              <div role="progressbar" aria-label={`ความชำนาญด้าน${SHORT[r.skill]}`} aria-valuenow={r.eff === null ? 0 : Math.round(r.eff * 100)} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${r.band === 'weak' ? 'bg-brand-red' : r.band === 'strong' ? 'bg-emerald-500' : 'bg-brand-blue'}`} style={{ width: `${r.eff === null ? 0 : Math.round(r.eff * 100)}%` }} /></div>
              <p className="text-sm text-muted-foreground">{r.answered === 0 ? 'ยังไม่เคยวัด' : `ตอบถูก ${r.correct} จาก ${r.answered} ครั้ง`}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/learn/review" className={`${btn} bg-brand-blue text-background`}><RefreshCw className="size-4" aria-hidden /> ทบทวน 5 ข้อตามจุดอ่อน</Link>
        {profile.placement !== 'done' && <Link href="/learn/placement" className={`${btn} border border-line hover:bg-surface-2`}><ClipboardCheck className="size-4" aria-hidden /> ทำแบบทดสอบก่อนเรียน</Link>}
        <Link href="/learn" className={`${btn} border border-line hover:bg-surface-2`}>กลับเส้นทางเรียน <ArrowRight className="size-4" aria-hidden /></Link>
      </div>
    </main>
  );
}
