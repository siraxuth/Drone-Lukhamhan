import Link from 'next/link';
import { BattleLobby } from '@/battle/BattleLobby';
import { rankedEnabled } from '@/battle/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getScenarios } from '@/lib/scenario-data';
import { Header } from '@/sections/Header';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Battle ห้องแข่งโดรน' };

export default async function BattlePage() {
  const [scenarios, session, scores] = await Promise.all([
    getScenarios(), getSession(),
    db.battleRating.findMany({ take: 20, orderBy: [{ rating: 'desc' }, { games: 'desc' }, { name: 'asc' }], select: { name: true, rating: true, games: true } }).catch(() => []),
  ]);
  return <>
    <Header />
    <main className="mx-auto grid max-w-6xl gap-5 px-4 pb-16 pt-24">
      <div><Link href="/simulator" className="text-sm underline">กลับ Simulator</Link><h1 className="mt-2 text-3xl font-extrabold">Battle ห้องแข่งโดรน</h1></div>
      <BattleLobby scenarios={scenarios} signedIn={!!session} ranked={rankedEnabled()} scores={scores} />
    </main>
  </>;
}
