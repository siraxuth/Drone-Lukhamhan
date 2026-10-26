import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { findUnit, trackById } from '@/learn/content';
import { canStart, nextUnit } from '@/learn/path';
import { loadLearner } from '@/learn/server';
import { UnitPlayer } from './UnitPlayer';

export async function generateMetadata({ params }: { params: Promise<{ track: string; unit: string }> }): Promise<Metadata> {
  const f = findUnit((await params).unit);
  return { title: f ? `${f.unit.title} · เรียนแบบทีละขั้น` : 'เรียนแบบทีละขั้น' };
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
  return (
    <UnitPlayer
      track={{ id: track.id, title: track.title, accent: track.accent }}
      unit={found.unit}
      index={found.index}
      total={track.units.length}
      alreadyDone={done.has(unitId)}
      next={nx ? { href: `/learn/${nx.track.id}/${nx.unit.id}`, title: nx.unit.title } : null}
    />
  );
}
