'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Crop, ExternalLink, Eye, EyeOff, ImagePlus, Images, MoreHorizontal, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { MediaPickerDialog } from '@/components/image/MediaPickerDialog';
import { useCropFlow } from '@/components/image/useCropFlow';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { removeItem, setPublished, type ModelName } from './actions';

/**
 * เมนูสามจุดของแต่ละแถว: แก้ไข · เปิดดูบนเว็บ · เผยแพร่/ซ่อน · ลบ (ถามยืนยันก่อน)
 * ใช้ทั้งในตาราง (จอใหญ่) และการ์ด (มือถือ)
 */
export function RowMenu({ model, id, label, editHref, viewHref, published }: { model: ModelName; id: string; label: string; editHref: string; viewHref?: string; published: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={`เมนูของ ${label}`} className="grid size-11 place-items-center squircle-xl text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue data-popup-open:bg-surface-2">
          <MoreHorizontal className="size-5" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="min-w-52 squircle-2xl p-1.5">
          <DropdownMenuItem render={<Link href={editHref} />} className="min-h-11 squircle-xl px-3 text-base"><Pencil className="size-5" aria-hidden /> แก้ไข</DropdownMenuItem>
          {viewHref && <DropdownMenuItem render={<Link href={viewHref} target="_blank" />} className="min-h-11 squircle-xl px-3 text-base"><ExternalLink className="size-5" aria-hidden /> เปิดดูบนเว็บ</DropdownMenuItem>}
          <DropdownMenuItem disabled={pending} onClick={() => start(() => setPublished(model, id, !published))} className="min-h-11 squircle-xl px-3 text-base">
            {published ? <><EyeOff className="size-5" aria-hidden /> เปลี่ยนเป็นฉบับร่าง</> : <><Eye className="size-5" aria-hidden /> เผยแพร่</>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirm(true)} className="min-h-11 squircle-xl px-3 text-base"><Trash2 className="size-5" aria-hidden /> ลบ</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบ “{label}” ?</AlertDialogTitle>
            <AlertDialogDescription>ลบแล้วกู้คืนไม่ได้</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={() => start(() => removeItem(model, id))}>ลบเลย</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** ปุ่มลบพร้อมถามยืนยันก่อน */
export function DeleteButton({ model, id, label }: { model: ModelName; id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button type="button" variant="ghost" size="icon" aria-label={`ลบ ${label}`} className="size-10 text-brand-red" />}>
        <Trash2 className="size-5" aria-hidden />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบ “{label}” ?</AlertDialogTitle>
          <AlertDialogDescription>ลบแล้วกู้คืนไม่ได้</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={() => start(() => removeItem(model, id))}>ลบเลย</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** สวิตช์เผยแพร่ในตาราง: กดแล้วบันทึกทันที */
export function PublishToggle({ model, id, value, label }: { model: ModelName; id: string; value: boolean; label: string }) {
  const [on, setOn] = useState(value);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <Switch checked={on} disabled={pending} aria-label={`เผยแพร่ ${label}`} onCheckedChange={(v) => { setOn(v); start(() => setPublished(model, id, v)); }} />
      <span className="text-sm text-muted-foreground">{on ? 'เผยแพร่' : 'ฉบับร่าง'}</span>
    </span>
  );
}

/** รูปปก: เลือกไฟล์ → ครอบตัด → อัปโหลดไป R2 · หรือเลือกจากคลัง · ครอบตัดรูปเดิมใหม่ได้ · ส่งค่าเป็น input ชื่อ `name` */
export function ImagePicker({ name, folder, initial }: { name: string; folder: 'projects' | 'seasons' | 'sections'; initial?: string | null }) {
  const [url, setUrl] = useState(initial ?? '');
  const [status, setStatus] = useState('');
  const [lib, setLib] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const { start, dialog } = useCropFlow({ folder, defaultAspect: '16:9', title: 'ครอบรูปปก', onUploaded: setUrl, onStatus: setStatus });

  return (
    <div className="grid gap-3">
      <input type="hidden" name={name} value={url} />
      <div className="relative aspect-video overflow-hidden squircle-2xl border border-dashed border-line bg-surface-2">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="ตัวอย่างรูป" className="size-full object-cover" />
        ) : (
          <button type="button" onClick={() => file.current?.click()} className="grid size-full place-items-center text-muted-foreground hover:bg-surface"><span className="grid justify-items-center gap-1"><ImagePlus className="size-8" aria-hidden />กดเพื่อเลือกรูป (แนะนำ 1920×1080)</span></button>
        )}
        {url && <Button type="button" size="icon" variant="secondary" aria-label="เอารูปออก" className="absolute right-2 top-2" onClick={() => setUrl('')}><X className="size-4" /></Button>}
      </div>
      <input ref={file} type="file" accept="image/webp,image/jpeg,image/png,image/avif,image/gif" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) start(f); e.target.value = ''; }} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-10 text-base" onClick={() => file.current?.click()}><Upload className="size-4" aria-hidden /> อัปโหลด</Button>
        <Button type="button" variant="outline" className="h-10 text-base" onClick={() => setLib(true)}><Images className="size-4" aria-hidden /> คลังรูป</Button>
        {url && <Button type="button" variant="outline" className="h-10 text-base" onClick={() => start(url)}><Crop className="size-4" aria-hidden /> ครอบตัดใหม่</Button>}
      </div>
      {status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}
      {dialog}
      <MediaPickerDialog open={lib} onOpenChange={setLib} onPick={setUrl} uploadFolder={folder} />
    </div>
  );
}

/** แกลเลอรีหลายรูป: เพิ่มได้ทีละหลายรูป (อัปโหลดทีละไฟล์ผ่านครอปตัด หรือเลือกจากคลัง) เรียงลำดับและลบได้ · ส่งเป็น JSON ใน input ชื่อ `name` */
export function GalleryPicker({ name, folder, initial }: { name: string; folder: 'projects' | 'seasons' | 'sections'; initial?: string[] }) {
  const [urls, setUrls] = useState<string[]>(initial ?? []);
  const [status, setStatus] = useState('');
  const [lib, setLib] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const queue = useRef<File[]>([]);
  const add = (u: string) => setUrls((x) => (x.includes(u) ? x : [...x, u]));
  const { start, dialog } = useCropFlow({
    folder, defaultAspect: '16:9', title: 'ครอบรูปแกลเลอรี',
    onUploaded: (u) => { add(u); const next = queue.current.shift(); if (next) start(next); },
    onStatus: setStatus,
  });
  const move = (i: number, d: -1 | 1) => setUrls((x) => { const j = i + d; if (j < 0 || j >= x.length) return x; const c = [...x]; [c[i], c[j]] = [c[j], c[i]]; return c; });

  return (
    <div className="grid gap-3">
      <input type="hidden" name={name} value={JSON.stringify(urls)} />
      {urls.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {urls.map((u, i) => (
            <li key={u} className="group relative aspect-[4/3] overflow-hidden squircle-2xl border border-line bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`รูปที่ ${i + 1}`} className="size-full object-cover" />
              <span className="absolute left-1.5 top-1.5 squircle-xl bg-black/65 px-2 py-0.5 text-sm font-semibold text-white">{i + 1}</span>
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1">
                <span className="flex gap-1">
                  <Button type="button" size="icon" variant="secondary" aria-label="เลื่อนไปก่อนหน้า" disabled={i === 0} onClick={() => move(i, -1)} className="size-8"><ChevronLeft className="size-4" /></Button>
                  <Button type="button" size="icon" variant="secondary" aria-label="เลื่อนไปถัดไป" disabled={i === urls.length - 1} onClick={() => move(i, 1)} className="size-8"><ChevronRight className="size-4" /></Button>
                </span>
                <Button type="button" size="icon" variant="secondary" aria-label="เอารูปออก" onClick={() => setUrls((x) => x.filter((v) => v !== u))} className="size-8"><X className="size-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="squircle-2xl border border-dashed border-line bg-surface-2 p-6 text-center text-base text-muted-foreground">ยังไม่มีรูปแกลเลอรี เพิ่มได้หลายรูป ทุกรูปจะแสดงในหน้าผลงาน</p>
      )}
      <input ref={file} type="file" multiple accept="image/webp,image/jpeg,image/png,image/avif,image/gif" hidden
        onChange={(e) => { const fs = [...(e.target.files ?? [])]; e.target.value = ''; if (!fs.length) return; queue.current = fs.slice(1); start(fs[0]); }} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-10 text-base" onClick={() => file.current?.click()}><Upload className="size-4" aria-hidden /> อัปโหลดหลายรูป</Button>
        <Button type="button" variant="outline" className="h-10 text-base" onClick={() => setLib(true)}><Images className="size-4" aria-hidden /> เลือกจากคลัง</Button>
      </div>
      <p className="text-sm text-muted-foreground">{urls.length} รูป · อัปโหลดหลายไฟล์พร้อมกันจะให้ครอบทีละรูป · ลำดับตามที่เห็น (รูปแรกขึ้นก่อน)</p>
      {status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}
      {dialog}
      <MediaPickerDialog open={lib} onOpenChange={setLib} onPick={add} uploadFolder={folder} />
    </div>
  );
}

type Rule = { heading: string; body: string };

/** แก้กติกาเป็นหัวข้อ + เนื้อหา เพิ่ม/ลบได้ · ส่งเป็น JSON ใน input ชื่อ `name` */
export function RulesEditor({ name, initial }: { name: string; initial: Rule[] }) {
  const [rules, setRules] = useState<Rule[]>(initial);
  const set = (i: number, patch: Partial<Rule>) => setRules((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="grid gap-3">
      <input type="hidden" name={name} value={JSON.stringify(rules.filter((r) => r.heading || r.body))} />
      {rules.map((r, i) => (
        <div key={i} className="grid gap-2 squircle-2xl border border-line bg-surface-2 p-3">
          <div className="flex gap-2">
            <Input value={r.heading} onChange={(e) => set(i, { heading: e.target.value })} placeholder={`หัวข้อข้อที่ ${i + 1}`} aria-label={`หัวข้อกติกา ${i + 1}`} />
            <Button type="button" variant="ghost" size="icon" aria-label="ลบข้อนี้" onClick={() => setRules((x) => x.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
          </div>
          <Textarea value={r.body} onChange={(e) => set(i, { body: e.target.value })} placeholder="รายละเอียด" aria-label={`รายละเอียดกติกา ${i + 1}`} rows={3} />
        </div>
      ))}
      <Button type="button" variant="outline" className="w-fit" onClick={() => setRules((r) => [...r, { heading: '', body: '' }])}><Plus className="size-4" /> เพิ่มข้อกติกา</Button>
    </div>
  );
}
