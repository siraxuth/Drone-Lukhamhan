'use client';

import { useEffect, useState } from 'react';
import { Video } from 'lucide-react';
import { PHONE_REMOTE_API, FRAME_INTERVAL_MS, type PhoneView } from './phone-remote';
import styles from './phone-controller.module.css';

export const cameraLabels: Record<PhoneView, string> = {
  off: 'ซ่อนภาพ',
  fpv: 'กล้องหน้าโดรน',
  chase: 'มุมไล่ตาม',
  top: 'มุมสูง',
  side: 'มุมข้าง',
};

export function PhoneLiveView({ code, secret, view }: { code: string; secret: string; view: Exclude<PhoneView, 'off'> }) {
  const [image, setImage] = useState('');
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let current = '';
    let lastId = '';
    let lastFrame = performance.now();
    const cancel = new AbortController();
    async function receive() {
      try {
        if (!document.hidden) {
          const response = await fetch(PHONE_REMOTE_API, { cache: 'no-store',
            signal: AbortSignal.any([cancel.signal, AbortSignal.timeout(700)]),
            headers: { 'X-Pair-Code': code, 'X-Camera-View': view, 'X-Last-Frame': lastId, Authorization: `Bearer ${secret}` } });
          if (response.status === 200) {
            const data = await response.blob();
            if (stopped) return;
            const url = URL.createObjectURL(data);
            const next = new Image();
            next.src = url;
            try { await next.decode(); } catch { URL.revokeObjectURL(url); throw new Error('Unreadable frame'); }
            if (stopped) { URL.revokeObjectURL(url); return; }
            const previous = current;
            current = url;
            lastId = response.headers.get('X-Frame-Id') ?? '';
            lastFrame = performance.now();
            setImage(current);
            setWaiting(false);
            if (previous) URL.revokeObjectURL(previous);
          }
        }
      } catch { /* Keep receiving after a delayed or missing frame. */ }
      if (stopped) return;
      if (performance.now() - lastFrame > 2200) setWaiting(true);
      timer = setTimeout(receive, document.hidden ? 450 : FRAME_INTERVAL_MS);
    }
    void receive();
    return () => {
      stopped = true;
      cancel.abort();
      clearTimeout(timer);
      if (current) URL.revokeObjectURL(current);
    };
  }, [code, secret, view]);

  return <div className={styles.liveView} aria-label={cameraLabels[view]}>
    {image && <img src={image} alt={cameraLabels[view]} draggable={false} />}
    {(!image || waiting) && <div className={styles.liveWait}>
      <Video className="size-4" aria-hidden />
      <span>{waiting ? 'รอภาพจากคอม เปิดสนามเป็น 3 มิติและคงหน้าสนามไว้' : 'กำลังรับภาพจากสนาม'}</span>
    </div>}
  </div>;
}
