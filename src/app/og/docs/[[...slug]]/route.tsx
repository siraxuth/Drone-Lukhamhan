import { source } from '@/lib/source';
import { ogImage } from '@/lib/og';

export const runtime = 'nodejs';

export function generateStaticParams() {
  return source.generateParams();
}

/** ภาพแชร์ของบทเรียนแต่ละหน้า: /og/docs/<พาธบทเรียน> (รับเฉพาะหน้าที่มีอยู่จริง กันคนยิงข้อความเอง) */
export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const page = source.getPage((await params).slug);
  if (!page) return new Response('not found', { status: 404 });
  return ogImage({ title: page.data.title, kicker: 'บทเรียน · ชมรมโดรน ลือคำหาญฯ', sub: page.data.description });
}
