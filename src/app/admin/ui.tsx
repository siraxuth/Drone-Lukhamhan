import Link from 'next/link';
import { CheckCircle2, CircleAlert, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

/** ข้อความผลลัพธ์จาก ?ok= / ?error= */
export function Notice({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  const bad = !!error;
  const Icon = bad ? CircleAlert : CheckCircle2;
  return (
    <p role={bad ? 'alert' : 'status'} className={`flex items-center gap-2 squircle-xl border px-4 py-3 text-base ${bad ? 'border-brand-red text-brand-red' : 'border-brand-blue text-brand-blue'}`}>
      <Icon className="size-5 shrink-0" aria-hidden /> {error ?? ok}
    </p>
  );
}

export function PageHead({ title, desc, newHref, newLabel }: { title: string; desc?: string; newHref?: string; newLabel?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
        {desc && <p className="mt-1 text-base text-muted-foreground">{desc}</p>}
      </div>
      {newHref && <Button size="lg" className="h-11 text-base" render={<Link href={newHref} />} nativeButton={false}><Plus className="size-5" aria-hidden /> {newLabel ?? 'เพิ่ม'}</Button>}
    </div>
  );
}

export function Field({ id, label, hint, children }: { id?: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-base">{label}</Label>
      {children}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** กรอบของฟอร์ม */
export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid gap-5 squircle-3xl border border-line bg-surface p-5 sm:p-6 ${className}`}>{children}</div>;
}

export const dateTh = (d: Date) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });

/** ป้ายสถานะเผยแพร่ (อ่านอย่างเดียว เปลี่ยนสถานะที่เมนูสามจุด) */
export function StatusBadge({ published }: { published: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 squircle-xl px-2.5 py-0.5 text-sm font-medium ${published ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}><span aria-hidden className={`size-1.5 rounded-full ${published ? 'bg-emerald-500' : 'bg-muted-foreground/60'}`} />{published ? 'เผยแพร่' : 'ฉบับร่าง'}</span>;
}
