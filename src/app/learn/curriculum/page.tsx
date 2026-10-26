import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Check, Clock } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { findUnit } from '@/learn/content';
import { CURRICULUM } from '@/learn/curriculum';
import { loadLearner } from '@/learn/server';

export const metadata: Metadata = { title: 'แผนที่ฟิสิกส์ ม.1–6' };
export const dynamic = 'force-dynamic';

/** แผนที่หัวข้อฟิสิกส์ ม.1–6 ที่เกี่ยวกับโดรน พร้อมบอกว่าหัวข้อไหนมีหน่วยเรียนแล้ว และหัวข้อไหนยังรอเขียน */
export default async function CurriculumPage() {
  const session = await requireUser();
  if (!session) redirect('/login?next=/learn/curriculum');
  const { done } = await loadLearner(session.user);
  const total = CURRICULUM.flatMap((b) => b.topics);
  const have = total.filter((t) => t.unit).length;
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 pb-32 pt-28 sm:px-6">
      <header className="grid gap-2">
        <Link href="/learn" className="w-fit text-base font-semibold text-brand-blue underline underline-offset-4">← เส้นทางเรียน</Link>
        <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">แผนที่ฟิสิกส์ ม.1–6</h1>
        <p className="text-lg leading-8 text-muted-foreground">หัวข้อฟิสิกส์ที่เจอในโดรน เรียงตามระดับชั้น ตอนนี้มีหน่วยเรียนแล้ว {have} จาก {total.length} หัวข้อ ที่เหลือกำลังเขียน สายฟิสิกส์เป็นบทเสริม ไม่บังคับ</p>
        <p className="text-sm text-muted-foreground">จัดกลุ่มตามหัวข้อทั่วไปของหลักสูตรมัธยม ไม่ได้รับรองว่าตรงตัวชี้วัดรายปีของกระทรวงศึกษาธิการ</p>
      </header>
      {CURRICULUM.map((band) => (
        <section key={band.id} aria-labelledby={band.id} className="grid gap-3">
          <h2 id={band.id} className="font-display text-2xl font-extrabold">{band.title}</h2>
          <ul className="grid gap-2">
            {band.topics.map((t) => {
              const f = t.unit ? findUnit(t.unit) : null;
              const ok = !!t.unit && done.has(t.unit);
              const body = (
                <>
                  <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-full ${ok ? 'bg-emerald-500 text-white' : f ? 'bg-brand-blue/15 text-brand-blue' : 'bg-surface-2 text-muted-foreground'}`}>{ok ? <Check className="size-5" /> : f ? '›' : <Clock className="size-4" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold leading-snug">{t.title}</span>
                    <span className="block text-sm leading-6 text-muted-foreground">{t.why}</span>
                    <span className="mt-0.5 block text-sm font-semibold">{f ? `หน่วย “${f.unit.title}”${ok ? ' · จบแล้ว' : ''}` : 'ยังไม่มีหน่วยเรียน (กำลังเขียน)'}</span>
                  </span>
                </>
              );
              return (
                <li key={t.title}>
                  {f ? <Link href={`/learn/${f.track.id}/${f.unit.id}`} className="flex items-start gap-3 squircle-xl border border-line bg-surface px-3 py-3 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:px-4">{body}</Link>
                    : <div className="flex items-start gap-3 squircle-xl border border-dashed border-line px-3 py-3 sm:px-4">{body}</div>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
