'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Layers, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldPlan2D } from '@/field/FieldPlan2D';
import type { LivePose, Marks, ViewPreset } from '@/field/Field3D';
import { toField } from '@/flight/config';
import { flightMotion } from '@/flight/visual-pose';
import { detectQuality } from '@/scene/quality';
import { currentSeason } from '@/rules';
import type { ScenarioView } from '@/lib/scenarios';
import { flightWindow, restingFrame } from './flight';
import type { FlightView, Settings, Tape } from './types';

const Field3D = dynamic(() => import('@/field/Field3D'), { ssr: false, loading: () => <div className="grid h-full place-items-center">กำลังโหลดสนาม</div> });

export function BattleField({ scenario, settings, flight, title, tall = false, playing = false }: {
  scenario: ScenarioView; settings: Settings; flight?: FlightView; title: string; tall?: boolean; playing?: boolean;
}) {
  const rest = useMemo(() => restingFrame({ scenario }), [scenario]);
  const data = flight ?? rest;
  const [quality, setQuality] = useState<'off' | 'low' | 'high'>('off');
  const [use3D, setUse3D] = useState(true);
  const [view, setView] = useState<ViewPreset>('chase');
  const animated = data.live || playing;
  const first = data.frames[0] ?? rest.frames[0];
  const pose = useRef<LivePose>({ ...toField(first.x, first.y), alt: first.z / 100, yaw: first.yaw, pitch: 0, roll: 0, spin: 0 });
  const time = useRef(0);
  const [flatPose, setFlatPose] = useState(pose.current);

  useEffect(() => setQuality(detectQuality()), []);
  useEffect(() => {
    const { frames, offset, live } = data;
    if (!frames.length) return;
    const start = performance.now();
    let raf = 0;
    function tick(now: number) {
      // A small buffer interpolates only positions already released by the room.
      time.current = live ? Math.min(offset, Math.max(time.current, frames[0].t, offset - 850 + now - start)) : offset;
      const last = frames.at(-1)!;
      const motion = flightMotion(frames, Math.min(time.current, last.t), settings.difficulty === 'hard', last.rpm ? 0 : null);
      pose.current = { x: motion.x, y: motion.y, alt: motion.alt, yaw: motion.yaw, pitch: motion.pitch, roll: motion.roll, spin: motion.frame.rpm ?? 0 };
      if (quality === 'off' || !use3D) setFlatPose(pose.current);
      if (live && time.current < offset) raf = requestAnimationFrame(tick);
    }
    tick(start);
    return () => cancelAnimationFrame(raf);
  }, [data, quality, settings.difficulty, use3D]);

  const marks = useMemo(() => {
    const marks: Marks = { balls: [], darts: [], popped: [] };
    for (const event of data.events) {
      if (!event.at) continue;
      if (event.kind === 'pop' && event.ok && event.id) marks.popped.push(event.id);
      if (event.kind === 'drop' && event.ok) {
        const at = toField(event.at.x, event.at.y);
        for (let i = 0; i < (event.n ?? 1); i++) {
          const angle = (i + marks.balls.length) * 2.4;
          marks.balls.push({ x: at.x + 0.1 * Math.cos(angle), y: at.y + 0.1 * Math.sin(angle) });
        }
      }
      if ((event.kind === 'shot' || event.kind === 'shot_b') && event.to) {
        const from = toField(event.at.x, event.at.y), to = toField(event.to.x, event.to.y);
        marks.darts.push({
          from: [from.x, from.y, event.at.z / 100 + 0.065], to: [to.x, to.y, event.to.z / 100],
          ok: !!event.ok, mount: event.kind === 'shot_b' ? 'back' : 'front', t: event.t,
        });
      }
    }
    return marks;
  }, [data.events]);
  const last = data.frames.at(-1) ?? first;
  const drone = { ...toField(last.x, last.y), alt: last.z / 100, yaw: last.yaw };
  const event = currentSeason.events.find(event => event.id === scenario.config.event)!;
  const scene = useMemo(() => ({
    pattern: scenario.config.pattern, objects: scenario.config.objects, start: scenario.config.start, base: scenario.config.base,
    visits: Object.fromEntries(data.visits.map(visit => [visit.id, visit.t])),
  }), [scenario, data.visits]);

  return <Card role="region" aria-label={title} className="min-w-0 gap-0 overflow-hidden squircle-2xl p-0">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-2">
      <div><h3 className="text-sm font-bold">{title}</h3><p className="tabular-nums text-sm">{data.score} คะแนน{data.live ? ' · กำลังบิน' : ''}</p></div>
      {quality !== 'off' && <div className="flex flex-wrap gap-1">
        {use3D && <>
          <Button size="sm" variant={view === 'chase' ? 'default' : 'outline'} aria-pressed={view === 'chase'} onClick={() => setView('chase')}><Video data-icon="inline-start" /> ตามโดรน</Button>
          <Button size="sm" variant={view === 'top' ? 'default' : 'outline'} aria-pressed={view === 'top'} onClick={() => setView('top')}><Layers data-icon="inline-start" /> มองจากบน</Button>
        </>}
        <Button size="sm" variant="outline" onClick={() => setUse3D(!use3D)}>{use3D ? 'แผนที่' : 'เปิด 3D'}</Button>
      </div>}
    </header>
    <div className={cn("min-h-48 bg-surface-2", tall ? "h-[min(56svh,38rem)] xl:h-[min(64svh,42rem)]" : "h-[min(48svh,27rem)]")}>
      {quality !== 'off' && use3D
        ? <Field3D event={event} drone={drone} onDrone={() => {}} view={view} shot={null} low={quality === 'low'} readOnly live={animated} poseRef={pose}
            playheadRef={time} marks={marks} scene={scene} lights={settings.lights} ceilingLights={settings.ceilingLights}
            holdKey={data.events.filter(event => event.kind === 'hold').length}
            dartInventory={{ front: Math.max(0, 2 - marks.darts.filter(dart => dart.mount === 'front').length), back: Math.max(0, 2 - marks.darts.filter(dart => dart.mount === 'back').length) }}
            loaded={data.events.findLast(event => event.payload)?.payload ?? (scenario.config.requiresPayload ? { L: 20, R: 20 } : undefined)}
            gatePositions={data.events.findLast(event => event.gatePositions)?.gatePositions} />
        : <FieldPlan2D event={event} drone={data.live ? flatPose : drone} interactive={false} className="size-full p-2" scene={scene} />}
    </div>
  </Card>;
}

export function useTapeTime(duration: number, replay = 0) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const start = performance.now();
    setOffset(0);
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - start;
      setOffset(Math.min(elapsed, duration));
      if (elapsed >= duration) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, [duration, replay]);
  return offset;
}

export function TapePlayer({ tape, scenario, settings, title, tall }: { tape: Tape; scenario: ScenarioView; settings: Settings; title: string; tall?: boolean }) {
  const offset = useTapeTime(tape.duration);
  // A short local window keeps the same renderer as the live room.
  const flight = flightWindow(tape, offset, false);
  return <BattleField scenario={scenario} settings={settings} flight={flight} title={title} tall={tall} playing={offset < tape.duration} />;
}
