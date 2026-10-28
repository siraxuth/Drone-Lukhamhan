'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * เปลี่ยนหน้าใน /docs แล้วเด้งขึ้นบนสุดเสมอ
 * Next เลื่อนให้เองเฉพาะเมื่อส่วนบนของหน้าใหม่พ้นจอ แต่ layout ของ docs มีองค์ประกอบที่ติดอยู่กับจอ ทำให้ค้างกลางหน้า
 * ไม่ทำเมื่อมี #hash (ลิงก์ไปหัวข้อ) และเลื่อนแบบทันที เพราะ html ตั้ง scroll-behavior: smooth
 */
export function ScrollTop() {
  const pathname = usePathname();
  useEffect(() => {
    if (location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}
