import Image from 'next/image';
import type { ReactNode } from 'react';

type Props = {
  caption: string;
  /** รูปไฟล์จริง (public/docs/…) */
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  /** ที่มา/เครดิต เช่น "คู่มือ RCSA EDU หน้า 12" */
  credit?: string;
  /** ใส่ SVG ตรงนี้แทน src */
  children?: ReactNode;
  /** ภาพแคบ (แนวตั้ง/ไอคอน) ให้จัดกลางและไม่ขยายเต็ม */
  narrow?: boolean;
};

/** รูป/แผนภาพพร้อมคำบรรยาย ใช้แทน ![]() ใน docs ทุกที่ */
export function Figure({ caption, src, alt, width = 1600, height = 900, credit, children, narrow }: Props) {
  return (
    <figure className={`not-prose my-8 ${narrow ? 'mx-auto max-w-md' : ''}`}>
      <div className="overflow-hidden squircle-3xl border border-line bg-surface p-3 sm:p-5">
        {src ? <Image src={src} alt={alt ?? caption} width={width} height={height} className="h-auto w-full squircle-2xl" sizes="(min-width: 1024px) 48rem, 100vw" /> : children}
      </div>
      <figcaption className="mt-3 px-1 text-base leading-7 text-muted-foreground">
        {caption}
        {credit && <span className="block text-sm">ที่มา: {credit}</span>}
      </figcaption>
    </figure>
  );
}
