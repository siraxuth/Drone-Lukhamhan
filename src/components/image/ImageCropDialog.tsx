'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { FlipHorizontal2, FlipVertical2, Grid3x3, Loader2, Maximize, RotateCcw, RotateCw, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { kb } from '@/lib/upload';
import { cropToBlob, flipImage, loadImage, type Area, type Mime } from './crop';
import { MAX_UPLOAD } from './limits';

const aspects = [
  { k: 'orig', label: 'ต้นฉบับ' },
  { k: '16:9', label: '16:9', v: 16 / 9 },
  { k: '4:3', label: '4:3', v: 4 / 3 },
  { k: '3:2', label: '3:2', v: 3 / 2 },
  { k: '1:1', label: '1:1', v: 1 },
  { k: '4:5', label: '4:5', v: 4 / 5 },
  { k: '9:16', label: '9:16', v: 9 / 16 },
] as const;
const widths = [{ v: 0, label: 'ไม่ย่อ' }, { v: 2560, label: '2560' }, { v: 1920, label: '1920' }, { v: 1280, label: '1280' }, { v: 800, label: '800' }];
const formats: Array<{ v: Mime; label: string }> = [{ v: 'image/webp', label: 'WebP' }, { v: 'image/jpeg', label: 'JPEG' }, { v: 'image/png', label: 'PNG' }];

const num = (v: number | readonly number[]) => (Array.isArray(v) ? (v as number[])[0] : (v as number));

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  src: string | null;
  title?: string;
  /** อัตราส่วนเริ่มต้น: 'orig' หรือเช่น '16:9' */
  defaultAspect?: (typeof aspects)[number]['k'];
  /** ได้ไฟล์ที่ครอบแล้ว (ผู้เรียกเป็นคนอัปโหลดต่อ) */
  onConfirm: (blob: Blob) => Promise<void> | void;
};

/** ครอบตัดรูป: ลาก/ซูม/หมุนอิสระ/พลิก/อัตราส่วนสำเร็จรูป/ย่อขนาด/ฟอร์แมต/คุณภาพ พร้อมแสดงขนาดไฟล์จริงก่อนใช้ */
export function ImageCropDialog({ open, onOpenChange, src, title = 'ครอบตัดและปรับรูป', defaultAspect = '16:9', onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState({ h: false, v: false });
  const [aspectKey, setAspectKey] = useState<string>(defaultAspect);
  const [natural, setNatural] = useState({ w: 1600, h: 900 });
  const [grid, setGrid] = useState(true);
  const [maxW, setMaxW] = useState(1920);
  const [type, setType] = useState<Mime>('image/webp');
  const [quality, setQuality] = useState(0.88);
  const [area, setArea] = useState<Area | null>(null);
  const [view, setView] = useState<string | null>(null);
  const [out, setOut] = useState<{ w: number; h: number; bytes: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const baked = useRef<string | null>(null);

  // เปิดใหม่ = รีเซ็ตทุกอย่าง
  useEffect(() => {
    if (!open || !src) return;
    setCrop({ x: 0, y: 0 }); setZoom(1); setRotation(0); setFlip({ h: false, v: false }); setAspectKey(defaultAspect); setArea(null); setOut(null); setErr('');
    loadImage(src).then((i) => setNatural({ w: i.naturalWidth, h: i.naturalHeight })).catch(() => setErr('เปิดรูปไม่ได้'));
  }, [open, src, defaultAspect]);

  // พลิกรูป = อบรูปใหม่ แล้วให้ตัวครอบตัดใช้รูปที่พลิกแล้ว
  useEffect(() => {
    if (!open || !src) return;
    let dead = false;
    if (!flip.h && !flip.v) { setView(src); return; }
    flipImage(src, flip.h, flip.v).then((u) => {
      if (dead) { URL.revokeObjectURL(u); return; }
      if (baked.current) URL.revokeObjectURL(baked.current);
      baked.current = u;
      setView(u);
    });
    return () => { dead = true; };
  }, [open, src, flip]);
  useEffect(() => () => { if (baked.current) URL.revokeObjectURL(baked.current); }, []);

  const aspect = useMemo(() => {
    const a = aspects.find((x) => x.k === aspectKey);
    if (!a || a.k === 'orig') {
      const r = Math.abs(rotation % 180) === 90 ? natural.h / natural.w : natural.w / natural.h;
      return r;
    }
    return a.v;
  }, [aspectKey, natural, rotation]);

  const make = useCallback(async () => {
    if (!view || !area) return null;
    return cropToBlob(view, area, rotation, { maxWidth: maxW, type, quality });
  }, [view, area, rotation, maxW, type, quality]);

  // คำนวณขนาดไฟล์จริงแบบหน่วงเวลา
  useEffect(() => {
    if (!open || !area) return;
    const t = setTimeout(async () => {
      try { const r = await make(); if (r) setOut({ w: r.width, h: r.height, bytes: r.blob.size }); } catch { setErr('ประมวลผลรูปไม่ได้'); }
    }, 250);
    return () => clearTimeout(t);
  }, [open, area, make]);

  async function confirm() {
    setBusy(true);
    setErr('');
    try {
      const r = await make();
      if (!r) throw new Error('ยังไม่ได้เลือกพื้นที่');
      if (r.blob.size > MAX_UPLOAD) throw new Error(`ไฟล์ใหญ่เกิน ${kb(MAX_UPLOAD)} ลองลดคุณภาพหรือย่อความกว้าง`);
      await onConfirm(r.blob);
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  const chip = (on: boolean) => `min-h-10 squircle-xl border px-3 text-base transition-colors ${on ? 'border-brand-blue bg-brand-blue/10 text-brand-blue' : 'border-line hover:bg-surface-2'}`;
  const tooBig = !!out && out.bytes > MAX_UPLOAD;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] w-[96vw] gap-4 overflow-y-auto p-4 sm:max-w-6xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-extrabold">{title}</DialogTitle>
          <DialogDescription>ลากรูปเพื่อเลื่อน · เลื่อนล้อเมาส์หรือใช้แถบเพื่อซูม · พื้นที่ในกรอบคือรูปที่จะได้</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <div className="relative h-[46dvh] min-h-72 overflow-hidden squircle-2xl bg-black lg:h-[60dvh]">
            {view && (
              <Cropper
                image={view} crop={crop} zoom={zoom} rotation={rotation} aspect={aspect} minZoom={1} maxZoom={6} showGrid={grid} zoomSpeed={0.5}
                onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation}
                onCropComplete={(_, px) => setArea(px)}
                style={{ cropAreaStyle: { border: '2px solid var(--brand-blue)', color: 'rgba(0,0,0,.55)' } }}
              />
            )}
          </div>

          <div className="grid content-start gap-5">
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-base font-semibold">อัตราส่วน</legend>
              <div className="flex flex-wrap gap-2">
                {aspects.map((a) => <button key={a.k} type="button" aria-pressed={aspectKey === a.k} onClick={() => { setAspectKey(a.k); setCrop({ x: 0, y: 0 }); }} className={chip(aspectKey === a.k)}>{a.label}</button>)}
              </div>
            </fieldset>

            <div className="grid gap-4">
              <label className="grid gap-2 text-base">
                <span className="flex items-center justify-between"><span className="inline-flex items-center gap-2 font-semibold"><ZoomIn className="size-4" aria-hidden /> ซูม</span><span className="text-muted-foreground">{zoom.toFixed(2)}×</span></span>
                <Slider min={1} max={6} step={0.01} value={[zoom]} onValueChange={(v) => setZoom(num(v))} aria-label="ซูม" />
              </label>
              <label className="grid gap-2 text-base">
                <span className="flex items-center justify-between"><span className="inline-flex items-center gap-2 font-semibold"><RotateCw className="size-4" aria-hidden /> หมุน</span><span className="text-muted-foreground">{Math.round(rotation)}°</span></span>
                <Slider min={-180} max={180} step={0.5} value={[rotation]} onValueChange={(v) => setRotation(num(v))} aria-label="หมุนรูป" />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="h-10 text-base" onClick={() => setRotation((r) => ((r - 90 + 540) % 360) - 180)}><RotateCcw className="size-4" aria-hidden /> 90°</Button>
                <Button type="button" variant="outline" className="h-10 text-base" onClick={() => setRotation((r) => ((r + 90 + 540) % 360) - 180)}><RotateCw className="size-4" aria-hidden /> 90°</Button>
                <Button type="button" variant="outline" className="h-10 text-base" aria-pressed={flip.h} onClick={() => setFlip((f) => ({ ...f, h: !f.h }))} aria-label="พลิกซ้าย-ขวา"><FlipHorizontal2 className="size-4" aria-hidden /></Button>
                <Button type="button" variant="outline" className="h-10 text-base" aria-pressed={flip.v} onClick={() => setFlip((f) => ({ ...f, v: !f.v }))} aria-label="พลิกบน-ล่าง"><FlipVertical2 className="size-4" aria-hidden /></Button>
                <Button type="button" variant="outline" className="h-10 text-base" aria-pressed={grid} onClick={() => setGrid((g) => !g)} aria-label="เส้นตาราง"><Grid3x3 className="size-4" aria-hidden /></Button>
                <Button type="button" variant="ghost" className="h-10 text-base" onClick={() => { setZoom(1); setRotation(0); setFlip({ h: false, v: false }); setCrop({ x: 0, y: 0 }); setAspectKey('orig'); }}><Maximize className="size-4" aria-hidden /> ทั้งภาพ</Button>
              </div>
            </div>

            <fieldset className="grid gap-2">
              <legend className="mb-1 text-base font-semibold">ย่อความกว้าง (px)</legend>
              <div className="flex flex-wrap gap-2">{widths.map((w) => <button key={w.v} type="button" aria-pressed={maxW === w.v} onClick={() => setMaxW(w.v)} className={chip(maxW === w.v)}>{w.label}</button>)}</div>
            </fieldset>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-base font-semibold">ไฟล์ที่ได้</legend>
              <div className="flex flex-wrap gap-2">{formats.map((f) => <button key={f.v} type="button" aria-pressed={type === f.v} onClick={() => setType(f.v)} className={chip(type === f.v)}>{f.label}</button>)}</div>
              {type !== 'image/png' && (
                <label className="mt-1 grid gap-2 text-base">
                  <span className="flex justify-between"><span>คุณภาพ</span><span className="text-muted-foreground">{Math.round(quality * 100)}%</span></span>
                  <Slider min={0.5} max={1} step={0.01} value={[quality]} onValueChange={(v) => setQuality(num(v))} aria-label="คุณภาพ" />
                </label>
              )}
            </fieldset>
          </div>
        </div>

        <DialogFooter className="items-center gap-3 sm:justify-between">
          <p role="status" className={`text-base ${tooBig || err ? 'text-brand-red' : 'text-muted-foreground'}`}>
            {err || (out ? `${out.w} × ${out.h} px · ${kb(out.bytes)}${tooBig ? ` (เกิน ${kb(MAX_UPLOAD)})` : ''}` : 'กำลังคำนวณ…')}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11 text-base" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="button" className="h-11 min-w-32 text-base" disabled={busy || !area || tooBig} onClick={confirm}>{busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} ใช้รูปนี้</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
