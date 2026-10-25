'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { detectQuality, type Quality } from './quality';

const Drone3D = dynamic(() => import('./Drone3D'), { ssr: false });
// เริ่มดึงโค้ด 3 มิติตั้งแต่ตอนหน้าถูก hydrate ไม่ต้องรอ effect เลือกคุณภาพ (ได้เวลาคืนหลายร้อยมิลลิวินาที)
if (typeof window !== 'undefined') void import('./Drone3D');

type Mode = Quality | 'pending';

/**
 * พื้นหลัง 3D เต็มจอ อยู่หลังเนื้อหาทั้งหน้า
 * ตั้ง <html data-scene3d> ให้ CSS ซ่อน/แสดงภาพนิ่งสำรอง (.scene-poster)
 */
export function SceneLayer() {
  const [mode, setMode] = useState<Mode>('pending');
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    setMode(detectQuality());
    return () => mq.removeEventListener('change', sync);
  }, []);

  // ลดความเคลื่อนไหว: ไม่ต้องโหลด 3D เลย ใช้ภาพนิ่ง
  const effective: Mode = reduced && mode !== 'pending' ? 'off' : mode;

  useEffect(() => {
    document.documentElement.dataset.scene3d = effective === 'low' || effective === 'high' ? 'on' : 'off';
  }, [effective]);

  // เครื่องลากไม่ไหวระหว่างใช้งาน (FPS ต่ำต่อเนื่อง) → สลับเป็นภาพนิ่ง
  const fail = useCallback(() => setMode('off'), []);

  if (effective !== 'low' && effective !== 'high') return null;
  return (
    <div className="scene-layer pointer-events-none fixed inset-0 z-0" aria-hidden>
      <Drone3D quality={effective} onFail={fail} />
    </div>
  );
}
