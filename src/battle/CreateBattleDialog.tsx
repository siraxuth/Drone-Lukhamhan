'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Plus, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ScenarioView } from '@/lib/scenarios';
import { LIGHTS_OFF, CEILING_LIGHTS_ON } from '@/flight/environment';
import { BattleField, useTapeTime } from './BattleField';
import { battleApi, battleRequest, flightLabel } from './client';
import { flightWindow, makeTape } from './flight';
import { ScenarioImage, ScenarioPicker } from './ScenarioPicker';
import { CLOCKS, FORMATS, type Settings, type Tape } from './types';

const defaults: Settings = {
  format: 'duel', flight: 'parallel', clock: 'fixed', minutes: 10, practices: 10,
  difficulty: 'medium', lights: LIGHTS_OFF, ceilingLights: CEILING_LIGHTS_ON, ranked: false,
};
export const battleLevels = { easy: 'ง่าย', medium: 'ปานกลาง', hard: 'ยาก' };
const descriptions = { easy: 'บินตามระยะที่สั่ง', medium: 'มีระยะไหลตอนเบรก', hard: 'แสงและความสูงมีผลกับการบิน' };
const corners = ['หน้าซ้าย', 'หน้าขวา', 'หลังซ้าย', 'หลังขวา'];
const colors = { cyan: 'ฟ้า', blue: 'น้ำเงิน', ice: 'ขาวอมฟ้า' };
const demoCode = 'calibration(); delay(3000); takeOff(); delay(3000); sh(85); fw(150); poshold(); bw(150); autoLand();';
export type SetupTab = 'scenario' | 'rules' | 'preview';

function SettingSelect<V extends string>({ id, label, value, values, onChange }: {
  id: string; label: string; value: V; values: Record<V, string>; onChange: (value: V) => void;
}) {
  return <Field>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <NativeSelect id={id} className="w-full" value={value} onChange={event => onChange(event.target.value as V)}>
      {Object.entries<string>(values).map(([key, label]) => <NativeSelectOption key={key} value={key}>{label}</NativeSelectOption>)}
    </NativeSelect>
  </Field>;
}

function FlightMetrics({ tape }: { tape: Tape }) {
  const top = Math.max(0, ...tape.frames.map(frame => frame.z));
  const origin = tape.frames[0];
  const far = Math.max(0, ...tape.frames.map(frame => Math.hypot(frame.x - origin.x, frame.y - origin.y)));
  return <div className="flex flex-wrap gap-2 text-sm" aria-label="ผลตัวอย่างการบิน">
    <Badge variant="outline">สูงสุด {top.toFixed(0)} ซม.</Badge>
    <Badge variant="outline">ไกลจากจุดเริ่ม {far.toFixed(0)} ซม.</Badge>
  </div>;
}

function FlightComparison({ scenario, settings }: { scenario: ScenarioView; settings: Settings }) {
  const [otherLevel, setOtherLevel] = useState<Settings['difficulty']>(settings.difficulty === 'easy' ? 'hard' : 'easy');
  const [baseLights, setBaseLights] = useState(false);
  const [replay, setReplay] = useState(0);
  const other = useMemo(() => ({
    ...settings, difficulty: otherLevel,
    ...(baseLights && { lights: LIGHTS_OFF, ceilingLights: CEILING_LIGHTS_ON }),
  }), [settings, otherLevel, baseLights]);
  const tapes = useMemo(() => [
    makeTape({ scenario, settings }, demoCode, undefined, 148),
    makeTape({ scenario, settings: other }, demoCode, undefined, 148),
  ], [scenario, settings, other]);
  const offset = useTapeTime(Math.max(tapes[0].duration, tapes[1].duration), replay);

  return <div className="grid gap-4">
    <p className="text-sm text-muted-foreground">ทั้งสองฝั่งใช้โจทย์ โค้ดตัวอย่าง และสภาพเริ่มต้นเดียวกัน ลองเปลี่ยนระดับหรือไฟเพื่อดูว่าระยะบินต่างกันแค่ไหน</p>
    <FieldGroup className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
      <SettingSelect id="battle-preview-level" label="ระดับที่ใช้เปรียบเทียบ" value={otherLevel} values={battleLevels} onChange={level => { setOtherLevel(level); setReplay(value => value + 1); }} />
      <Field orientation="horizontal" className="min-h-8 items-center">
        <Switch id="battle-preview-light" checked={baseLights} onCheckedChange={enabled => { setBaseLights(enabled); setReplay(value => value + 1); }} />
        <FieldLabel htmlFor="battle-preview-light">ใช้ไฟพื้นฐานฝั่งเปรียบเทียบ</FieldLabel>
      </Field>
      <Button type="button" variant="outline" onClick={() => setReplay(value => value + 1)}><RotateCcw data-icon="inline-start" /> เล่นพร้อมกันอีกครั้ง</Button>
    </FieldGroup>
    <div className="grid min-w-0 gap-3 md:grid-cols-2">
      {[settings, other].map((option, index) => <div key={index} className="grid min-w-0 gap-2">
        <BattleField flight={flightWindow(tapes[index], Math.min(offset, tapes[index].duration), false)} scenario={scenario} settings={option}
          title={`${index ? 'ตัวเลือกเปรียบเทียบ' : 'ค่าที่จะใช้แข่ง'} · ${battleLevels[option.difficulty]}`} />
        <FlightMetrics tape={tapes[index]} />
      </div>)}
    </div>
  </div>;
}

export function CreateBattleDialog({ open, onOpenChange, tab, onTabChange, scenarios, ranked }: {
  open: boolean; onOpenChange: (value: boolean) => void; tab: SetupTab; onTabChange: (value: SetupTab) => void;
  scenarios: ScenarioView[]; ranked: boolean;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(defaults);
  const [slug, setSlug] = useState(scenarios.find(scenario => scenario.slug === 'grid-line')?.slug ?? scenarios[0]?.slug ?? '');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'pilot' | 'watch'>('watch');
  const [listed, setListed] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const scenario = scenarios.find(item => item.slug === slug);
  const maximum = settings.clock === 'stopwatch' ? 30 : 60;

  function change<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(current => ({ ...current, [key]: value }));
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!scenario || pending) return;
    if (!name.trim() || (settings.clock !== 'open' && (settings.minutes < 1 || settings.minutes > maximum))) {
      setError('ใส่ชื่อและตรวจเวลาเขียนโค้ดอีกครั้ง');
      onTabChange('rules');
      return;
    }
    setPending(true);
    setError('');
    try {
      const roomSettings = settings.clock === 'open' ? { ...settings, minutes: defaults.minutes } : settings;
      const result = await battleRequest<{ code: string }>(battleApi, { name, role, scenario: slug, listed, settings: roomSettings });
      onOpenChange(false);
      router.push(`/battle/${result.code}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'สร้างห้องไม่สำเร็จ');
    } finally {
      setPending(false);
    }
  }

  return <Dialog open={open} onOpenChange={value => { if (!pending) onOpenChange(value); }}>
    <DialogContent overlayClassName="bg-black/35 backdrop-blur-md" className="max-h-[92dvh] max-w-[calc(100%-1rem)] grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden squircle-3xl p-4 sm:max-w-5xl sm:p-6">
      <DialogHeader className="pr-9">
        <DialogTitle className="font-display text-2xl">สร้างห้อง Battle</DialogTitle>
        <DialogDescription>เลือกโจทย์ ตั้งกติกา แล้วลองเทียบการบินก่อนเปิดห้องได้</DialogDescription>
      </DialogHeader>
      <form onSubmit={create} noValidate className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] gap-3">
        <Tabs value={tab} onValueChange={value => onTabChange(value as SetupTab)} className="min-h-0 min-w-0">
          <TabsList className="h-9 w-full shrink-0 sm:w-fit">
            <TabsTrigger value="scenario">เลือกโจทย์</TabsTrigger>
            <TabsTrigger value="rules">ตั้งกติกา</TabsTrigger>
            <TabsTrigger value="preview" disabled={!scenario}>เทียบการบิน 3D</TabsTrigger>
          </TabsList>
          <ScrollArea className="min-h-0 min-w-0 flex-1 pr-2">
            <TabsContent value="scenario" className="p-1"><ScenarioPicker scenarios={scenarios} value={slug} onSelect={setSlug} onNext={() => onTabChange('rules')} /></TabsContent>
            <TabsContent value="rules" className="p-1">
              <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <FieldGroup className="gap-4">
                  <FieldGroup className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="battle-host-name">ชื่อในห้อง</FieldLabel>
                      <Input id="battle-host-name" required maxLength={36} placeholder="ชื่อที่เพื่อนจะเห็น" value={name} onChange={event => setName(event.target.value)} />
                    </Field>
                    <SettingSelect id="battle-host-role" label="คุณจะเข้าห้องแบบไหน" value={role} values={{ watch: 'ดูและจัดคิว', pilot: 'ลงแข่งด้วย' }} onChange={setRole} />
                    <SettingSelect id="battle-format" label="รูปแบบห้อง" value={settings.format} values={FORMATS} onChange={value => change('format', value)} />
                    <SettingSelect id="battle-flight-mode" label="ลำดับการบิน" value={settings.flight} values={flightLabel} onChange={value => change('flight', value)} />
                    <SettingSelect id="battle-clock" label="เวลาเขียนโค้ด" value={settings.clock} values={CLOCKS} onChange={clock => setSettings(previous => ({
                      ...previous, clock, minutes: Math.max(1, Math.min(previous.minutes, clock === 'stopwatch' ? 30 : 60)),
                    }))} />
                    {settings.clock !== 'open' && <Field>
                      <FieldLabel htmlFor="battle-minutes">เวลาเขียนสูงสุด (นาที)</FieldLabel>
                      <Input id="battle-minutes" type="number" min={1} max={maximum} value={settings.minutes || ''} onChange={event => change('minutes', event.target.valueAsNumber || 0)} />
                    </Field>}
                    <Field>
                      <FieldLabel htmlFor="battle-practices">รอบทดลองบินต่อคน</FieldLabel>
                      <Input id="battle-practices" type="number" min={0} max={10} value={settings.practices} onChange={event => change('practices', Math.max(0, Math.min(10, event.target.valueAsNumber || 0)))} />
                    </Field>
                    <SettingSelect id="battle-level" label="ระดับการบิน" value={settings.difficulty} values={battleLevels} onChange={value => change('difficulty', value)} />
                  </FieldGroup>
                  <FieldSet>
                    <FieldLegend variant="label">ไฟในสนาม</FieldLegend>
                    <FieldGroup className="gap-3">
                      <Field orientation="horizontal">
                        <Switch id="battle-ceiling-light" checked={settings.ceilingLights.some(Boolean)} onCheckedChange={enabled => change('ceilingLights', [enabled, enabled, enabled, enabled])} />
                        <FieldLabel htmlFor="battle-ceiling-light">ไฟเพดาน</FieldLabel>
                      </Field>
                      <FieldGroup className="grid grid-cols-2 gap-3">
                        {settings.lights.map((light, index) => <FieldGroup key={index} className="gap-2">
                          <Field orientation="horizontal">
                            <Checkbox id={`battle-corner-${index}`} checked={light.enabled} onCheckedChange={enabled => {
                              const lights = [...settings.lights] as Settings['lights'];
                              lights[index] = { ...light, enabled: enabled === true };
                              change('lights', lights);
                            }} />
                            <FieldLabel htmlFor={`battle-corner-${index}`}>ไฟ{corners[index]}</FieldLabel>
                          </Field>
                          <NativeSelect className="w-full" aria-label={`สีไฟ${corners[index]}`} value={light.color} disabled={!light.enabled} onChange={event => {
                            const lights = [...settings.lights] as Settings['lights'];
                            lights[index] = { ...light, color: event.target.value as typeof light.color };
                            change('lights', lights);
                          }}>{Object.entries(colors).map(([key, label]) => <NativeSelectOption key={key} value={key}>{label}</NativeSelectOption>)}</NativeSelect>
                        </FieldGroup>)}
                      </FieldGroup>
                    </FieldGroup>
                  </FieldSet>
                  <Field orientation="horizontal">
                    <Switch id="battle-listed" checked={listed} onCheckedChange={setListed} />
                    <div><FieldLabel htmlFor="battle-listed">แสดงในหน้ารวมห้อง</FieldLabel><FieldDescription>ให้คนอื่นเห็นชื่อห้อง ชื่อเจ้าของ และกดเข้าร่วมได้</FieldDescription></div>
                  </Field>
                  {settings.format === 'duel' && ranked && <Field orientation="horizontal">
                    <Checkbox id="battle-ranked" checked={settings.ranked} onCheckedChange={value => change('ranked', value === true)} />
                    <FieldLabel htmlFor="battle-ranked">เก็บแต้มเมื่อผู้แข่งทั้งคู่ล็อกอิน</FieldLabel>
                  </Field>}
                </FieldGroup>
                {scenario && <Card size="sm" className="h-fit gap-3 overflow-hidden squircle-2xl pt-0">
                  <ScenarioImage scenario={scenario} className="h-36" />
                  <CardHeader><CardTitle>{scenario.title}</CardTitle><CardDescription>{battleLevels[settings.difficulty]} · {descriptions[settings.difficulty]}</CardDescription></CardHeader>
                  <CardContent><Button type="button" variant="outline" onClick={() => onTabChange('preview')}><Play data-icon="inline-start" /> ลองจำลองตัวเลือกนี้</Button></CardContent>
                </Card>}
              </div>
            </TabsContent>
            <TabsContent value="preview" className="p-1">{tab === 'preview' && scenario && <FlightComparison scenario={scenario} settings={settings} />}</TabsContent>
          </ScrollArea>
        </Tabs>
        <DialogFooter className="flex-col gap-2 sm:items-center">
          {error && <Alert variant="destructive" className="flex-1"><AlertDescription>{error}</AlertDescription></Alert>}
          {tab !== 'rules' && <Button type="button" variant="outline" onClick={() => onTabChange('rules')}>กลับไปตั้งกติกา</Button>}
          <Button type="submit" disabled={pending || !scenario}>{pending ? <Spinner /> : <Plus data-icon="inline-start" />} สร้างห้อง</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
