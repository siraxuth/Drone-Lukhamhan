'use client';

import Image from 'next/image';
import { useState } from 'react';

/** ภาพหลักของหน้าผู้จัดทำ: ถ้าไฟล์ภาพเสียหรือหาไม่เจอ ซ่อนภาพและเหลือพื้นไล่สี ไม่ให้หน้าพัง */
export function MakerPhoto({ src, alt, position = 'center', sizes = '(min-width: 1344px) 84rem, 100vw', priority = true }: { src: string; alt: string; position?: string; sizes?: string; priority?: boolean }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return <Image src={src} alt={alt} fill priority={priority} sizes={sizes} onError={() => setOk(false)} className="object-cover" style={{ objectPosition: position }} />;
}
