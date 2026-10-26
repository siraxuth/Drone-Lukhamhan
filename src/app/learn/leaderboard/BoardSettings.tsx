'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveBoardSettings } from '../board-actions';

/** ตั้งชื่อที่แสดงในอันดับ และเลือกว่าจะแสดงชื่อในตารางหรือไม่ */
export function BoardSettings({ displayName, showOnBoard }: { displayName: string; showOnBoard: boolean }) {
  const [name, setName] = useState(displayName);
  const [show, setShow] = useState(showOnBoard);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const r = await saveBoardSettings(name, show);
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setName(r.displayName);
    setMsg({ ok: true, text: r.showOnBoard ? 'บันทึกแล้ว ชื่อนี้จะแสดงในตารางอันดับ' : 'บันทึกแล้ว ชื่อคุณถูกซ่อนจากตาราง (ยังเก็บ XP และเห็นอันดับของตัวเองได้)' });
  }

  return (
    <form onSubmit={save} className="grid gap-3 squircle-2xl border border-line bg-surface p-4 sm:p-5" aria-labelledby="bs">
      <h2 id="bs" className="font-display text-xl font-extrabold">การแสดงชื่อของฉัน</h2>
      <div className="grid gap-2">
        <Label htmlFor="dn">ชื่อที่แสดงในอันดับ</Label>
        <Input id="dn" value={name} onChange={(e) => { setName(e.target.value); setMsg(null); }} maxLength={30} autoComplete="nickname" className="h-11 text-base" />
        <p className="text-sm text-muted-foreground">2–30 ตัวอักษร ภาษาไทย อังกฤษ ตัวเลข ช่องว่าง . _ - ใช้ชื่อเล่นได้ ไม่ต้องใช้ชื่อจริง</p>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
        <input type="checkbox" checked={show} onChange={(e) => { setShow(e.target.checked); setMsg(null); }} className="size-5 accent-[var(--brand-blue)]" />
        แสดงชื่อฉันในตารางอันดับ
      </label>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`flex items-start gap-2 squircle-xl px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border border-brand-red/40 bg-brand-red/10 text-brand-red'}`}>{msg.ok && <Check className="mt-0.5 size-4 shrink-0" aria-hidden />}{msg.text}</p>}
      <Button type="submit" className="h-11 w-fit px-5 text-base" disabled={busy}>{busy ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
    </form>
  );
}
