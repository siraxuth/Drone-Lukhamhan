'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';

/** อัปโหลดตรงไป R2 แล้วใส่ URL ลงใน input hidden ชื่อ `name` */
export function ImageUploader({ name, folder }: { name: string; folder: 'projects' | 'seasons' | 'sections' }) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('กำลังอัปโหลด…');
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ folder, contentType: file.type, size: file.size }),
    });
    const data = await res.json();
    if (!res.ok) return setStatus(data.error ?? 'อัปโหลดไม่สำเร็จ');
    const put = await fetch(data.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
    if (!put.ok) return setStatus('อัปโหลดไม่สำเร็จ');
    setUrl(data.publicUrl);
    setStatus('อัปโหลดแล้ว');
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name={name} value={url} />
      <Input type="file" accept="image/webp,image/jpeg,image/png,image/avif" onChange={onFile} aria-label="อัปโหลดรูป" />
      {status && <p className="text-sm text-muted-foreground" role="status">{status}</p>}
    </div>
  );
}
