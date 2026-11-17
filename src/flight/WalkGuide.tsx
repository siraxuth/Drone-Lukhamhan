'use client';

import { Button } from '@/components/ui/button';
import { useRef } from 'react';

const Key = ({ children }: { children: React.ReactNode }) => <kbd className="inline-block squircle-sm border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">{children}</kbd>;

export function WalkGuide({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  return <div ref={panelRef} className="absolute inset-0 z-40 grid place-items-center bg-canvas/95 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="walk-guide-title" aria-describedby="walk-guide-intro" onKeyDown={event => {
    if (event.key !== 'Tab') return;
    const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
    if (!buttons?.length) return;
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }}>
    <div className="grid max-h-full w-full max-w-2xl gap-4 overflow-y-auto overscroll-contain squircle-3xl border border-line bg-surface p-4 text-foreground shadow-xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div><h2 id="walk-guide-title" className="text-lg font-bold">เดินในสนามยังไง</h2><p id="walk-guide-intro" className="mt-1 text-sm text-muted-foreground">เริ่มจากกลางขอบสนามด้านล่าง เดินไปจุดเริ่มของด่าน แล้ววางโดรน</p></div>
        <Button type="button" variant="outline" size="sm" autoFocus onClick={onClose} aria-label="ปิดวิธีเดินในสนาม">ปิด</Button>
      </div>
      <div className="grid gap-3 text-sm leading-6 sm:grid-cols-2">
        <section className="squircle-2xl border border-line bg-surface-2 p-3">
          <h3 className="font-bold">คอมพิวเตอร์</h3>
          <p className="mt-1"><Key>W</Key> <Key>A</Key> <Key>S</Key> <Key>D</Key> เดิน · คลิกสนามแล้วขยับเมาส์เพื่อหันมอง ถ้าเบราว์เซอร์ไม่จับเมาส์ ให้คลิกลากในสนาม</p>
          <p className="mt-1"><Key>F</Key> เปิดมุมจัดจุดวาง · <Key>K</Key> เปิดรีโมทกลางจอ · เลข <Key>1</Key>–<Key>9</Key> สั่ง KEY ได้ทันที · <Key>E</Key> ลงฉุกเฉิน</p>
          <p className="mt-1"><Key>Esc</Key> ปล่อยเมาส์ที่ถูกจับอยู่ กดอีกครั้งเพื่อย่อเต็มจอ ถ้าใช้วิธีคลิกลาก กดครั้งเดียวก็ย่อได้</p>
        </section>
        <section className="squircle-2xl border border-line bg-surface-2 p-3">
          <h3 className="font-bold">มือถือและแท็บเล็ต</h3>
          <p className="mt-1">ลากจอยซ้ายเพื่อเดิน ปัดบนพื้นที่ด้านขวาเพื่อหันมอง</p>
          <p className="mt-1">ปุ่มจัดจุดวาง, KEY, Manual, ฉุกเฉิน และจับโดรนอยู่ด้านขวาของจอ กด “เปิดก้านโดรน” เมื่อต้องการบังคับเอง</p>
        </section>
        <section className="squircle-2xl border border-line bg-surface-2 p-3">
          <h3 className="font-bold">วางโดรนและบิน</h3>
          <p className="mt-1">เดินเข้าใกล้แท่นแล้วกด <Key>F</Key> ลากโดรนเข้าจุดสีขาวและลากวงฟ้ารอบตัวเพื่อหมุนหัว กล้องจะล็อกไว้ จุดวางเปลี่ยนเป็นสีฟ้าเมื่อโดรนอยู่ตรงนั้น</p>
          <p className="mt-1">ระบบลองรันโค้ดเพื่อแนะนำจุดวาง กดยืนยันแล้วเลือก KEY ที่ผูกกับโค้ด ก่อนกด KEY ยังกลับมาแก้จุดวางได้ ถ้าไม่อยากเดิน ใช้ปุ่ม Setup ในมุมบนหรือมุมตามโดรน</p>
        </section>
        <section className="squircle-2xl border border-line bg-surface-2 p-3">
          <h3 className="font-bold">บังคับและกู้โดรน</h3>
          <p className="mt-1">สลับเป็น manual แล้วใช้ปุ่มลูกศรบังคับแนวราบ <Key>I</Key>/<Key>K</Key> ขึ้นลง <Key>J</Key>/<Key>L</Key> หมุนหัว หรือใช้ก้านบนจอ</p>
          <p className="mt-1">ใกล้ชนกด <Key>E</Key> หรือปุ่ม “ฉุกเฉิน” เพื่อลงจอด หากอยู่ใกล้โดรน กดค้าง “จับและพลิก” ให้ใบพัดหยุด แล้วปิดเปิดโดรนใหม่</p>
        </section>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm">
        <p className="text-muted-foreground">ในเต็มจอสลับมุมได้ที่แถบบน · <Key>Ctrl</Key> + <Key>Shift</Key> + <Key>X</Key> ใช้ขยายหรือย่อสนาม · เวลาเดินต่อถ้าเปิดคู่มือระหว่างบิน</p>
        <Button type="button" onClick={onClose}>เข้าใจแล้ว เริ่มเดิน</Button>
      </div>
    </div>
  </div>;
}
