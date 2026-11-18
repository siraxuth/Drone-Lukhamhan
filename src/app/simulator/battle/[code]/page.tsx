import { notFound } from 'next/navigation';
import { BattleRoom } from '@/battle/BattleRoom';
import { Header } from '@/sections/Header';

export const metadata = { title: 'ห้องแข่งโดรน', robots: { index: false, follow: false } };

export default async function BattleRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[0-9A-F]{8}$/.test(code)) notFound();
  return <>
    <Header />
    <div className="mx-auto max-w-[100rem] px-3 pb-16 pt-24 sm:px-5"><BattleRoom code={code} /></div>
  </>;
}
