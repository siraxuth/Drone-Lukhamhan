'use client';

import dynamic from 'next/dynamic';
import { useId, useState } from 'react';
import { closestCenter, DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Inline } from '../Inline';
import { wrapSetup } from '../wrap';
import type { PublicStep } from '../types';
import { Feedback, type ExerciseProps } from './shared';
import type { StepResult } from '@/app/learn/actions';

const LearnSim = dynamic(() => import('./LearnSim'), { ssr: false, loading: () => <div className="grid h-48 place-items-center squircle-xl border border-line text-muted-foreground">กำลังโหลดสนามจำลอง…</div> });
type A = Extract<PublicStep, { kind: 'arrange' }>;
type Item = { id: string; text: string };

const blockCls = 'flex min-h-11 items-center gap-2 squircle-xl border px-3 py-2 font-mono text-sm font-semibold';

function PaletteBlock({ item, onAdd }: { item: Item; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `p:${item.id}` });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`${blockCls} cursor-grab touch-none border-line bg-surface-2 ${isDragging ? 'opacity-40' : ''}`}>
      <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 break-all">{item.text}</span>
      <button type="button" aria-label={`เพิ่ม ${item.text}`} onPointerDown={(e) => e.stopPropagation()} onClick={onAdd} className="grid size-8 shrink-0 place-items-center squircle-xl hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-blue"><Plus className="size-4" aria-hidden /></button>
    </div>
  );
}

function Slot({ item, onRemove }: { item: Item; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`${blockCls} border-brand-blue/50 bg-brand-blue/10 ${isDragging ? 'opacity-50' : ''}`}>
      <button type="button" aria-label={`ลากเพื่อย้าย ${item.text}`} {...attributes} {...listeners} className="grid size-8 shrink-0 cursor-grab touch-none place-items-center squircle-xl hover:bg-surface"><GripVertical className="size-4 text-brand-blue" aria-hidden /></button>
      <span className="min-w-0 flex-1 break-all">{item.text}</span>
      <button type="button" aria-label={`เอา ${item.text} ออก`} onClick={onRemove} className="grid size-8 shrink-0 place-items-center squircle-xl hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-blue"><X className="size-4" aria-hidden /></button>
    </li>
  );
}

function Tray({ children, empty }: { children: React.ReactNode; empty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'tray' });
  return (
    <div ref={setNodeRef} className={`min-h-40 squircle-xl border-2 border-dashed p-3 transition-colors ${isOver ? 'border-brand-blue bg-brand-blue/5' : 'border-line'}`}>
      {empty && <p className="grid min-h-32 place-items-center text-center text-base text-muted-foreground">ลากบล็อกมาวางที่นี่ หรือกดปุ่ม + ที่บล็อก</p>}
      {children}
    </div>
  );
}

/**
 * ลากบล็อกคำสั่งมาเรียงเป็นโปรแกรม แล้วกด "ตรวจ" (เซิร์ฟเวอร์ตัดสิน) และ "ดูโดรนบิน" (เล่นในสนามจำลอง)
 * ใช้ได้ทั้งเมาส์ นิ้วสัมผัส และคีย์บอร์ด (โฟกัสที่ปุ่มจับ กด Space แล้วใช้ลูกศร) หรือแตะ + เพื่อเพิ่มต่อท้าย
 */
export function Arrange({ step, passed, submit, onResult, busy }: ExerciseProps & { step: A }) {
  const uid = useId();
  const [seq, setSeq] = useState<Item[]>([]);
  const [res, setRes] = useState<StepResult | null>(null);
  const [showSim, setShowSim] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [n, setN] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const locked = passed || (res?.ok === true && res.passed);
  const palette = step.blocks.map((text, i) => ({ id: `${uid}-b${i}`, text }));
  const used = new Set(seq.map((s) => s.id.replace(/-c\d+$/, '')));
  const free = palette.filter((p) => !used.has(p.id));
  const code = wrapSetup(seq.map((s) => s.text));

  const add = (p: Item) => { setSeq((s) => [...s, { id: `${p.id}-c${n}`, text: p.text }]); setN((x) => x + 1); setRes(null); };
  const dragStart = (e: DragStartEvent) => setActive(String(e.active.id));
  const dragEnd = (e: DragEndEvent) => {
    setActive(null);
    const { active: a, over } = e;
    if (!over) return;
    const aid = String(a.id);
    if (aid.startsWith('p:')) {
      const p = palette.find((x) => `p:${x.id}` === aid);
      if (!p) return;
      const at = seq.findIndex((s) => s.id === over.id);
      setSeq((s) => { const item = { id: `${p.id}-c${n}`, text: p.text }; if (at < 0) return [...s, item]; const c = [...s]; c.splice(at, 0, item); return c; });
      setN((x) => x + 1); setRes(null);
    } else if (a.id !== over.id) {
      const from = seq.findIndex((s) => s.id === a.id), to = seq.findIndex((s) => s.id === over.id);
      if (from >= 0 && to >= 0) { setSeq((s) => arrayMove(s, from, to)); setRes(null); }
    }
  };
  async function check() {
    const r = await submit(seq.map((s) => s.text));
    setRes(r); onResult(r);
  }
  const activeItem = active?.startsWith('p:') ? palette.find((p) => `p:${p.id}` === active) : seq.find((s) => s.id === active);

  return (
    <div className="grid gap-4">
      <p className="text-lg leading-8"><Inline text={step.question} /></p>
      <DndContext id={uid} sensors={sensors} collisionDetection={closestCenter} onDragStart={dragStart} onDragEnd={dragEnd} onDragCancel={() => setActive(null)}>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="grid content-start gap-2" aria-label="บล็อกคำสั่ง">
            <p className="text-sm font-bold text-muted-foreground">บล็อกคำสั่ง ({free.length})</p>
            {free.map((p) => <PaletteBlock key={p.id} item={p} onAdd={() => add(p)} />)}
            {free.length === 0 && <p className="text-sm text-muted-foreground">ใช้บล็อกครบแล้ว (เอาออกได้ด้วยปุ่ม ✕)</p>}
          </div>
          <div className="grid content-start gap-2">
            <p className="text-sm font-bold text-muted-foreground">โปรแกรมของฉัน <span className="font-mono">void setup() {'{ }'}</span> ({seq.length} บรรทัด)</p>
            <Tray empty={seq.length === 0}>
              <SortableContext items={seq.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <ol className="grid gap-2">{seq.map((s) => <Slot key={s.id} item={s} onRemove={() => { setSeq((q) => q.filter((x) => x.id !== s.id)); setRes(null); }} />)}</ol>
              </SortableContext>
            </Tray>
          </div>
        </div>
        <DragOverlay>{activeItem ? <div className={`${blockCls} border-brand-blue bg-surface shadow-xl`}>{activeItem.text}</div> : null}</DragOverlay>
      </DndContext>

      <Feedback result={res} passed={passed} />
      <div className="flex flex-wrap gap-2">
        {!locked && <Button className="h-12 px-6 text-base" disabled={busy || seq.length === 0} onClick={check}>ตรวจคำตอบ</Button>}
        <Button variant="outline" className="h-12 px-5 text-base" disabled={seq.length === 0} onClick={() => setShowSim(true)}>ดูโดรนบิน</Button>
        {seq.length > 0 && !locked && <Button variant="ghost" className="h-12 px-4 text-base" onClick={() => { setSeq([]); setRes(null); }}>ล้างทั้งหมด</Button>}
      </div>
      {showSim && seq.length > 0 && <LearnSim key={code} code={code} scenario={step.scenario} />}
    </div>
  );
}
