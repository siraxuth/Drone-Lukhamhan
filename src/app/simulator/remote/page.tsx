import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/sections/Header';
import { SimulatorApp } from '@/flight/SimulatorApp';
import { hybridStarter } from '@/flight/hybrid-program';
import { getScenarios } from '@/lib/scenario-data';
import { shareMetadata } from '@/lib/og';

const title = 'สนามจำลองบินด้วยรีโมท';
const description = 'ฝึกบินในสนาม 3 มิติด้วยรีโมทมือถือหรือ LiteBee Ghost C05 กด K2 ตั้งศูนย์และ K8 ขึ้นบิน';
const path = '/simulator/remote';

export const metadata: Metadata = { title, description, alternates: { canonical: path }, ...shareMetadata({ title, description, path }) };

export default async function Page() {
  const scenarios = (await getScenarios()).map(scenario => ({ ...scenario, starter: hybridStarter(scenario) }));
  return (
    <>
      <Header />
      <Suspense fallback={<div className="p-24 text-center text-muted-foreground">กำลังโหลดสนาม…</div>}>
        <SimulatorApp scenarios={scenarios} initialWorkspace={null} signedIn={false} remoteOnly />
      </Suspense>
    </>
  );
}
