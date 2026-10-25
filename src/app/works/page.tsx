import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Plane } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Header } from '@/sections/Header';
import { SiteFooter } from '@/sections/SiteFooter';
import { getWorks } from '@/lib/works';

export const metadata: Metadata = { title: 'ผลงานทั้งหมด', description: 'ผลงานที่ผ่านมาของชมรมโดรน โรงเรียนลือคำหาญวารินชำราบ รวมภารกิจปล่อยสัมภาระ เจาะลูกโป่ง และยิงเป้า', alternates: { canonical: '/works' } };
export const revalidate = 60;

export default async function WorksPage() {
  const works = await getWorks();
  return (
    <>
      <Header />
      <Breadcrumbs items={[{ label: 'ผลงาน' }]} />
      <main className="mx-auto max-w-[84rem] px-4 pb-32 pt-4 sm:px-6 xl:px-10">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl">ผลงานทั้งหมด</h1>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((w) => (
            <li key={w.id}>
              <Link href={`/works/${w.id}`} className="group block squircle-3xl border border-line bg-surface p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
                <div className="relative aspect-[4/3] overflow-hidden squircle-2xl bg-surface-2">
                  {w.image ? <Image src={w.image} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="grid size-full place-items-center text-muted-foreground"><Plane className="size-12" strokeWidth={1.25} aria-hidden /></div>}
                </div>
                <div className="p-3">
                  <p className="text-base text-muted-foreground">{w.sample ? 'ตัวอย่าง' : w.year ? `ปี ${w.year}` : ''}</p>
                  <h2 className="mt-1 font-display text-2xl font-bold group-hover:text-brand-blue">{w.title}</h2>
                  <p className="mt-1 line-clamp-2 text-base text-muted-foreground">{w.summary}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
