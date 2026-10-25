'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodeEditor } from '@/components/CodeEditor';
import { ScenePreview } from '@/field/ScenePlan';
import { currentSeason as season } from '@/rules';
import { cellName, maxScore, PATTERNS, type ScenarioView } from '@/lib/scenarios';
import { COMMANDS } from './commands';
import { buildScenarioConfig } from './config';
import { FlightRunner } from './FlightRunner';
import { programs } from './programs';

const STEP = 'grid size-8 shrink-0 place-items-center squircle-xl bg-foreground text-base font-bold text-background';
const LEVEL_TONE: Record<string, string> = { เริ่มต้น: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', กลาง: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', ยาก: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' };
const LEGACY: Record<string, string> = { mission: 'mission-start', aviation: 'aviation-start', innovation: 'innovation-start' };

/**
 * ตัวจำลอง: 1 เลือกโจทย์ → 2 อ่านโจทย์ → 3 แก้โค้ด → กดเล่นที่สนามด้านขวา
 * โดรนเริ่มที่แท่นฐานเสมอ ความสูงเป็นไปตามที่โค้ดสั่ง · โจทย์มาจากฐานข้อมูล (จัดการที่ /admin/challenges)
 * URL: ?tab=<slug ของโจทย์> (รับ mission|aviation|innovation แบบเก่าด้วย)
 */
export function SimulatorApp({ scenarios }: { scenarios: ScenarioView[] }) {
  const qs = useSearchParams();
  const wanted = LEGACY[qs.get('tab') ?? ''] ?? qs.get('tab');
  const legacyProgram = programs.find((p) => p.id === qs.get('p'));
  const initial = scenarios.find((s) => s.slug === wanted) ?? scenarios.find((s) => legacyProgram && s.slug === LEGACY[legacyProgram.event]) ?? scenarios[0];
  const [slug, setSlug] = useState(initial.slug);
  const [drafts, setDrafts] = useState<Record<string, string>>(legacyProgram ? { [initial.slug]: legacyProgram.code } : {});
  const sc = scenarios.find((s) => s.slug === slug) ?? scenarios[0];
  const code = drafts[sc.slug] ?? sc.starter;
  const edited = code !== sc.starter;
  const ev = season.events.find((e) => e.id === sc.config.event)!;
  const config = useMemo(() => buildScenarioConfig(sc.config), [sc]);
  const scene = useMemo(() => (sc.config.pattern !== 'standard' || sc.config.objects.length ? { pattern: sc.config.pattern, objects: sc.config.objects, start: sc.config.start, base: sc.config.base } : undefined), [sc]);
  const max = maxScore(sc.config);

  useEffect(() => { document.title = 'ตัวจำลองการบิน · ชมรมโดรน ลือคำหาญฯ'; }, []);

  const pick = (s: string) => {
    setSlug(s);
    const u = new URL(window.location.href);
    u.searchParams.set('tab', s); u.searchParams.delete('p'); u.searchParams.delete('mode');
    window.history.replaceState(null, '', u);
  };

  const groups = [
    { title: 'ต้นแบบภารกิจแข่งจริง', hint: 'ทำทีละฝั่ง แล้วต่อยอดเอง', items: scenarios.filter((s) => s.config.pattern === 'standard') },
    { title: 'โจทย์ฝึกบนสนามกริด', hint: 'ช่องละ 1 เมตร เป็นตัวนำทางโดรน', items: scenarios.filter((s) => s.config.pattern !== 'standard') },
  ].filter((g) => g.items.length);
  const pat = PATTERNS.find((p) => p.id === sc.config.pattern);

  return (
    <main className="mx-auto grid max-w-[84rem] gap-8 px-4 pb-32 pt-4 sm:px-6 xl:px-10">
      <header className="grid max-w-3xl gap-3">
        <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">ตัวจำลองการบิน</h1>
        <p className="text-lg leading-8 text-muted-foreground">เลือกโจทย์ เขียนคำสั่งสั่งโดรน แล้วดูมันบินจริงในสนาม 3 มิติ โดรนเริ่มที่แท่นฐานทุกครั้ง ความสูงเป็นไปตามที่คุณสั่ง ไม่ต้องมีโดรนจริง</p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
        {/* ซ้าย: ขั้นตอน 1-3 */}
        <div className="grid gap-4 max-lg:order-2">
          <section aria-labelledby="s1" className="grid gap-3 squircle-2xl border border-line bg-surface p-4">
            <h2 id="s1" className="flex items-center gap-3 text-lg font-bold"><span className={STEP}>1</span> เลือกโจทย์</h2>
            <div className="grid max-h-[25rem] gap-4 overflow-y-auto pr-1">
              {groups.map((g) => (
                <div key={g.title} className="grid gap-2">
                  <p className="text-base"><b>{g.title}</b> <span className="text-sm text-muted-foreground">· {g.hint}</span></p>
                  <div role="radiogroup" aria-label={g.title} className="grid gap-2">
                    {g.items.map((s) => {
                      const on = s.slug === sc.slug;
                      return (
                        <button key={s.slug} type="button" role="radio" aria-checked={on} onClick={() => pick(s.slug)}
                          className={`grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3 squircle-xl border p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${on ? 'border-brand-blue bg-brand-blue/10' : 'border-line hover:bg-surface-2'}`}>
                          <ScenePreview config={s.config} className="size-14 squircle-xl" />
                          <span className="min-w-0">
                            <span className="block truncate text-base font-bold leading-snug">{s.title}</span>
                            <span className={`mt-0.5 inline-block squircle-xl px-2 py-0.5 text-sm font-medium ${LEVEL_TONE[s.level] ?? 'bg-muted'}`}>{s.level}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="s2" className="grid gap-3 squircle-2xl border border-line bg-surface p-4">
            <h2 id="s2" className="flex items-center gap-3 text-lg font-bold"><span className={STEP}>2</span> อ่านโจทย์</h2>
            <p className="text-xl font-extrabold leading-snug">{sc.title}</p>
            <ul className="flex flex-wrap gap-2 text-sm">
              <li className="squircle-xl bg-surface-2 px-2.5 py-1">{pat?.label}</li>
              <li className="squircle-xl bg-surface-2 px-2.5 py-1">{ev.short}</li>
              {max !== null && <li className="squircle-xl bg-brand-blue/10 px-2.5 py-1 font-semibold text-brand-blue">คะแนนเต็ม {max}</li>}
              {sc.config.pattern === 'grid5' && <li className="squircle-xl bg-surface-2 px-2.5 py-1">ฐาน = ช่อง {cellName(0, 0)}</li>}
            </ul>
            <div className="rich text-base" dangerouslySetInnerHTML={{ __html: sc.briefHtml }} />
          </section>

          <section aria-labelledby="s3" className="grid gap-3 squircle-2xl border border-line bg-surface p-4">
            <h2 id="s3" className="flex items-center gap-3 text-lg font-bold"><span className={STEP}>3</span> เขียนโค้ด</h2>
            <CodeEditor value={code} onChange={(v) => setDrafts((d) => ({ ...d, [sc.slug]: v }))} rows={14} label="โค้ดภารกิจ" />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="h-10 px-3 text-base" onClick={() => setDrafts((d) => { const n = { ...d }; delete n[sc.slug]; return n; })} disabled={!edited}><RotateCcw className="size-4" /> กลับเป็นโค้ดตั้งต้น</Button>
              <span className="text-sm text-muted-foreground">{edited ? 'แก้ไขแล้ว กดเล่นที่สนามเพื่อดูผล' : 'พิมพ์ชื่อคำสั่งแล้วเลือกจากรายการได้เลย'}</span>
            </div>
            <details className="squircle-xl border border-line p-3 text-base">
              <summary className="cursor-pointer font-bold">คำสั่งที่ใช้ได้ทั้งหมด</summary>
              <div className="mt-3 grid gap-4">
                {(['เริ่มและจบการบิน', 'เคลื่อนที่', 'ภารกิจ'] as const).map((g) => (
                  <div key={g}>
                    <p className="font-bold">{g}</p>
                    <ul className="mt-1.5 grid gap-2">
                      {COMMANDS.filter((c) => c.group === g).map((c) => <li key={c.name} className="leading-7"><code className="squircle-xl bg-surface-2 px-2 py-0.5 text-sm font-semibold">{c.sig}</code><span className="mt-0.5 block text-muted-foreground">{c.desc}</span></li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">พิมพ์เล็ก/ใหญ่หรือมี _ ก็ได้ เช่น auto_land, takeoff · ใส่ // ต่อท้ายเพื่อเขียนโน้ตกำกับ</p>
            </details>
          </section>
        </div>

        {/* ขวา: สนาม กดเล่นตรงนี้ (บนมือถืออยู่ก่อน) */}
        <div data-tour="sim-stage" className="grid gap-3 lg:sticky lg:top-24 max-lg:order-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">สนาม · {sc.title}</h2>
            <p className="text-base text-muted-foreground">ลองกดเล่นได้เลย ไม่ต้องแก้อะไรก่อน</p>
          </div>
          <FlightRunner event={ev} code={code} config={config} scene={scene} maxPoints={max} playLabel="เริ่มจำลองการบิน" />
        </div>
      </div>
    </main>
  );
}
