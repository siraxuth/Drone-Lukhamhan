import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { loadLearner } from '@/learn/server';
import { PathView } from './PathView';

export default async function LearnHome() {
  const session = await requireUser();
  if (!session) redirect('/login?next=/learn');
  const { profile, done } = await loadLearner(session.user);
  return <PathView profile={profile} done={done} />;
}
