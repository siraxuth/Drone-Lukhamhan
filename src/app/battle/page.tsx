import { BattleLobby } from '@/battle/BattleLobby';
import { listBattleRooms, rankedEnabled } from '@/battle/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getScenarios } from '@/lib/scenario-data';
import { Header } from '@/sections/Header';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Battle ห้องแข่งโดรน' };

export default async function BattlePage() {
  const [scenarios, session, scores, rooms] = await Promise.all([
    getScenarios(), getSession(),
    db.battleRating.findMany({ take: 20, orderBy: [{ rating: 'desc' }, { games: 'desc' }, { name: 'asc' }], select: { name: true, rating: true, games: true } }).catch(() => []),
    listBattleRooms().catch(() => null),
  ]);
  return <>
    <Header />
    <main className="mx-auto grid max-w-7xl gap-7 px-4 pb-16 pt-24 sm:px-6">
      <BattleLobby scenarios={scenarios} signedIn={!!session} ranked={rankedEnabled()} scores={scores} initialRooms={rooms} />
    </main>
  </>;
}
