import type { MediaItem } from '@/lib/r2';

export type UploadFolder = 'projects' | 'seasons' | 'sections' | 'content';

/** ส่งรูปให้เซิร์ฟเวอร์อัปโหลดขึ้น R2 (เหมือน dekgp) แล้วคืน URL สาธารณะ */
export async function uploadBlob(blob: Blob, folder: UploadFolder): Promise<string> {
  const body = new FormData();
  body.set('folder', folder);
  body.set('file', new File([blob], `upload.${blob.type.split('/')[1]}`, { type: blob.type }));
  const res = await fetch('/api/upload', { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'อัปโหลดไม่สำเร็จ');
  return data.publicUrl as string;
}

export async function fetchMedia(): Promise<MediaItem[]> {
  const res = await fetch('/api/media');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'อ่านคลังรูปไม่ได้');
  return data.items as MediaItem[];
}

export async function deleteMedia(key: string) {
  const res = await fetch('/api/media', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key }) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'ลบไม่สำเร็จ');
}

/** รูปที่อยู่ใน bucket ของชมรมให้โหลดผ่าน /api/img (โดเมนเดียวกัน ครอบตัดได้) */
export const sameOrigin = (u: string) => (/^https?:\/\//.test(u) && !u.startsWith(location.origin) ? `/api/img?u=${encodeURIComponent(u)}` : u);

export const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
