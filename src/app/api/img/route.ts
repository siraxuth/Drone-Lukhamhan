import { requireRole } from '@/lib/auth';
import { readImage } from '@/lib/r2';

/** ส่งรูปที่อยู่ใน bucket ของชมรมกลับมาจากโดเมนเดียวกัน เพื่อให้ canvas ครอบตัดได้ (ไม่ติด CORS) */
export async function GET(req: Request) {
  if (!(await requireRole('ADMIN', 'TEACHER'))) return new Response('unauthorized', { status: 401 });
  const u = new URL(req.url).searchParams.get('u') ?? '';
  try {
    const { body, type } = await readImage(u);
    return new Response(Buffer.from(body), { headers: { 'content-type': type, 'cache-control': 'private, max-age=300' } });
  } catch {
    return new Response('not found', { status: 404 });
  }
}
