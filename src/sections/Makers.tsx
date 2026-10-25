import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { MakerPhoto } from '@/components/MakerPhoto';

/** คำคมประโยคเดียวของคนทำเว็บ พร้อมภาพคนทำ วางเหนือท้ายหน้าแรก · กดไปหน้า /team */
export function Makers() {
  return (
    <aside id="makers" aria-label="คนทำเว็บนี้" className="mx-auto max-w-[84rem] px-4 pb-16 sm:px-6 xl:px-10">
      <Link href="/team" className="group grid overflow-hidden squircle-3xl border border-line bg-[#0b0d12] text-white transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
        <div className="relative aspect-[16/10] sm:aspect-auto sm:min-h-46">
          <MakerPhoto src="/landing/makers.webp" alt="ผู้จัดทำเว็บในชุดนักเรียน ยืนอยู่ในงานแข่งขัน" position="55% 20%" sizes="(min-width: 640px) 19rem, 100vw" priority={false} />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0b0d12] max-sm:bg-gradient-to-b max-sm:to-[#0b0d12]/70" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 py-7 sm:px-10">
          <p className="font-display text-[clamp(1.8rem,4vw,3rem)] font-extrabold leading-tight tracking-tight">
            ก้าวข้ามขีดจำกัด <span className="bg-gradient-to-r from-sky-300 to-rose-300 bg-clip-text text-transparent">ทะยานเหนือทุกสิ่ง</span>
          </p>
          <span className="inline-flex items-center gap-1.5 text-base font-semibold text-white/80 group-hover:text-white">
            คนทำเว็บนี้ <ArrowUpRight className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </Link>
    </aside>
  );
}
