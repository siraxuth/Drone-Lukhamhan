import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { loadLearner } from '@/learn/server';
import { PlacementPlayer } from './PlacementPlayer';

export const metadata: Metadata = { title: 'แบบทดสอบก่อนเรียน' };

export default async function PlacementPage() {
  const session = await requireUser();
  if (!session) redirect('/login?next=/learn/placement');
  const { profile } = await loadLearner(session.user);
  return <PlacementPlayer already={profile.placement === 'done'} />;
}
