'use client';

import { useRef, useState } from 'react';
import type { WalkInput } from '@/field/Field3D';

export function TouchStick({ label, onMove, className = '', floating = false }: { label: string; onMove: (x: number, y: number) => void; className?: string; floating?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const active = useRef<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const move = (clientX: number, clientY: number) => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return;
    const dx = clientX - box.left - box.width / 2;
    const dy = clientY - box.top - box.height / 2;
    const scale = Math.max(1, Math.hypot(dx, dy) / 42);
    const x = dx / scale, y = dy / scale;
    setOffset({ x, y }); onMove(x / 42, -y / 42);
  };
  return <div ref={root} role="group" aria-label={label} className={`${floating ? '' : 'relative'} size-28 touch-none squircle-3xl border border-line bg-surface/85 shadow-lg ${className}`}
    onPointerDown={event => { active.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); move(event.clientX, event.clientY); }}
    onPointerMove={event => { if (active.current === event.pointerId) move(event.clientX, event.clientY); }}
    onPointerUp={event => { if (active.current !== event.pointerId) return; active.current = null; setOffset({ x: 0, y: 0 }); onMove(0, 0); }}
    onPointerCancel={() => { active.current = null; setOffset({ x: 0, y: 0 }); onMove(0, 0); }}>
    <span className="absolute left-1/2 top-1/2 size-11 squircle-2xl border border-brand-blue bg-brand-blue shadow-sm" style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }} />
    <span className="sr-only">{label}</span>
  </div>;
}

export function TouchWalkControls({ inputRef }: { inputRef: React.RefObject<WalkInput> }) {
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  return <div className="pointer-events-none absolute inset-0 z-10 lg:hidden">
    <div aria-label="ปัดเพื่อหันมอง" className="pointer-events-auto absolute inset-y-0 right-0 w-1/2 touch-none"
      onPointerDown={event => { pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => { const p = pointer.current; if (!p || p.id !== event.pointerId) return; inputRef.current.lookX += (event.clientX - p.x) * 0.12; inputRef.current.lookY -= (event.clientY - p.y) * 0.12; p.x = event.clientX; p.y = event.clientY; }}
      onPointerUp={() => { pointer.current = null; }} onPointerCancel={() => { pointer.current = null; }} />
    <TouchStick label="จอยเดิน" floating className="pointer-events-auto absolute bottom-4 left-4" onMove={(x, y) => { inputRef.current.right = x; inputRef.current.forward = y; }} />
    <p className="pointer-events-none absolute bottom-36 left-4 max-w-28 squircle-xl bg-surface/85 px-2 py-1 text-[11px] leading-4 text-foreground">จอยเดิน<br />ปัดจอขวาเพื่อหัน</p>
  </div>;
}
