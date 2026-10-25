'use client';

import { useCallback, useState } from 'react';
import { sameOrigin, uploadBlob, type UploadFolder } from '@/lib/upload';
import { ImageCropDialog } from './ImageCropDialog';

type Opts = { folder: UploadFolder; defaultAspect?: '16:9' | 'orig' | '4:3' | '1:1'; title?: string; onUploaded: (url: string) => void; onError?: (m: string) => void; onStatus?: (m: string) => void };

/**
 * ครอบตัด + อัปโหลดรูป: เรียก start(file) หรือ start(url) แล้วเรนเดอร์ `dialog`
 * (url ของรูปเดิมใน R2 ใช้ครอบใหม่ได้ ผ่าน /api/img)
 */
export function useCropFlow({ folder, defaultAspect = '16:9', title, onUploaded, onError, onStatus }: Opts) {
  const [src, setSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const start = useCallback((input: File | string) => {
    setSrc(typeof input === 'string' ? sameOrigin(input) : URL.createObjectURL(input));
    setOpen(true);
  }, []);

  const dialog = (
    <ImageCropDialog
      open={open}
      onOpenChange={(o) => { setOpen(o); if (!o && src?.startsWith('blob:')) { const s = src; setTimeout(() => URL.revokeObjectURL(s), 500); } }}
      src={src}
      title={title}
      defaultAspect={defaultAspect}
      onConfirm={async (blob) => {
        onStatus?.('กำลังอัปโหลด…');
        try { onUploaded(await uploadBlob(blob, folder)); onStatus?.('อัปโหลดแล้ว'); } catch (e) { const m = e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ'; onStatus?.(m); onError?.(m); throw e; }
      }}
    />
  );
  return { start, dialog };
}
