'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Crop, ImagePlus, Loader2, Search, Trash2 } from 'lucide-react';
import type { MediaItem } from '@/lib/r2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deleteMedia, fetchMedia, kb, type UploadFolder } from '@/lib/upload';
import { useCropFlow } from './useCropFlow';

const folderTh: Record<string, string> = { projects: 'ผลงาน', seasons: 'ฤดูกาล', sections: 'หมวด', content: 'ในเนื้อหา' };

type Props = { mode: 'page' | 'picker'; onPick?: (url: string) => void; uploadFolder?: UploadFolder };

/** คลังรูป: ดู ค้นหา กรองตามที่มา อัปโหลด (ครอบตัดก่อน) คัดลอกลิงก์ ลบ — ใช้ทั้งหน้า /admin/media และตอนเลือกรูปใส่ฟอร์ม */
export function MediaManager({ mode, onPick, uploadFolder = 'content' }: Props) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [folder, setFolder] = useState('all');
  const [copied, setCopied] = useState('');
  const [gone, setGone] = useState<string[]>([]);
  const file = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setError('');
    fetchMedia().then(setItems).catch((e: Error) => { setError(e.message); setItems([]); });
  }, []);
  useEffect(load, [load]);

  const { start, dialog } = useCropFlow({ folder: uploadFolder, defaultAspect: 'orig', title: 'อัปโหลดรูปใหม่', onUploaded: (url) => { load(); if (mode === 'picker') onPick?.(url); } });

  const shown = useMemo(() => (items ?? []).filter((i) => !gone.includes(i.key) && (folder === 'all' || i.folder === folder) && i.key.toLowerCase().includes(q.toLowerCase())), [items, folder, q, gone]);
  const folders = useMemo(() => ['all', ...Array.from(new Set((items ?? []).map((i) => i.folder)))], [items]);

  async function remove(i: MediaItem) {
    if (!confirm('ลบรูปนี้ถาวร? ถ้ามีผลงานใช้รูปนี้อยู่ รูปจะหาย')) return;
    try { await deleteMedia(i.key); setGone((g) => [...g, i.key]); } catch (e) { setError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ'); }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อไฟล์" aria-label="ค้นหารูป" className="h-11 w-56 pl-9 text-base" />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="กรองตามที่มา">
          {folders.map((f) => (
            <button key={f} type="button" aria-pressed={folder === f} onClick={() => setFolder(f)} className={`min-h-10 squircle-xl border px-3 text-base ${folder === f ? 'border-brand-blue bg-brand-blue/10 text-brand-blue' : 'border-line hover:bg-surface-2'}`}>{f === 'all' ? 'ทั้งหมด' : folderTh[f] ?? f}</button>
          ))}
        </div>
        <input ref={file} type="file" accept="image/webp,image/jpeg,image/png,image/avif,image/gif" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) start(f); e.target.value = ''; }} />
        <Button type="button" className="ml-auto h-11 text-base" onClick={() => file.current?.click()}><ImagePlus className="size-5" aria-hidden /> อัปโหลดรูป</Button>
      </div>

      {error && <p role="alert" className="text-base text-brand-red">{error}</p>}
      {items === null ? (
        <p className="flex items-center gap-2 py-10 text-lg text-muted-foreground"><Loader2 className="size-5 animate-spin" aria-hidden /> กำลังโหลดคลังรูป…</p>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-lg text-muted-foreground">{items.length ? 'ไม่พบรูปที่ค้นหา' : 'ยังไม่มีรูปในคลัง กด “อัปโหลดรูป” เพื่อเริ่ม'}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((i) => (
            <li key={i.key} className="group relative overflow-hidden squircle-2xl border border-line bg-surface">
              <button type="button" disabled={mode !== 'picker'} onClick={() => onPick?.(i.url)} className="block w-full text-left disabled:cursor-default" aria-label={mode === 'picker' ? `เลือกรูป ${i.key.split('/').pop()}` : undefined}>
                <span className="relative block aspect-video bg-[#0b0d12]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.url} alt="" loading="lazy" className="size-full object-cover" />
                </span>
                <span className="block px-3 py-2">
                  <span className="block truncate text-sm text-muted-foreground">{folderTh[i.folder] ?? i.folder} · {kb(i.size)}</span>
                </span>
              </button>
              <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <Button type="button" size="icon" variant="secondary" className="size-9" aria-label="ครอบตัดใหม่" onClick={() => start(i.url)}><Crop className="size-4" /></Button>
                {mode === 'page' && (
                  <>
                    <Button type="button" size="icon" variant="secondary" className="size-9" aria-label="คัดลอกลิงก์" onClick={async () => { await navigator.clipboard.writeText(i.url); setCopied(i.key); setTimeout(() => setCopied(''), 1500); }}>{copied === i.key ? <Check className="size-4" /> : <Copy className="size-4" />}</Button>
                    <Button type="button" size="icon" variant="secondary" className="size-9 text-brand-red" aria-label="ลบรูป" onClick={() => remove(i)}><Trash2 className="size-4" /></Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </div>
  );
}
