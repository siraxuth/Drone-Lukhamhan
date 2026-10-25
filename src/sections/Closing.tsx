import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Makers } from '@/sections/Makers';
import { SiteFooter } from '@/sections/SiteFooter';

export function Closing() {
  return (
    <>
      <section data-pose="closing" className="relative isolate py-32 text-center sm:py-44">
        <div data-reveal-group className="mx-auto max-w-3xl px-4">
          <Image data-reveal-item src="/brand/logo.webp" alt="" width={160} height={160} className="mx-auto mb-6 size-28 squircle-3xl" />
          <h2 data-reveal-item className="font-display text-4xl font-extrabold tracking-tight text-balance sm:text-6xl">ชมรมโดรน โรงเรียนลือคำหาญวารินชำราบ</h2>
          <div data-reveal-item className="mt-10 flex flex-wrap justify-center gap-3">
            <Button size="lg" className="h-12 px-7 text-base" render={<Link href="/docs" />} nativeButton={false}>เริ่มเรียน</Button>
            <Button size="lg" variant="outline" className="h-12 px-7 text-base" render={<Link href="/simulator" />} nativeButton={false}>ลองบินจำลอง</Button>
          </div>
        </div>
      </section>
      <Makers />
      <SiteFooter />
    </>
  );
}
