import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { startReview } from '../skill-actions';
import { ReviewPlayer } from './ReviewPlayer';

export const metadata: Metadata = { title: 'ทบทวน 5 ข้อ' };
export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const session = await requireUser();
  if (!session) redirect('/login?next=/learn/review');
  const r = await startReview();
  return <ReviewPlayer start={r} />;
}
