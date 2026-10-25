import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Header } from '@/sections/Header';
import { SiteFooter } from '@/sections/SiteFooter';
import { getReleases } from '@/lib/changelog';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'บันทึกการเปลี่ยนแปลง',
  description: `ดูว่าแต่ละเวอร์ชันของเว็บ ${SITE.name} เปลี่ยนอะไรไปบ้าง ตั้งแต่เวอร์ชันแรกจนถึงเวอร์ชันล่าสุด`,
  alternates: { canonical: '/changelog' },
};

const TONE: Record<string, string> = { เพิ่ม: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', เปลี่ยน: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', แก้: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', เอาออก: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' };
const fmt = (d: string) => (d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
/** `โค้ด` ในรายการ → <code> */
const inline = (t: string) => t.split(/(`[^`]+`)/g).map((p, i) => (p.startsWith('`') ? <code key={i} className="squircle-xl bg-surface-2 px-1.5 py-0.5 text-[0.9em]">{p.slice(1, -1)}</code> : <span key={i}>{p}</span>));

export default function ChangelogPage() {
  const releases = getReleases();
  return (
    <>
      <Header />
      <Breadcrumbs items={[{ label: 'บันทึกการเปลี่ยนแปลง' }]} />
      <main className="mx-auto max-w-3xl px-4 pb-32 pt-4 sm:px-6">
        <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">บันทึกการเปลี่ยนแปลง</h1>
        <p className="mt-3 text-lg leading-8 text-muted-foreground">แต่ละเวอร์ชันของเว็บเปลี่ยนอะไรไปบ้าง เวอร์ชันปัจจุบันคือ <b className="text-foreground">v{SITE.version}</b></p>
        <ol className="mt-10 grid gap-8">
          {releases.map((r, i) => (
            <li key={r.version} className="grid gap-4 squircle-3xl border border-line bg-surface p-5 sm:p-6">
              <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 id={`v${r.version}`} className="font-display text-3xl font-extrabold">v{r.version}</h2>
                {i === 0 && <span className="squircle-xl bg-brand-blue px-2.5 py-0.5 text-sm font-semibold text-white">ล่าสุด</span>}
                <time dateTime={r.date} className="text-base text-muted-foreground">{fmt(r.date)}</time>
              </header>
              {r.intro && <p className="text-base leading-7 text-muted-foreground">{r.intro}</p>}
              {r.groups.map((g) => (
                <section key={g.title} className="grid gap-2">
                  <h3><span className={`squircle-xl px-2.5 py-0.5 text-base font-bold ${TONE[g.title] ?? 'bg-muted'}`}>{g.title}</span></h3>
                  <ul className="grid gap-1.5 text-base leading-7">{g.items.map((t) => <li key={t} className="flex gap-2"><span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-foreground/40" /><span>{inline(t)}</span></li>)}</ul>
                </section>
              ))}
            </li>
          ))}
        </ol>
      </main>
      <SiteFooter />
    </>
  );
}
