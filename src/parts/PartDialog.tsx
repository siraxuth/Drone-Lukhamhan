'use client';

import { useState } from 'react';
import { ArrowLeft, ExternalLink, Rotate3D } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PartDetailModel } from './AssemblyDrone';
import { manualUrl, partById, parts, type PartId } from './data';
import { narratives } from './narratives';
import { PortGuide } from './PortGuide';

export function PartDialog({ partId, open, onOpenChange, onSelectPart }: { partId: PartId | null; open: boolean; onOpenChange: (open: boolean) => void; onSelectPart: (id: PartId) => void }) {
  const [reference,setReference]=useState(partId === 'accel');
  const part = partId ? partById[partId] : null;
  if (!part) return null;
  const story = narratives[part.id];
  const number = String(parts.findIndex((item) => item.id === part.id) + 1).padStart(2, '0');
  const alternate = ['gyro','accel','lidar'].includes(part.id);

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent showCloseButton={false} className="grid gap-0 overflow-y-auto border-0 bg-canvas p-0 text-foreground !rounded-none" style={{ inset: 0, width: '100vw', height: '100dvh', maxWidth: 'none', translate: 'none' }}>
      <button type="button" onClick={() => onOpenChange(false)} autoFocus className="absolute left-3 top-3 z-30 inline-flex min-h-11 items-center gap-2 squircle-xl border border-line bg-surface/95 px-4 text-sm font-bold shadow-lg backdrop-blur-sm hover:bg-surface-2 sm:left-5 sm:top-5"><ArrowLeft className="size-4" aria-hidden /> กลับไปที่โดรน</button>
      <div className="grid min-h-full lg:h-full lg:grid-cols-[minmax(0,1.3fr)_minmax(24rem,0.7fr)]">
        <div className="parts-workbench relative h-[48dvh] min-h-72 overflow-hidden lg:h-full">
          <PartDetailModel part={part.id} reference={reference} />
          <div className="pointer-events-none absolute bottom-4 left-4 inline-flex items-center gap-2 squircle-xl border border-line bg-surface/95 px-3 py-2 text-xs font-semibold text-foreground"><Rotate3D className="size-4 text-brand-blue" aria-hidden /> ลากหมุน · เลื่อนซูม · แสดงเฉพาะชิ้นนี้</div>
          {alternate && <button type="button" aria-pressed={reference} onClick={()=>setReference(!reference)} className="absolute bottom-16 left-4 min-h-10 squircle-xl border border-line bg-surface px-3 text-sm">{reference ? 'ดูชิ้นที่อยู่ในลำ' : 'ดูบอร์ดตัวอย่าง '+(part.id==='lidar'?'VL53L4CD':'BNO055')}</button>}
        </div>
        <div className="min-w-0 overflow-y-auto border-l border-line bg-surface px-5 pb-10 pt-20 sm:px-8 lg:px-10 lg:pt-24">
          <div className="mb-6 flex items-center justify-between gap-3"><span className="font-mono text-sm font-bold text-brand-blue">RCSA EDU / PART {number}</span><span className="squircle-xl border border-line bg-surface-2 px-2.5 py-1 text-xs font-semibold">{part.english}</span></div>
          <DialogTitle className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">{part.name}</DialogTitle>
          <DialogDescription className="mt-3 text-base leading-7 text-muted-foreground">{part.role} · ชิ้นส่วนในชุดโดรนเพื่อการศึกษา RCSA EDU</DialogDescription>
          <div className="mt-8 squircle-2xl border border-line bg-surface-2 p-5"><p className="text-xs font-bold text-brand-blue">ข้อมูลจากคู่มือและโมเดลอ้างอิง</p><p className="mt-2 text-base font-bold leading-7">{part.spec}</p></div>
          <div className="mt-8 space-y-8">
            {([{ title: story.title, body: story.body }, { title: story.detailTitle, body: story.detail }] as const).map(section => (
              <section key={section.title}>
                <h2 className="text-xl font-extrabold leading-snug">{section.title}</h2>
                <p className="mt-2 text-base leading-8 text-muted-foreground">{section.body}</p>
              </section>
            ))}
          </div>
          {part.id === 'ports' && <PortGuide />}
          {['cover','fc','gyro'].includes(part.id) && <div className="mt-7 squircle-2xl border border-line bg-surface-2 p-4"><p className="text-xs font-bold text-brand-blue">ชิ้นส่วนภายในโดรน</p><p className="mt-1 text-xs leading-5 text-muted-foreground">แตะเพื่อหมุนดูและอ่านหน้าที่ของแต่ละชิ้น</p><div className="mt-3 flex flex-wrap gap-2">{(['esc','gyro','accel','barometer'] as const).filter(id=>id!==part.id).map((id) => <button type="button" key={id} onClick={() => onSelectPart(id)} className="min-h-10 squircle-xl border border-line bg-surface px-3 text-xs font-bold hover:bg-canvas">ดู{partById[id].name} →</button>)}</div></div>}
          <p className="mt-6 text-xs leading-6 text-muted-foreground">อ้างอิง: {part.source}</p>
          {['esc','accel','gyro','barometer','lidar'].includes(part.id) && <p className="mt-3 text-xs leading-6">ใช้รูปทรงอ้างอิงเพื่อให้เห็นหน้าตาชิ้นส่วน รุ่นที่ติดตั้งในโดรนจริงยังไม่ยืนยัน · <a className="underline" href="/models/licenses/parts.txt" target="_blank" rel="noreferrer">ที่มาและสิทธิ์การใช้โมเดล</a></p>}
          <a href={part.id === 'nano' ? 'https://docs.arduino.cc/hardware/nano/' : ['lidar','flow'].includes(part.id) ? 'https://www.bitcraze.io/documentation/hardware/flow_deck_2/flow_deck_2-datasheet.pdf' : manualUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-11 items-center gap-2 squircle-xl border border-line bg-surface-2 px-4 text-sm font-semibold hover:bg-canvas">อ่านคู่มือผู้ผลิต <ExternalLink className="size-4" aria-hidden /></a>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
