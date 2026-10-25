import { requireRole } from '@/lib/auth';
import { deleteImage, listImages } from '@/lib/r2';

const deny = () => Response.json({ error: 'ไม่มีสิทธิ์' }, { status: 401 });

export async function GET() {
  if (!(await requireRole('ADMIN', 'TEACHER'))) return deny();
  try {
    return Response.json({ items: await listImages() });
  } catch {
    return Response.json({ error: 'อ่านคลังรูปไม่ได้ (ตรวจค่า R2 ใน .env.local)' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await requireRole('ADMIN', 'TEACHER'))) return deny();
  const { key } = (await req.json().catch(() => ({}))) as { key?: string };
  if (!key) return Response.json({ error: 'ไม่พบไฟล์' }, { status: 400 });
  try {
    await deleteImage(key);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'ลบไม่สำเร็จ' }, { status: 400 });
  }
}
