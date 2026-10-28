import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, PlayCircle, Plane } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Header } from '@/sections/Header';
import { SiteFooter } from '@/sections/SiteFooter';
import { Button } from '@/components/ui/button';
import { getWork, getWorks } from '@/lib/works';
import { clean } from '@/lib/rich';
import { youtubeId } from '@/lib/video';
import { WorkGallery } from '@/components/WorkGallery';
import { OtherWorks } from '@/components/OtherWorks';
import { JsonLd } from '@/components/JsonLd';
import { workSchema } from '@/lib/schema';
import { ogImageUrl } from '@/lib/og';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const w = await getWork((await params).id);
  if (!w) return {};
  const image = ogImageUrl(w.title, w.summary);
  return {
    title: w.title,
    description: w.summary,
    alternates: { canonical: `/works/${w.id}` },
    robots: w.sample ? { index: false, follow: true } : undefined,
    openGraph: { type: 'article', title: w.title, description: w.summary, url: `/works/${w.id}`, locale: 'th_TH', images: [{ url: image, width: 1200, height: 628, alt: w.title }] },
    twitter: { card: 'summary_large_image', title: w.title, description: w.summary, images: [image] },
  };
}

export default async function WorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await getWork(id);
  if (!w) notFound();
  const others = (await getWorks(12)).filter((o) => o.id !== w.id).slice(0, 10);
  const html = clean(w.description);
  const yt = youtubeId(w.videoUrl);

  return (
    <>
      <Header />
      {!w.sample && <JsonLd data={workSchema({ id: w.id, title: w.title, summary: w.summary, image: w.image, year: w.year, location: w.location, videoId: yt })} />}
      <Breadcrumbs items={[{ label: 'ผลงาน', href: '/works' }, { label: w.title }]} />
      <main className="mx-auto max-w-[84rem] px-4 pb-32 pt-4 sm:px-6 xl:px-10">
        <header>
          <p className="text-lg text-muted-foreground">{w.sample ? 'ตัวอย่าง' : w.year ? `ปี ${w.year}` : ''}</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold leading-tight tracking-tight text-balance sm:text-6xl">{w.title}</h1>
          {w.location && <p className="mt-3 flex items-start gap-2 text-lg text-muted-foreground"><MapPin className="mt-1 size-5 shrink-0 text-brand-blue" aria-hidden /> {w.location}</p>}
        </header>

        <div className="relative mt-8 aspect-[16/9] overflow-hidden squircle-3xl border border-line bg-surface-2">
          {w.image ? <Image src={w.image} alt={w.title} fill priority sizes="(min-width: 1344px) 84rem, 100vw" className="object-cover" /> : <div className="grid size-full place-items-center text-muted-foreground"><Plane className="size-20" strokeWidth={1.25} aria-hidden /></div>}
        </div>

        {yt && (
          <section className="mt-10" aria-labelledby="clip">
            <h2 id="clip" className="mb-3 font-display text-2xl font-extrabold">คลิปการแข่งขัน</h2>
            <div className="relative aspect-video overflow-hidden squircle-3xl border border-line bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0`}
                title={`คลิป ${w.title}`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="absolute inset-0 size-full"
              />
            </div>
          </section>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <article className="squircle-3xl border border-line bg-surface p-6 sm:p-10">
            <div className="rich text-lg leading-8" dangerouslySetInnerHTML={{ __html: html }} />
          </article>
          <aside className="grid h-fit gap-5 squircle-3xl border border-line bg-surface p-6 lg:sticky lg:top-28">
            <div>
              <h2 className="text-base font-semibold text-muted-foreground">สถานที่</h2>
              <p className={`mt-2 text-lg ${w.location ? '' : 'text-muted-foreground'}`}>{w.location || 'ยังไม่ระบุ'}</p>
            </div>
            {w.year && <div><h2 className="text-base font-semibold text-muted-foreground">ปี</h2><p className="mt-2 text-lg">{w.year}</p></div>}
            {w.images.length > 0 && <div><h2 className="text-base font-semibold text-muted-foreground">ภาพทั้งหมด</h2><a href="#gallery" className="mt-2 inline-block text-lg font-semibold text-brand-blue hover:underline">{w.images.length + 1} ภาพ ดูด้านล่าง</a></div>}
            {w.videoUrl && !yt && <Button size="lg" className="h-12 text-base" render={<a href={w.videoUrl} target="_blank" rel="noreferrer" />} nativeButton={false}><PlayCircle className="size-5" aria-hidden /> ดูคลิป</Button>}
          </aside>
        </div>

        {w.images.length > 0 && (
          <section id="gallery" className="mt-14 scroll-mt-28" aria-labelledby="gallery-title">
            <h2 id="gallery-title" className="mb-5 font-display text-3xl font-extrabold">ภาพทั้งหมด <span className="text-muted-foreground">({[w.image, ...w.images].filter(Boolean).length})</span></h2>
            <WorkGallery images={[w.image, ...w.images].filter((u): u is string => !!u)} title={w.title} />
          </section>
        )}

        {others.length > 0 && <OtherWorks items={others.map((o) => ({ id: o.id, title: o.title, summary: o.summary, image: o.image, year: o.year }))} />}
      </main>
      <SiteFooter />
    </>
  );
}
