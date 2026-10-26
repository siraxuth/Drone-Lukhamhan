'use client';

import { useMemo } from 'react';
import { buildScenarioConfig } from '@/flight/config';
import { FlightRunner } from '@/flight/FlightRunner';
import { maxScore, type ScenarioConfig } from '@/lib/scenarios';
import { eventOf } from '../season';

/** สนามจำลองย่อยในแบบฝึก: เล่นโค้ดของผู้เรียนบนด่านที่แบบฝึกกำหนด (เล่นอย่างเดียว ตัดสินที่เซิร์ฟเวอร์) */
export default function LearnSim({ code, scenario }: { code: string; scenario: ScenarioConfig }) {
  const config = useMemo(() => ({ ...buildScenarioConfig(scenario), style: 'full' as const }), [scenario]);
  const scene = useMemo(() => ({ pattern: scenario.pattern, objects: scenario.objects, start: scenario.start, base: scenario.base }), [scenario]);
  return <FlightRunner event={eventOf(scenario.event)} code={code} config={config} scene={scene} maxPoints={maxScore(scenario)} playLabel="ดูโดรนบิน" />;
}
