import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { findUnit, trackById } from '@/learn/content';
import { canStart, nextUnit } from '@/learn/path';
import { loadLearner } from '@/learn/server';
import { toPublic } from '@/learn/types';
import { passedSteps } from '../../actions';
import { UnitPlayer } from './UnitPlayer';
import { shareMetadata } from '@/lib/og';

export async function generateMetadata({ params }: { params: Promise<{ track: string; unit: string }> }): Promise<Metadata> {
  const { track, unit } = await params;
  const f = findUnit(unit);
  if (!f) return { title: 'บทเรียนโดรน' };
  const title = f.unit.title;
  const description = f.unit.summary;
  return { title, description, ...shareMetadata({ title, description, path: `/learn/${track}/${unit}`, type: 'article' }) };
}

export default async function UnitPage({ params }: { params: Promise<{ track: string; unit: string }> }) {
  const { track: trackId, unit: unitId } = await params;
  const track = trackById(trackId);
  const found = findUnit(unitId);
  if (!track || !found || found.track.id !== track.id) notFound();
  const session = await requireUser();
  if (!session) redirect(`/login?next=/learn/${trackId}/${unitId}`);
  const { done } = await loadLearner(session.user);
  if (!canStart(unitId, done)) redirect('/learn');
  const after = new Set(done); after.add(unitId);
  const nx = nextUnit(after);
  const { steps, ...unit } = found.unit;
  return (
    <UnitPlayer
      track={{ id: track.id, title: track.title, accent: track.accent }}
      unit={{ ...unit, steps: steps.map(toPublic) }}
      index={found.index}
      total={track.units.length}
      alreadyDone={done.has(unitId)}
      initialPassed={await passedSteps(session.user.id, unitId)}
      next={nx ? { href: `/learn/${nx.track.id}/${nx.unit.id}`, title: nx.unit.title } : null}
    />
  );
}
