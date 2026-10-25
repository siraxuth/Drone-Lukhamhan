import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { currentSeason } from '@/rules';

/** 3 ประเภทที่ชมรมส่งแข่ง (ข้อมูลและรูปจากกติกาปีปัจจุบัน) */
export function Events() {
  return (
    <section id="events" data-pose="field" className="mx-auto max-w-[84rem] px-4 py-24 sm:px-6 xl:px-10 sm:py-32">
      <div data-reveal-group>
        <h2 data-reveal-item className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl">เราลงแข่ง 3 ประเภท</h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {currentSeason.events.map((e, i) => (
            <Link key={e.id} href="/field" data-reveal-item className="group relative isolate flex min-h-[26rem] flex-col justify-end overflow-hidden squircle-3xl border border-line bg-[#0b0d12] p-6 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
              <Image src={`/field/${e.id}-3d.webp`} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="-z-10 object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/20 to-transparent" aria-hidden />
              <p className="font-mono text-base text-white/80">0{i + 1}</p>
              <h3 className="mt-1 font-display text-3xl font-extrabold">{e.short}</h3>
              <p className="mt-1 text-lg text-white/80">{e.nameEn}</p>
              <span className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-base font-semibold">ดูสนามประเภทนี้ <ArrowUpRight className="size-5" aria-hidden /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
