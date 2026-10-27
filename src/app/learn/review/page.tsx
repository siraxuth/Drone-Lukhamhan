import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { startReview } from '../skill-actions';
import { ReviewPlayer } from './ReviewPlayer';
import { shareMetadata } from '@/lib/og';

const title = 'ทบทวนบทเรียนโดรน 5 ข้อ';
const description = 'ฝึกซ้ำจากหัวข้อที่เคยเรียน เพื่อทบทวนความเข้าใจและจุดที่ยังสับสน';
export const metadata: Metadata = { title, description, ...shareMetadata({ title, description, path: '/learn/review' }) };
export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const session = await requireUser();
  if (!session) redirect('/login?next=/learn/review');
  const r = await startReview();
  return <ReviewPlayer start={r} />;
}
