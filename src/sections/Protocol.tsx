'use client';

import { useRef } from 'react';
import { Cpu, MonitorSmartphone, Plane } from 'lucide-react';
import { AnimatedBeam } from '@/components/ui/animated-beam';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { layers, quotes } from './content';

const frames = [
  { id: 'serial', label: 'รีโมท ↔ คอม', hex: 'AB CD 01 10', desc: 'เหมือนจดหมายหนึ่งฉบับ: AB CD คือหัวจดหมาย บอกว่าเริ่มคำสั่งใหม่ · 01 คือจำนวนข้อมูล · 10 คือรหัสแปลว่า “ขึ้นบิน”' },
  { id: 'i2c', label: 'บอร์ดเรา ↔ สมองโดรน', hex: '[n] [F_POS] zL zH 00 00', desc: 'กล่องข้อความ 6 ช่อง: ช่องแรกเป็นเลขลำดับ (เปลี่ยนทุกครั้งที่สั่งใหม่) ช่องที่สองบอกว่าสั่งอะไร ที่เหลือคือตัวเลขประกอบ เช่น ความสูงกี่ ซม. สมองโดรนจะมาเปิดอ่านเอง' },
  { id: 'formation', label: 'บินเป็นฝูง', hex: 'FA [data…] CRC_LO CRC_HI', desc: 'มีรหัสตรวจทานต่อท้าย (เหมือนเลขตรวจบนบัตรประชาชน) ถ้าข้อมูลเพี้ยนระหว่างทาง โดรนจะรู้และไม่ทำตาม คุมได้พร้อมกันถึง 20 ลำ' },
];

export function Protocol() {
  const box = useRef<HTMLDivElement>(null);
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  const c = useRef<HTMLDivElement>(null);
  const nodes = [
    { ref: a, Icon: MonitorSmartphone, l: layers[0] },
    { ref: b, Icon: Cpu, l: layers[1] },
    { ref: c, Icon: Plane, l: layers[2] },
  ];
  return (
    <section id="protocol" data-pose="protocol" className="py-28">
      <div data-reveal-group className="mx-auto max-w-5xl px-4">
        <p data-reveal-item className="text-sm font-medium text-brand-blue">คำสั่งเดินทางยังไง</p>
        <h2 data-reveal-item className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">กดปุ่มเดียว ผ่าน 3 ทอด ถึงใบพัด</h2>
        <p data-reveal-item className="quote mt-3 text-muted-foreground">“{quotes.protocol}”</p>
        <div data-reveal-item ref={box} className="relative mt-12 grid grid-cols-3 items-center gap-2">
          {nodes.map(({ ref, Icon, l }) => (
            <div key={l.name} className="flex flex-col items-center gap-3 text-center">
              <div ref={ref} className="squircle-2xl z-10 grid size-16 place-items-center border border-line bg-surface text-brand-blue sm:size-20"><Icon className="size-7 sm:size-9" /></div>
              <p className="font-display text-sm font-semibold sm:text-lg">{l.name}</p>
              <p className="hidden max-w-[16rem] text-sm text-muted-foreground sm:block">{l.detail}</p>
            </div>
          ))}
          <AnimatedBeam containerRef={box} fromRef={a} toRef={b} gradientStartColor="var(--brand-blue)" gradientStopColor="var(--brand-red)" pathColor="var(--line)" />
          <AnimatedBeam containerRef={box} fromRef={b} toRef={c} gradientStartColor="var(--brand-blue)" gradientStopColor="var(--brand-red)" pathColor="var(--line)" delay={1} />
        </div>
        <h3 className="mt-14 font-display text-xl font-semibold">อยากรู้ลึก: หน้าตาข้อมูลจริงที่วิ่งในสาย</h3>
        <p className="mt-1 text-sm text-muted-foreground">ข้ามได้ถ้ายังไม่สนใจ ส่วนนี้สำหรับคนที่อยากรู้ว่าเครื่องคุยกันยังไง</p>
        <Tabs defaultValue="serial" className="mt-4">
          <TabsList className="flex-wrap">
            {frames.map((f) => <TabsTrigger key={f.id} value={f.id}>{f.label}</TabsTrigger>)}
          </TabsList>
          {frames.map((f) => (
            <TabsContent key={f.id} value={f.id}>
              <Card className="squircle-2xl mt-3">
                <CardContent className="grid gap-3 p-6">
                  <code className="squircle-xl w-fit max-w-full overflow-x-auto bg-surface-2 px-4 py-2 font-mono text-base text-brand-blue">{f.hex}</code>
                  <p className="max-w-2xl leading-relaxed text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
