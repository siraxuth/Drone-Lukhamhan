export type Area = { x: number; y: number; width: number; height: number };
export type Mime = 'image/webp' | 'image/jpeg' | 'image/png';

export const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('เปิดรูปไม่ได้'));
    img.src = src;
  });

const toBlob = (c: HTMLCanvasElement, type: Mime, quality: number) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('แปลงรูปไม่ได้'))), type, quality));

/** พลิกรูปแนวนอน/แนวตั้ง แล้วคืนเป็น blob URL ใหม่ (ใช้ก่อนส่งให้ตัวครอบตัด) */
export async function flipImage(src: string, h: boolean, v: boolean): Promise<string> {
  const img = await loadImage(src);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d')!;
  ctx.translate(h ? c.width : 0, v ? c.height : 0);
  ctx.scale(h ? -1 : 1, v ? -1 : 1);
  ctx.drawImage(img, 0, 0);
  return URL.createObjectURL(await toBlob(c, 'image/png', 1));
}

/** ครอบตามพิกเซลที่ react-easy-crop ให้มา (มีหมุนได้ทุกองศา) แล้วย่อให้กว้างไม่เกิน maxWidth (0 = ไม่ย่อ) */
export async function cropToBlob(src: string, area: Area, rotation: number, opts: { maxWidth: number; type: Mime; quality: number }): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImage(src);
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad)), cos = Math.abs(Math.cos(rad));
  const bw = img.naturalWidth * cos + img.naturalHeight * sin;
  const bh = img.naturalWidth * sin + img.naturalHeight * cos;

  const stage = document.createElement('canvas');
  stage.width = bw;
  stage.height = bh;
  const sctx = stage.getContext('2d')!;
  sctx.translate(bw / 2, bh / 2);
  sctx.rotate(rad);
  sctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  const scale = opts.maxWidth > 0 ? Math.min(1, opts.maxWidth / area.width) : 1;
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(area.width * scale));
  out.height = Math.max(1, Math.round(area.height * scale));
  const octx = out.getContext('2d')!;
  if (opts.type === 'image/jpeg') { octx.fillStyle = '#fff'; octx.fillRect(0, 0, out.width, out.height); }
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(stage, area.x, area.y, area.width, area.height, 0, 0, out.width, out.height);
  return { blob: await toBlob(out, opts.type, opts.quality), width: out.width, height: out.height };
}
