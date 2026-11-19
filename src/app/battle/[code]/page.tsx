import { notFound } from 'next/navigation';
import { BattleRoom } from '@/battle/BattleRoom';
import { Header } from '@/sections/Header';

export const metadata = { title: 'ห้องแข่งโดรน', robots: { index: false, follow: false } };

export default async function BattleRoomPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ role?: string }> }) {
  const [{ code }, { role }] = await Promise.all([params, searchParams]);
  if (!/^[0-9A-F]{8}$/.test(code)) notFound();
  const memberEntry = role === 'join' || role === 'pilot';
  return <>
    <Header />
    <div className="mx-auto max-w-[100rem] px-3 pb-16 pt-24 sm:px-5"><BattleRoom key={`${code}:${memberEntry ? 'join' : 'watch'}`} code={code} initialRole={memberEntry ? 'pilot' : 'watch'} /></div>
  </>;
}
