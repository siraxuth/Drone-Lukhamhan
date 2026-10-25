'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

/** แกลเลอรีภาพของผลงาน: ตารางภาพทั้งหมด กดดูภาพใหญ่ได้ เลื่อนด้วยลูกศร (ปุ่มหรือคีย์บอร์ด) */
export function WorkGallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const go = useCallback((d: 1 | -1) => setOpen((i) => (i === null ? i : (i + d + images.length) % images.length)), [images.length]);

  useEffect(() => {
    if (open === null) return;
    const on = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [open, go]);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((src, i) => (
          <li key={src} className={i === 0 && images.length > 2 ? 'col-span-2 row-span-2' : ''}>
            <button type="button" onClick={() => setOpen(i)} aria-label={`ดูภาพที่ ${i + 1} จาก ${images.length}`}
              className="group relative block aspect-[4/3] size-full overflow-hidden squircle-2xl border border-line bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
              <Image src={src} alt={`${title} ภาพที่ ${i + 1}`} fill sizes="(min-width: 1024px) 24vw, (min-width: 640px) 33vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent showCloseButton={false} className="max-h-[94dvh] w-[96vw] max-w-6xl gap-3 border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-6xl">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">ภาพที่ {open === null ? 0 : open + 1} จาก {images.length}</DialogDescription>
          {open !== null && (
            <div className="relative grid place-items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[open]} alt={`${title} ภาพที่ ${open + 1}`} className="max-h-[84dvh] w-auto max-w-full squircle-2xl object-contain" />
              {images.length > 1 && (
                <>
                  <button type="button" onClick={() => go(-1)} aria-label="ภาพก่อนหน้า" className="absolute left-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center squircle-xl bg-black/60 text-white backdrop-blur hover:bg-black/80"><ChevronLeft className="size-6" /></button>
                  <button type="button" onClick={() => go(1)} aria-label="ภาพถัดไป" className="absolute right-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center squircle-xl bg-black/60 text-white backdrop-blur hover:bg-black/80"><ChevronRight className="size-6" /></button>
                </>
              )}
              <button type="button" onClick={() => setOpen(null)} aria-label="ปิด" className="absolute right-2 top-2 grid size-11 place-items-center squircle-xl bg-black/60 text-white backdrop-blur hover:bg-black/80"><X className="size-5" /></button>
              <p className="absolute bottom-2 left-1/2 -translate-x-1/2 squircle-xl bg-black/60 px-3 py-1 text-base text-white">{open + 1} / {images.length}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
