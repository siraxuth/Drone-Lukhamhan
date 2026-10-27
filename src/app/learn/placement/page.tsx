import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { loadLearner } from '@/learn/server';
import { PlacementPlayer } from './PlacementPlayer';
import { shareMetadata } from '@/lib/og';

const title = 'แบบทดสอบพื้นฐานก่อนเรียนโดรน';
const description = 'ลองวัดความรู้เดิมเรื่องโดรนและการเขียนโค้ด เพื่อดูว่าควรเริ่มเรียนจากหัวข้อไหน';
export const metadata: Metadata = { title, description, ...shareMetadata({ title, description, path: '/learn/placement' }) };

export default async function PlacementPage() {
  const session = await requireUser();
  if (!session) redirect('/login?next=/learn/placement');
  const { profile } = await loadLearner(session.user);
  return <PlacementPlayer already={profile.placement === 'done'} />;
}
