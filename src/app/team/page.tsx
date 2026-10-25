import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { JsonLd } from '@/components/JsonLd';
import { MakerPhoto } from '@/components/MakerPhoto';
import { Button } from '@/components/ui/button';
import { Header } from '@/sections/Header';
import { Ribbon } from '@/sections/Ribbon';
import { members } from '@/lib/team';
import { abs, OG_IMAGE, SITE } from '@/lib/site';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'ผู้จัดทำ',
  description: `คนเบื้องหลังเว็บ ${SITE.name}: เราพังมาก่อน คุณจะได้บินเลย รู้จักตั้น ศิรายุทธ แน่นสิงห์ นักพัฒนาวัย 15 ปีที่อยู่เบื้องหลังเว็บชมรมโดรนนี้`,
  alternates: { canonical: '/team' },
  openGraph: { type: 'website', title: `ผู้จัดทำ · ${SITE.name}`, url: '/team', images: [OG_IMAGE] },
};

const stack = ['Next.js 16', 'React 19', 'Tailwind v4', 'Three.js', 'Fumadocs', 'Prisma', 'Neon Postgres', 'Better Auth', 'Cloudflare R2', 'Arduino C++', 'Vercel'];

export default function TeamPage() {
  return (
    <>
      <Header />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'ผู้จัดทำ', url: abs('/team'), inLanguage: 'th-TH', about: { '@id': abs('/#org') }, isPartOf: { '@id': abs('/#site') }, mainEntity: { '@type': 'Person', name: 'ศิรายุทธ แน่นสิงห์', alternateName: 'ตั้น', jobTitle: 'Student Developer', url: 'https://www.sirayuth.com/', sameAs: ['https://www.sirayuth.com/'] } }} />
      <Breadcrumbs items={[{ label: 'ผู้จัดทำ' }]} />
      <main className="mx-auto grid max-w-[84rem] grid-cols-[minmax(0,1fr)] gap-20 px-4 pb-32 pt-4 sm:px-6 xl:px-10">
        {/* ฮีโร: ภาพเต็มกรอบ ตัวหนังสือใหญ่ซ้อนบนไล่เฉดดำ (อ่านชัดทั้งธีมสว่างและมืด) */}
        <section aria-labelledby="hero" className="relative isolate overflow-hidden squircle-3xl border border-line bg-[#0b0d12] text-white">
          <div className="relative aspect-[4/5] w-full sm:aspect-[16/10] lg:aspect-[21/9]">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60rem_30rem_at_20%_0%,#1d4ed833,transparent),linear-gradient(135deg,#0b0d12,#10203f)]" />
            <MakerPhoto src="/landing/makers.webp" alt="ตั้น ศิรายุทธ แน่นสิงห์ ผู้จัดทำเว็บ ในงานแข่งขัน" position="55% 22%" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
            <div className="absolute inset-x-0 bottom-0 grid gap-4 p-6 sm:p-10 lg:p-14">
              <p className="inline-flex w-fit items-center gap-2 squircle-xl bg-white/12 px-3 py-1 text-base font-medium backdrop-blur"><span className="size-2 rounded-full bg-brand-red" aria-hidden /> เบื้องหลังเว็บนี้</p>
              <h1 id="hero" className="max-w-5xl font-display text-[clamp(2.6rem,4.5vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-balance">
                ก้าวข้ามขีดจำกัด<br /><span className="text-white/65">ทะยานเหนือทุกสิ่ง</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-white/80 sm:text-xl">ทุกหน้าที่คุณอ่านผ่านมือคนที่เคยงงกับมันมาก่อน จึงรู้ว่าตรงไหนต้องอธิบายให้ช้าลง</p>
            </div>
          </div>
        </section>

        <Ribbon words={['เขียน', 'ลอง', 'พัง', 'แก้', 'บิน']} />

        {/* คนเขียนเว็บนี้ */}
        <section aria-labelledby="maker" className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-14">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-lg font-medium text-brand-blue">คนเขียนเว็บนี้</p>
            <h2 id="maker" className="mt-3 font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">ตั้น<br /><span className="text-foreground/60">ศิรายุทธ แน่นสิงห์</span></h2>
            <ul className="mt-6 flex flex-wrap gap-2">
              {['อายุ 15 ปี', 'ฝันเป็น Fullstack Developer', 'Next.js · TypeScript'].map((t) => (
                <li key={t} className="squircle-xl border border-line bg-surface px-3.5 py-1.5 text-base font-medium">{t}</li>
              ))}
            </ul>
          </div>
          <div className="grid gap-6 text-xl leading-9 sm:text-2xl sm:leading-10">
            <p className="font-display font-extrabold leading-tight text-balance sm:text-4xl">เริ่มจาก HTML บรรทัดแรก มาถึงวันที่โดรนบินได้บนหน้าเว็บ</p>
            <p className="text-muted-foreground">ผมเรียนจากพื้นฐาน HTML, CSS, JavaScript แล้วต่อขึ้น React, Next.js, TypeScript และฝั่งหลังบ้าน เว็บชมรมนี้คือสนามซ้อมของทุกอย่างที่กำลังเรียน บทเรียน ตัวจำลอง 3 มิติ และระบบหลังบ้าน ล้วนเป็นสิ่งที่จับต้องได้จริง</p>
            <p className="text-muted-foreground">ผมชอบงานเรียบง่าย ไม่ซับซ้อน แต่ใช้ได้จริง เพราะความเรียบง่ายคือหัวใจของประสบการณ์ที่ดี หน้าไหนอ่านแล้วต้องไม่งง ใช้แล้วต้องไม่ต้องคิดมาก</p>
            <p className="font-medium">ยังเป็นมือใหม่ และทางยังอีกไกล ถ้ามันพังก็แค่แก้ แล้วบินใหม่</p>
            <a href="https://www.sirayuth.com/" target="_blank" rel="noopener noreferrer" className="group inline-flex min-h-12 w-fit items-center gap-2 squircle-xl border border-line bg-surface px-5 text-base font-semibold transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
              ผลงานอื่นของตั้น <span className="text-muted-foreground">sirayuth.com</span> <ArrowUpRight className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
            </a>
          </div>
        </section>

        {members.length > 0 && (
          <section aria-labelledby="crew" className="grid gap-6">
            <h2 id="crew" className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">ทีมงาน</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m) => (
                <li key={m.name} className="squircle-3xl border border-line bg-surface p-5">
                  <p className="font-display text-2xl font-extrabold">{m.name}</p>
                  <p className="mt-1 text-lg text-brand-blue">{m.role}</p>
                  {m.note && <p className="mt-1 text-base text-muted-foreground">{m.note}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* เครื่องมือ */}
        <section aria-labelledby="stack" className="grid gap-5">
          <h2 id="stack" className="font-display text-3xl font-extrabold sm:text-4xl">สร้างด้วย</h2>
          <ul className="flex flex-wrap gap-2">
            {stack.map((t) => <li key={t} className="squircle-xl border border-line bg-surface px-3.5 py-1.5 text-base font-medium">{t}</li>)}
          </ul>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground">กติกาและขนาดสนามอ้างอิงเอกสารการแข่งขัน ปี ๒๕๖๙ ของสมาคมกีฬาเครื่องบินจำลองและวิทยุบังคับ ภาพจากคู่มือ RCSA EDU เป็นลิขสิทธิ์ของ RCSA ใช้เพื่อการศึกษาและใส่เครดิตไว้ทุกภาพ</p>
        </section>

        <section className="grid items-center gap-5 squircle-3xl border border-line bg-surface p-6 sm:grid-cols-[1fr_auto] sm:p-10">
          <div>
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl">ดูของจริงดีกว่าอ่าน</h2>
            <p className="mt-2 text-lg text-muted-foreground">เปิดตัวจำลอง เขียนคำสั่งแรก แล้วดูโดรนบิน ใช้เวลาไม่ถึงห้านาที</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="h-12 px-6 text-base" render={<Link href="/simulator" />} nativeButton={false}>เปิดตัวจำลอง <ArrowRight className="size-5" aria-hidden /></Button>
            <Button size="lg" variant="outline" className="h-12 px-6 text-base" render={<Link href="/changelog" />} nativeButton={false}>บันทึกการเปลี่ยนแปลง</Button>
          </div>
        </section>
      </main>
    </>
  );
}
