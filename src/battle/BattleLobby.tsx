'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { ScenarioView } from '@/lib/scenarios';
import { LIGHTS_OFF, CEILING_LIGHTS_ON } from '@/flight/environment';
import { TapePlayer } from './BattleField';
import { battleApi, battleRequest, inputClass, panelClass } from './client';
import { makeTape } from './flight';
import { CLOCKS, FORMATS, type Settings } from './types';

const defaults: Settings = {
  format: 'duel', flight: 'parallel', clock: 'fixed', minutes: 10, practices: 10,
  difficulty: 'medium', lights: LIGHTS_OFF, ceilingLights: CEILING_LIGHTS_ON, ranked: false,
};
const levels = { easy: 'ง่าย · บินตามระยะที่สั่ง', medium: 'ปานกลาง · ต้องเผื่อระยะเบรก', hard: 'ยาก · แสงและความสูงมีผล' };
const corners = ['หน้าซ้าย', 'หน้าขวา', 'หลังซ้าย', 'หลังขวา'];
const colors = { cyan: 'ฟ้า', blue: 'น้ำเงิน', ice: 'ขาวอมฟ้า' };

export function BattleLobby({ scenarios, signedIn, ranked, scores }: {
  scenarios: ScenarioView[]; signedIn: boolean; ranked: boolean; scores: { name: string; rating: number; games: number }[];
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(defaults);
  const [slug, setSlug] = useState(scenarios[0]?.slug ?? '');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'pilot' | 'watch'>('watch');
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const scenario = scenarios.find(item => item.slug === slug);
  const example = useMemo(() => scenario && ({
    ...scenario, config: { ...scenario.config, pattern: 'blank', objects: [], start: { x: 0, y: 0, yaw: 0 }, base: { mode: 'start' }, requiresPayload: false },
  } satisfies ScenarioView), [scenario]);
  const tape = useMemo(() => example && preview > 0 ? makeTape({ scenario: example, settings }, 'calibration(); delay(3000); takeOff(); delay(3000); sh(90); fw(180); bw(180); autoLand();', undefined, 148) : null, [example, preview, settings]);

  function change<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(current => ({ ...current, [key]: value }));
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const roomSettings = settings.clock === 'open' ? { ...settings, minutes: defaults.minutes } : settings;
      const result = await battleRequest<{ code: string }>(battleApi, { name, role, scenario: slug, settings: roomSettings });
      router.push(`/simulator/battle/${result.code}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'สร้างห้องไม่สำเร็จ');
    } finally {
      setPending(false);
    }
  }

  return <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <form onSubmit={create} className={panelClass + ' grid content-start gap-4'}>
      <h2 className="text-xl font-bold">สร้างห้องแข่ง</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>ชื่อในห้อง<input className={inputClass} required maxLength={36} value={name} onChange={event => setName(event.target.value)} /></label>
        <label>บทบาทของคุณ<select className={inputClass} value={role} onChange={event => setRole(event.target.value === 'pilot' ? 'pilot' : 'watch')}><option value="watch">เจ้าของห้อง นั่งดู</option><option value="pilot">เจ้าของห้อง ลงแข่งด้วย</option></select></label>
        <label className="sm:col-span-2">โจทย์ที่ใช้ร่วมกัน<select required className={inputClass} value={slug} onChange={event => setSlug(event.target.value)}>{scenarios.map(item => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select></label>
        <label>จัดการแข่งขันแบบไหน<select className={inputClass} value={settings.format} onChange={event => change('format', event.target.value as Settings['format'])}>{Object.entries(FORMATS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>บินแบบไหน<select className={inputClass} value={settings.flight} onChange={event => change('flight', event.target.value as Settings['flight'])}><option value="parallel">บินพร้อมกัน</option><option value="turns">บินทีละคน</option></select></label>
        <label>เวลาเขียนโค้ด<select className={inputClass} value={settings.clock} onChange={event => {
          const clock = event.target.value as Settings['clock'];
          setSettings(previous => ({ ...previous, clock, minutes: clock === 'stopwatch' ? Math.min(previous.minutes, 30) : previous.minutes }));
        }}>{Object.entries(CLOCKS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        {settings.clock !== 'open' && <label>เวลาเขียนสูงสุด (นาที)<input type="number" required min={1} max={settings.clock === 'stopwatch' ? 30 : 60} className={inputClass} value={settings.minutes || ''} onChange={event => change('minutes', event.target.valueAsNumber || 0)} /></label>}
        <label>จำนวนรอบทดลองบินต่อคน<input type="number" required min={0} max={10} className={inputClass} value={settings.practices} onChange={event => change('practices', event.target.valueAsNumber || 0)} /></label>
        <label>ระดับการบิน<select className={inputClass} value={settings.difficulty} onChange={event => change('difficulty', event.target.value as Settings['difficulty'])}>{Object.entries(levels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      </div>
      <fieldset className="grid gap-3 border-t border-line pt-3">
        <legend className="font-semibold">ไฟในสนาม</legend>
        <label><input type="checkbox" checked={settings.ceilingLights.some(Boolean)} onChange={event => {
          const enabled = event.target.checked;
          change('ceilingLights', [enabled, enabled, enabled, enabled]);
        }} /> เปิดไฟเพดาน</label>
        <div className="grid grid-cols-2 gap-2">
          {settings.lights.map((light, index) => <div key={index} className="grid gap-1">
            <label><input type="checkbox" checked={light.enabled} onChange={event => {
              const lights = [...settings.lights] as Settings['lights'];
              lights[index] = { ...light, enabled: event.target.checked };
              change('lights', lights);
            }} /> ไฟ{corners[index]}</label>
            <select aria-label={`สีไฟ${corners[index]}`} className={inputClass} value={light.color} disabled={!light.enabled} onChange={event => {
              const lights = [...settings.lights] as Settings['lights'];
              lights[index] = { ...light, color: event.target.value as typeof light.color };
              change('lights', lights);
            }}>{Object.entries(colors).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
          </div>)}
        </div>
      </fieldset>
      {settings.format === 'duel' && ranked && <label><input type="checkbox" checked={settings.ranked} onChange={event => change('ranked', event.target.checked)} /> เก็บแต้ม Battle เมื่อผู้แข่งทั้งคู่ล็อกอิน</label>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || !scenario}>{pending ? 'กำลังสร้าง…' : 'สร้างห้อง'}</Button>
        <Button type="button" variant="outline" onClick={() => setPreview(value => value + 1)}>ดูตัวอย่างบิน 3D</Button>
      </div>
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </form>
    <aside className="grid content-start gap-4">
      <form className={panelClass + ' grid gap-3'} onSubmit={event => { event.preventDefault(); router.push(`/simulator/battle/${code.trim().toUpperCase()}`); }}>
        <h2 className="text-xl font-bold">เข้าห้องด้วยรหัส</h2>
        <label>รหัสห้อง<input autoComplete="off" className={inputClass + ' font-mono uppercase'} required pattern="[0-9a-fA-F]{8}" maxLength={8} value={code} onChange={event => setCode(event.target.value)} /></label>
        <Button type="submit">เปิดห้อง</Button>
        <p className="text-sm text-muted-foreground">{signedIn ? 'เข้าห้องในฐานะผู้ใช้ที่ล็อกอินแล้ว' : <Link href="/login?next=/simulator/battle" className="underline">ล็อกอินเพื่อเก็บแต้มอันดับ Battle</Link>}</p>
      </form>
      {tape && example && <TapePlayer key={preview} tape={tape} scenario={example} settings={settings} title="ตัวอย่างเที่ยวบิน" />}
      <section className={panelClass} aria-label="อันดับ Battle">
        <h2 className="font-bold">อันดับ Battle</h2>
        {scores.length ? <ol className="divide-y divide-line">{scores.map((score, index) => <li key={index} className="flex justify-between gap-2 py-2 text-sm"><span>{index + 1}. {score.name}</span><b className="tabular-nums">{score.rating} แต้ม</b></li>)}</ol>
          : <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีผลแข่งเก็บแต้ม</p>}
      </section>
    </aside>
  </div>;
}
