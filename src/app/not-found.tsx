import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Header } from '@/sections/Header';
import { SiteFooter } from '@/sections/SiteFooter';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';
import { shareMetadata } from '@/lib/og';

const title = 'ไม่พบหน้าที่ต้องการ';
const description = 'ลิงก์อาจพิมพ์ผิดหรือหน้านี้ถูกย้ายไปแล้ว กลับไปดูเนื้อหาจากเว็บไซต์ชมรมโดรนได้';
export const metadata: Metadata = { title, description, ...shareMetadata({ title, description, path: '/404' }) };

export default function NotFound() {
  return (
    <>
      <Header />
      <Breadcrumbs items={[{ label: 'ไม่พบหน้านี้' }]} />
      <main className="mx-auto grid max-w-2xl justify-items-start gap-4 px-4 pb-32 pt-10 sm:px-6">
        <h1 className="font-display text-4xl font-extrabold sm:text-6xl">ไม่พบหน้านี้</h1>
        <p className="text-lg text-muted-foreground">ลิงก์อาจพิมพ์ผิดหรือหน้านี้ถูกย้ายไปแล้ว</p>
        <Button size="lg" className="h-12 text-base" render={<Link href="/" />} nativeButton={false}>กลับหน้าแรก</Button>
      </main>
      <SiteFooter />
    </>
  );
}
