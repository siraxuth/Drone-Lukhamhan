import Image from 'next/image';
import Link from 'next/link';
import { ChevronsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Hero: บอกให้ชัดว่านี่คือใคร (ชมรมโดรน + โรงเรียน) แล้วให้โดรน 3 มิติด้านหลังเป็นตัวโชว์
 * ไม่มีคำอธิบาย — คำอธิบายทั้งหมดอยู่ใน /docs
 */
export function Hero() {
  return (
    <div className="h-full">
      <div className="mx-auto flex h-full max-w-[84rem] flex-col justify-end px-4 pb-14 pt-[26rem] sm:px-6 xl:px-10 sm:pb-20 sm:pt-36">
        <div className="flex items-center gap-3">
          <Image src="/brand/logo.webp" alt="" width={96} height={96} className="size-12 squircle-xl" priority />
          <p className="text-lg font-medium sm:text-xl">โรงเรียนลือคำหาญวารินชำราบ</p>
        </div>
        <h1 className="mt-5 font-display text-[clamp(2.8rem,9vw,6.5rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-balance">
          <span className="block">ชมรมโดรน</span>
          <span className="block text-muted-foreground">ลือคำหาญฯ</span>
        </h1>
        <div data-tour="hero-cta" className="mt-8 flex w-fit max-w-full flex-wrap gap-3">
          <Button size="lg" className="h-12 px-7 text-base" render={<Link href="/#showcase" />} nativeButton={false}>ดูผลงานของเรา</Button>
          <Button size="lg" variant="outline" className="h-12 px-7 text-base" render={<Link href="/simulator" />} nativeButton={false}>ลองบินจำลอง</Button>
        </div>
        <p className="mt-6 flex items-center gap-2 text-base text-muted-foreground"><ChevronsDown className="size-5 animate-bounce motion-reduce:animate-none" aria-hidden /> เลื่อนลงเพื่อดูโดรนและผลงาน โดรนด้านหลังหมุนตามที่เลื่อน</p>
      </div>
    </div>
  );
}
