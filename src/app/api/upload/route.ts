import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { ALLOWED_TYPES, MAX_BYTES, putImage } from '@/lib/r2';

const folders = z.enum(['projects', 'seasons', 'sections', 'content']);

/** รับไฟล์รูป (multipart) แล้วอัปโหลดขึ้น R2 จากเซิร์ฟเวอร์ — ไม่มีคำขอข้ามโดเมนจากเบราว์เซอร์ จึงไม่ต้องตั้ง CORS */
export async function POST(req: Request) {
  if (!(await requireRole('ADMIN', 'TEACHER'))) return Response.json({ error: 'ไม่มีสิทธิ์' }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const folder = folders.safeParse(form?.get('folder'));
  if (!(file instanceof File) || !folder.success) return Response.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) return Response.json({ error: 'รองรับเฉพาะ webp/jpeg/png/avif' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: `ไฟล์ใหญ่เกิน ${MAX_BYTES / 1024 / 1024} MB` }, { status: 413 });
  try {
    const { publicUrl } = await putImage(folder.data, file.type, new Uint8Array(await file.arrayBuffer()));
    return Response.json({ publicUrl });
  } catch {
    return Response.json({ error: 'อัปโหลดขึ้น R2 ไม่สำเร็จ ตรวจค่า R2 ใน .env.local' }, { status: 502 });
  }
}
