import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, MapPin, Plane } from 'lucide-react';

type Props = { id: string; title: string; summary: string; image: string | null; year: string; location: string; n: number };

/** การ์ดผลงานขนาดเท่ากันทุกใบ: ภาพ 16:9 อยู่บน (ภาพส่วนใหญ่ 1920×1080) ข้อความอยู่ล่าง · กว้าง 16rem พอดี 4 ใบบนจอใหญ่ */
export function ShowcaseCard({ id, title, summary, image, year, location, n }: Props) {
  const c = 'absolute size-4 border-brand-blue transition-all duration-300';
  return (
    <Link
      href={`/works/${id}`}
      draggable={false}
      className="group flex w-[16rem] shrink-0 snap-start flex-col squircle-3xl border border-line bg-surface p-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
    >
      <div className="relative aspect-video overflow-hidden squircle-2xl bg-[#0b0d12]">
        {image ? (
          <Image src={image} alt="" fill sizes="16rem" draggable={false} className="object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="grid size-full place-items-center text-white/50" aria-hidden><Plane className="size-10" strokeWidth={1.25} /></div>
        )}
        <span className="absolute left-2.5 top-2.5 squircle-xl bg-black/60 px-2.5 py-0.5 font-mono text-base font-semibold text-white backdrop-blur-sm">{String(n).padStart(2, '0')}</span>
        {n === 1 && <span className="absolute right-2.5 top-2.5 squircle-xl bg-brand-blue px-2.5 py-0.5 text-base font-semibold text-white">เด่น</span>}
        <span aria-hidden className="pointer-events-none absolute inset-0">
          <span className={`${c} bottom-2 left-2 rounded-bl-md border-b-[3px] border-l-[3px] group-hover:bottom-1 group-hover:left-1`} />
          <span className={`${c} bottom-2 right-2 rounded-br-md border-b-[3px] border-r-[3px] group-hover:bottom-1 group-hover:right-1`} />
        </span>
      </div>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          {year && <span className="shrink-0 squircle-xl bg-surface-2 px-2 py-0.5 font-medium text-foreground">{year}</span>}
          {location && (
            <span className="flex min-w-0 items-center gap-1" title={location}>
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{location}</span>
            </span>
          )}
        </div>
        <h3 className="mt-2 line-clamp-2 font-display text-xl font-extrabold leading-snug group-hover:text-brand-blue">{title}</h3>
        <p className="mt-2 line-clamp-2 text-base text-muted-foreground">{summary}</p>
        <span className="mt-auto inline-flex min-h-11 items-center gap-1 pt-3 text-base font-semibold text-brand-blue">ดูรายละเอียด <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden /></span>
      </div>
    </Link>
  );
}
