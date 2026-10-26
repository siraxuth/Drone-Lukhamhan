import Link from 'next/link';
import { BarChart3, CalendarCheck, Check, Trophy, ClipboardCheck, Flame, Play, RefreshCw, Sparkles, Target } from 'lucide-react';
import { TRACKS } from '@/learn/content';
import { levelOf, nextUnit, pathStates, XP_PER_LEVEL } from '@/learn/path';
import { leagueOf } from '@/learn/board-utils';
import { Tour } from '@/components/Tour';
import { learnTour } from '@/lib/tours';
import type { Track } from '@/learn/types';

type Profile = { displayName: string; xp: number; streak: number; todayXp: number; dailyGoal: number; activeToday: boolean; showOnBoard: boolean; placement: 'none' | 'skipped' | 'done' };

const ACCENT: Record<Track['accent'], { ring: string; fill: string; soft: string; text: string }> = {
  blue: { ring: 'ring-brand-blue', fill: 'bg-brand-blue text-background', soft: 'bg-brand-blue/10', text: 'text-brand-blue' },
  red: { ring: 'ring-brand-red', fill: 'bg-brand-red text-background', soft: 'bg-brand-red/10', text: 'text-brand-red' },
  emerald: { ring: 'ring-emerald-500', fill: 'bg-emerald-600 text-white', soft: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300' },
};

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 squircle-xl border border-line bg-surface px-4 py-3">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center squircle-xl bg-surface-2">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="truncate text-xl font-extrabold leading-tight">{value}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/** หน้าแรกของ /learn: สถิติผู้เรียน + ปุ่มต่อจากเดิม + เส้นทางเรียนของแต่ละสาย (ทุกขนาดจอ) */
export function PathView({ profile, done }: { profile: Profile; done: ReadonlySet<string> }) {
  const states = pathStates(done);
  const level = levelOf(profile.xp);
  const inLevel = profile.xp % XP_PER_LEVEL;
  const next = nextUnit(done);
  const goalPct = Math.min(100, Math.round((profile.todayXp / profile.dailyGoal) * 100));
  const total = TRACKS.reduce((n, t) => n + t.units.length, 0);

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 pb-32 pt-28 sm:px-6">
      <Tour id="learn" steps={learnTour} />
      <header className="grid gap-2">
        <p className="text-base font-semibold text-brand-blue">การเรียนของฉัน</p>
        <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">สวัสดี {profile.displayName}</h1>
        <p className="max-w-2xl text-lg leading-8 text-muted-foreground">เริ่มจากติดตั้งและรู้จักโดรน แล้วค่อยฝึกเขียนโค้ด ต่อวงจร และวางแผนภารกิจ ทำทีละหน่วยตามจังหวะของตัวเอง</p>
      </header>

      <section aria-label="สถิติของฉัน" data-tour="learn-stats" className="grid gap-3 sm:grid-cols-3">
        <Stat icon={<Sparkles className="size-5 text-brand-blue" aria-hidden />} label={`ระดับ ${level} · ${leagueOf(profile.xp).name}`} value={`${profile.xp} XP`} hint={`อีก ${XP_PER_LEVEL - inLevel} XP ถึงระดับ ${level + 1}`} />
        <Stat icon={<Flame className={`size-5 ${profile.streak ? 'text-orange-500' : 'text-muted-foreground'}`} aria-hidden />} label="เรียนต่อเนื่อง" value={`${profile.streak} วัน`} hint={profile.activeToday ? 'วันนี้เรียนแล้ว' : profile.streak ? 'เรียนวันนี้เพื่อต่อสถิติ' : 'เริ่มนับวันแรกได้เลย'} />
        <div className="flex items-center gap-3 squircle-xl border border-line bg-surface px-4 py-3">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center squircle-xl bg-surface-2"><Target className="size-5 text-emerald-600" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">เป้าหมายวันนี้</p>
            <p className="text-xl font-extrabold leading-tight">{Math.min(profile.todayXp, profile.dailyGoal)} / {profile.dailyGoal} XP</p>
            <div role="progressbar" aria-label="ความคืบหน้าเป้าหมายวันนี้" aria-valuenow={goalPct} aria-valuemin={0} aria-valuemax={100} className="mt-1.5 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${goalPct}%` }} /></div>
          </div>
        </div>
      </section>

      {profile.placement === 'none' && (
        <section aria-label="แบบทดสอบก่อนเรียน" className="flex flex-wrap items-center gap-4 squircle-2xl border border-brand-blue/40 bg-brand-blue/5 p-5">
          <span aria-hidden className="grid size-12 shrink-0 place-items-center squircle-xl bg-brand-blue text-background"><ClipboardCheck className="size-6" /></span>
          <div className="min-w-0 flex-1 basis-full sm:basis-0">
            <p className="text-xl font-extrabold leading-tight">ลองวัดพื้นฐานก่อนเรียนไหม</p>
            <p className="mt-1 text-base text-muted-foreground">12 ข้อ ใช้เวลาราว 5 นาที ข้อยากง่ายปรับตามที่ตอบ ใช้บอกว่าคุณถนัดและควรเน้นตรงไหน ถ้าแม่นมากระบบข้ามหน่วยต้นๆ ให้ได้</p>
          </div>
          <Link href="/learn/placement" className="inline-flex h-12 items-center gap-2 squircle-xl border border-brand-blue bg-surface px-5 text-base font-bold text-brand-blue hover:bg-brand-blue/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">ทำแบบทดสอบ</Link>
        </section>
      )}

      {next && (
        <section aria-label="เรียนต่อ" data-tour="learn-next" className={`flex flex-wrap items-center gap-4 squircle-2xl border border-line p-5 ${ACCENT[next.track.accent].soft}`}>
          <div className="min-w-0 flex-1 basis-full sm:basis-0">
            <p className="text-sm font-semibold text-muted-foreground">{done.size === 0 ? 'เริ่มจากตรงนี้' : 'เรียนต่อจากเดิม'} · {next.track.title}</p>
            <p className="text-2xl font-extrabold leading-tight">{next.unit.title}</p>
            <p className="mt-1 text-base text-muted-foreground">{next.unit.summary} · ประมาณ {next.unit.minutes} นาที · +{next.unit.xp} XP</p>
          </div>
          <Link href={`/learn/${next.track.id}/${next.unit.id}`} className="inline-flex h-12 items-center gap-2 squircle-xl bg-brand-blue px-6 text-base font-bold text-background transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
            <Play className="size-4 fill-current" aria-hidden /> {done.size === 0 ? 'เริ่มเรียน' : 'เรียนต่อ'}
          </Link>
        </section>
      )}

      <div data-tour="learn-tools" className="flex flex-wrap items-center gap-3">
        <p className="mr-auto text-sm text-muted-foreground">จบแล้ว {done.size} จาก {total} หน่วย</p>
        <Link href="/learn/leaderboard" className="inline-flex h-11 items-center gap-2 squircle-xl border border-line bg-surface px-4 text-base font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"><Trophy className="size-4" aria-hidden /> อันดับ</Link>
        <Link href="/learn/daily" className="inline-flex h-11 items-center gap-2 squircle-xl border border-line bg-surface px-4 text-base font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"><CalendarCheck className="size-4" aria-hidden /> ภารกิจรายวัน</Link>
        <Link href="/learn/skills" className="inline-flex h-11 items-center gap-2 squircle-xl border border-line bg-surface px-4 text-base font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"><BarChart3 className="size-4" aria-hidden /> วิเคราะห์ของฉัน</Link>
        <Link href="/learn/review" className="inline-flex h-11 items-center gap-2 squircle-xl border border-line bg-surface px-4 text-base font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"><RefreshCw className="size-4" aria-hidden /> ทบทวน 5 ข้อ</Link>
      </div>

      <div data-tour="learn-tracks" className="grid gap-8">
      {TRACKS.map((track) => {
        const a = ACCENT[track.accent];
        const finished = track.units.filter((u) => done.has(u.id)).length;
        return (
          <section key={track.id} aria-labelledby={`t-${track.id}`} className="grid gap-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id={`t-${track.id}`} className="flex flex-wrap items-center gap-2 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
                  {track.title}
                  {track.optional && <span className="squircle-xl bg-surface-2 px-2.5 py-0.5 text-sm font-semibold text-muted-foreground">เสริม ไม่บังคับ</span>}
                </h2>
                <p className="mt-1 max-w-2xl text-base text-muted-foreground">{track.tagline}</p>
              </div>
              <p className={`text-sm font-semibold ${a.text}`}>{finished}/{track.units.length} หน่วย{track.id === 'physics' && <> · <Link href="/learn/curriculum" className="underline underline-offset-4">แผนที่ ม.1–6</Link></>}</p>
            </div>

            <ol className="relative grid gap-3">
              {track.units.map((u, i) => {
                const st = states[u.id];
                const offset = i % 2 ? 'sm:ml-16 lg:ml-24' : '';
                const body = (
                  <>
                    <span aria-hidden className={`grid size-14 shrink-0 place-items-center rounded-full text-xl font-extrabold ${st === 'done' ? a.fill : st === 'ready' ? `bg-surface ring-4 ${a.ring} ${a.text}` : 'bg-surface-2 text-muted-foreground'}`}>
                      {st === 'done' ? <Check className="size-6" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="flex flex-wrap items-center gap-x-2 text-lg font-bold leading-snug">{u.title}{u.level && <span className="squircle-xl bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted-foreground">{u.level}</span>}</span>
                      <span className="mt-0.5 block text-base text-muted-foreground">{u.summary}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">{u.minutes} นาที · +{u.xp} XP{st === 'done' ? ' · จบแล้ว' : ''}</span>
                    </span>
                  </>
                );
                const cls = `flex items-center gap-4 squircle-2xl border border-line bg-surface p-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:p-4 ${offset}`;
                return (
                  <li key={u.id}>
                    <Link href={`/learn/${track.id}/${u.id}`} className={cls}>{body}</Link>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      </div>
    </main>
  );
}
