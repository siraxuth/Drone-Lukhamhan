import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { getReleases } from '@/lib/changelog';
import { SITE } from '@/lib/site';

const COLUMNS = [
  {
    title: 'เรียนรู้',
    links: [
      { href: '/#how', label: 'โดรนบินยังไง' },
      { href: '/docs', label: 'บทเรียนทั้งหมด' },
      { href: '/docs/start/safety', label: 'ความปลอดภัยก่อนบิน' },
      { href: '/docs/code/parduino-api', label: 'คำสั่งสั่งโดรน' },
    ],
  },
  {
    title: 'ซ้อมและแข่ง',
    links: [
      { href: '/simulator', label: 'ลองบินจำลอง' },
      { href: '/field', label: 'สนามและกติกา' },
      { href: '/docs/compete/field-and-rules', label: 'เตรียมลงแข่ง' },
    ],
  },
  {
    title: 'ชมรม',
    links: [
      { href: '/works', label: 'ผลงานของเรา' },
      { href: '/team', label: 'ผู้จัดทำ' },
      { href: '/changelog', label: 'บันทึกการเปลี่ยนแปลง' },
      { href: '/login', label: 'เข้าสู่ระบบ' },
    ],
  },
] as const;

const fmt = (d: string) => (d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const link = 'inline-flex min-h-11 items-center text-base text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:min-h-9';

/** ท้ายเว็บใช้ร่วมกันทุกหน้า: ลิงก์ไปทุกส่วนของเว็บ + "มีอะไรใหม่" ดึงจาก CHANGELOG.md ล่าสุดอัตโนมัติ */
export function SiteFooter() {
  const latest = getReleases()[0];
  const news = latest?.groups.flatMap((g) => g.items.map((t) => ({ tag: g.title, text: t.replace(/`/g, '') }))).slice(0, 3) ?? [];
  return (
    <footer className="relative z-10 border-t border-line bg-background/95 px-4 pb-8 pt-12 backdrop-blur sm:px-6 xl:px-10">
      <div className="mx-auto grid max-w-[84rem] gap-10 lg:grid-cols-[1.2fr_2fr_1.3fr]">
        <div className="grid content-start gap-4">
          <Logo />
          <p className="max-w-sm text-base leading-7 text-muted-foreground">เรียนโดรนจากศูนย์ ซ้อมในตัวจำลอง แล้วลงสนามแข่งจริง ทำโดยนักเรียนชมรมโดรน {SITE.school} จังหวัดอุบลราชธานี</p>
        </div>

        <nav aria-label="ลิงก์ท้ายเว็บ" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="text-sm font-semibold text-foreground">{c.title}</p>
              <ul className="mt-2 grid">
                {c.links.map((l) => <li key={l.href}><Link href={l.href} className={link}>{l.label}</Link></li>)}
              </ul>
            </div>
          ))}
        </nav>

        <section aria-labelledby="footer-new" className="grid content-start gap-3 squircle-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="footer-new" className="flex items-center gap-2 text-base font-bold"><Sparkles className="size-4 text-brand-blue" aria-hidden /> มีอะไรใหม่</h2>
            <span className="squircle-xl bg-brand-blue/10 px-2.5 py-0.5 text-sm font-semibold text-brand-blue">v{latest?.version ?? SITE.version}</span>
          </div>
          {latest?.date && <p className="text-sm text-muted-foreground">อัปเดตล่าสุด {fmt(latest.date)}</p>}
          {news.length > 0 && (
            <ul className="grid gap-2 text-base leading-6">
              {news.map((n, i) => (
                <li key={i} className="line-clamp-2"><span className="mr-1.5 text-sm font-semibold text-brand-blue">{n.tag}</span>{n.text}</li>
              ))}
            </ul>
          )}
          <Link href="/changelog" className="inline-flex min-h-11 items-center gap-1.5 text-base font-semibold text-brand-blue hover:underline">ดูบันทึกการเปลี่ยนแปลงทั้งหมด <ArrowUpRight className="size-4" aria-hidden /></Link>
        </section>
      </div>

      <div className="mx-auto mt-10 flex max-w-[84rem] flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-6 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} ชมรมโดรน {SITE.school}</p>
        <p>drone.dekgp.com · เวอร์ชัน {SITE.version}</p>
      </div>
    </footer>
  );
}
