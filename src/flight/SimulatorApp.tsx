'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, ChevronDown, GraduationCap, ListChecks, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodeEditor } from '@/components/CodeEditor';
import { ScenePreview } from '@/field/ScenePlan';
import { currentSeason as season } from '@/rules';
import { cellName, maxScore, PATTERNS, type ScenarioView } from '@/lib/scenarios';
import { commandsFor } from './commands';
import { buildScenarioConfig } from './config';
import { FlightRunner } from './FlightRunner';
import { appendLine, LESSON_BASE, LESSONS } from './lessons';
import { programs } from './programs';
import { convertStyle, STYLES, type Style } from './style';

const LEVEL_TONE: Record<string, string> = { เริ่มต้น: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', กลาง: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', ยาก: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' };
const LEGACY: Record<string, string> = { mission: 'mission-start', aviation: 'aviation-start', innovation: 'innovation-start' };
const LESSON_KEY = 'sim-lesson-v1';
const STYLE_KEY = 'sim-style-v1';
const GROUPS = ['เริ่มและจบการบิน', 'เคลื่อนที่', 'ภารกิจ'] as const;
const KEYS: Array<[string, string]> = [
  ['Tab / Shift+Tab', 'เยื้องเข้า / ออก (เลือกหลายบรรทัดได้)'], ['Ctrl+] / Ctrl+[', 'เยื้องเข้า / ออกทั้งบรรทัด'],
  ['Enter', 'ขึ้นบรรทัดใหม่ คงการเยื้อง · หลัง { เยื้องเพิ่มและปิด } ให้'], ['Ctrl+Enter / Ctrl+Shift+Enter', 'เพิ่มบรรทัดใหม่ด้านล่าง / ด้านบน'],
  ['Ctrl+/', 'คอมเมนต์ / เลิกคอมเมนต์บรรทัด'], ['Alt+↑ / Alt+↓', 'ย้ายบรรทัดขึ้น / ลง'], ['Shift+Alt+↑ / ↓', 'คัดลอกบรรทัดขึ้น / ลง'],
  ['Ctrl+Shift+K', 'ลบทั้งบรรทัด'], ['Ctrl+L', 'เลือกทั้งบรรทัด'], ['Ctrl+D', 'เลือกคำ กดซ้ำไปคำเดียวกันถัดไป'],
  ['Ctrl+Z / Ctrl+Y', 'ย้อนกลับ / ทำซ้ำ'], ['( [ { " \'', 'พิมพ์เปิดแล้วปิดให้เอง พิมพ์ปิดซ้ำเพื่อข้าม · Backspace ลบทั้งคู่'],
  ['Esc แล้ว Tab', 'ออกจากช่องโค้ดไปปุ่มถัดไป (สำหรับผู้ใช้คีย์บอร์ด)'],
];
/** ตารางเทียบชื่อ: ย่อ | เต็ม (ค่าเริ่มต้น) | drone. | pArduino-> */
const PAIRS: Array<[string, string, string, string]> = [
  ['calibration()', 'calibration()', 'drone.calibration()', 'pArduino->calibration()'],
  ['takeOff()', 'take_off()', 'drone.takeOff()', 'pArduino->take_off()'],
  ['autoLand()', 'auto_land()', 'drone.autoLand()', 'pArduino->auto_land()'],
  ['sh(100)', 'set_height(100)', 'drone.sh(100)', 'pArduino->set_height(100)'],
  ['fw(100)', 'move_forward(100)', 'drone.fw(100)', 'pArduino->move_forward_cm(100)'],
  ['bw(100)', 'move_backward(100)', 'drone.bw(100)', 'pArduino->move_backward_cm(100)'],
  ['ml(100)', 'move_left(100)', 'drone.ml(100)', 'pArduino->move_left_cm(100)'],
  ['mr(100)', 'move_right(100)', 'drone.mr(100)', 'pArduino->move_right_cm(100)'],
  ['yaw(90) / yaw(-90)', 'set_yaw(1, 90) / set_yaw(2, 90)', 'drone.setYaw(1, 90)', 'pArduino->set_yaw(1, 90)'],
  ['poshold()', 'poshold()', 'drone.posHold()', 'pArduino->poshold()'],
  ['settle(500)', 'delay(500)', 'drone.settle(500)', 'delay(500)'],
];

/** ข้อความที่มี `โค้ด` ในเครื่องหมายคำพูดกลับ */
function Rich({ text }: { text: string }) {
  return <>{text.split('`').map((part, i) => (i % 2 ? <code key={i} className="squircle-xl bg-surface-2 px-1.5 py-0.5 font-mono text-[0.9em] font-semibold text-brand-blue">{part}</code> : <span key={i}>{part}</span>))}</>;
}

/**
 * ตัวจำลองแบบเต็มจอเหมือน Arduino IDE: ซ้าย = ตัวแก้โค้ดใหญ่ · ขวา = สนามจำลองที่โดรนบินตามโค้ด (ตก/ชน/พังก็เห็น)
 * ใช้ครั้งแรกจะมีบทสอนเขียนโค้ดทีละขั้นก่อน (เปิดซ้ำได้ที่ปุ่ม "บทสอน") · โจทย์มาจากฐานข้อมูล (จัดการที่ /admin/challenges)
 * URL: ?tab=<slug ของโจทย์> (รับ mission|aviation|innovation แบบเก่าด้วย) · ?lesson=1 เปิดบทสอน · ?notour ปิดบทสอนอัตโนมัติ
 */
export function SimulatorApp({ scenarios }: { scenarios: ScenarioView[] }) {
  const qs = useSearchParams();
  const wanted = LEGACY[qs.get('tab') ?? ''] ?? qs.get('tab');
  const legacyProgram = programs.find((p) => p.id === qs.get('p'));
  const initial = scenarios.find((s) => s.slug === wanted) ?? scenarios.find((s) => legacyProgram && s.slug === LEGACY[legacyProgram.event]) ?? scenarios[0];
  const [slug, setSlug] = useState(initial.slug);
  const [drafts, setDrafts] = useState<Record<string, string>>(legacyProgram ? { [initial.slug]: legacyProgram.code } : {});
  const [panel, setPanel] = useState<null | 'pick' | 'brief' | 'cmds'>(null);
  const [lesson, setLesson] = useState<number | null>(null);
  const [lessonCode, setLessonCode] = useState(LESSON_BASE);
  const [ran, setRan] = useState(false);
  const [styleSel, setStyleSel] = useState<Style>('full');
  const sc = scenarios.find((s) => s.slug === slug) ?? scenarios[0];
  const inLesson = lesson !== null;
  const code = inLesson ? lessonCode : (drafts[sc.slug] ?? sc.starter);
  const edited = inLesson ? lessonCode !== LESSON_BASE : code !== sc.starter;
  const ev = season.events.find((e) => e.id === sc.config.event)!;
  const style: Style = inLesson ? 'full' : styleSel;
  const commands = useMemo(() => commandsFor(style), [style]);
  const config = useMemo(() => ({ ...buildScenarioConfig(sc.config), style }), [sc, style]);
  const converted = useMemo(() => convertStyle(code, style), [code, style]);
  const scene = useMemo(() => (sc.config.pattern !== 'standard' || sc.config.objects.length ? { pattern: sc.config.pattern, objects: sc.config.objects, start: sc.config.start, base: sc.config.base } : undefined), [sc]);
  const max = maxScore(sc.config);
  const pat = PATTERNS.find((p) => p.id === sc.config.pattern);

  useEffect(() => { try { const v = localStorage.getItem(STYLE_KEY); if (v === 'full' || v === 'any' || v === 'drone' || v === 'parduino') setStyleSel(v); } catch { /* ไม่เป็นไร */ } }, []);
  const chooseStyle = (v: Style) => { setStyleSel(v); try { localStorage.setItem(STYLE_KEY, v); } catch { /* ไม่เป็นไร */ } };

  useEffect(() => { document.title = 'ตัวจำลองการบิน · ชมรมโดรน ลือคำหาญฯ'; }, []);

  // ครั้งแรก: เปิดบทสอนอัตโนมัติ (เว้นแต่มี ?notour) · ?lesson=1 เปิดเสมอ
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(LESSON_KEY) === '1'; } catch { /* ไม่มี storage = ถือว่าเห็นครั้งแรกทุกครั้ง */ }
    if (qs.get('lesson') === '1' || (!seen && !qs.has('notour'))) openLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openLesson = () => {
    setLessonCode(LESSON_BASE); setLesson(0); setRan(false); setPanel(null);
    const easy = scenarios.find((s) => s.config.pattern !== 'standard' && s.level === 'เริ่มต้น');
    if (!wanted && easy) setSlug(easy.slug);
  };
  const closeLesson = () => {
    setLesson(null);
    try { localStorage.setItem(LESSON_KEY, '1'); } catch { /* ไม่เป็นไร */ }
  };
  const goStep = (n: number) => { setLesson(n); setRan(false); };
  const onFinish = useCallback(() => setRan(true), []);

  const pick = (s: string) => {
    setSlug(s); setPanel(null);
    const u = new URL(window.location.href);
    u.searchParams.set('tab', s); u.searchParams.delete('p'); u.searchParams.delete('mode');
    window.history.replaceState(null, '', u);
  };
  const setCode = (v: string) => (inLesson ? setLessonCode(v) : setDrafts((d) => ({ ...d, [sc.slug]: v })));
  const resetCode = () => (inLesson ? setLessonCode(LESSON_BASE) : setDrafts((d) => { const n = { ...d }; delete n[sc.slug]; return n; }));

  const groups = [
    { title: 'ต้นแบบภารกิจแข่งจริง', hint: 'ทำทีละฝั่ง แล้วต่อยอดเอง', items: scenarios.filter((s) => s.config.pattern === 'standard') },
    { title: 'โจทย์ฝึกบนสนามกริด', hint: 'ช่องละ 1 เมตร เป็นตัวนำทางโดรน', items: scenarios.filter((s) => s.config.pattern !== 'standard') },
  ].filter((g) => g.items.length);

  const li = lesson ?? 0;
  const step = inLesson ? LESSONS[li] : null;
  const passed = !step ? false : !step.task || !!step.check?.({ code: lessonCode, ran });
  const last = li === LESSONS.length - 1;
  const tab = 'inline-flex h-9 items-center gap-1.5 squircle-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue';
  const tabOff = `${tab} border-line bg-surface hover:bg-surface-2`;
  const tabOn = `${tab} border-brand-blue bg-brand-blue/10 text-brand-blue`;

  return (
    <main className="flex flex-col pt-[4.75rem] lg:h-svh">
      {/* แถบเครื่องมือเหมือนเมนูของ IDE */}
      <div className="relative z-20 flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <button type="button" data-tour="sim-pick" aria-expanded={panel === 'pick'} onClick={() => setPanel(panel === 'pick' ? null : 'pick')} className={`${panel === 'pick' ? tabOn : tabOff} max-w-[18rem]`}>
          <span className="truncate">โจทย์: {sc.title}</span><ChevronDown className="size-4 shrink-0" aria-hidden />
        </button>
        <button type="button" aria-expanded={panel === 'brief'} onClick={() => setPanel(panel === 'brief' ? null : 'brief')} className={panel === 'brief' ? tabOn : tabOff}><BookOpen className="size-4" aria-hidden /> อ่านโจทย์</button>
        <button type="button" aria-expanded={panel === 'cmds'} onClick={() => setPanel(panel === 'cmds' ? null : 'cmds')} className={panel === 'cmds' ? tabOn : tabOff}><ListChecks className="size-4" aria-hidden /> คำสั่ง</button>
        <button type="button" onClick={openLesson} className={inLesson ? tabOn : tabOff}><GraduationCap className="size-4" aria-hidden /> บทสอน</button>
        <div role="group" aria-label="แบบการเขียนโค้ด" data-tour="sim-style" className="flex items-center gap-1 squircle-xl border border-line bg-surface p-0.5" title={inLesson ? 'ระหว่างบทสอนใช้ชื่อเต็ม' : STYLES.find((x) => x.id === style)?.hint}>
          <span className="px-2 text-sm text-muted-foreground max-xl:hidden">แบบเขียน</span>
          {STYLES.map((x) => (
            <button key={x.id} type="button" disabled={inLesson} aria-pressed={style === x.id} onClick={() => chooseStyle(x.id)} title={x.hint}
              className={`h-8 squircle-xl px-2.5 font-mono text-sm font-semibold transition-colors disabled:opacity-60 ${style === x.id ? 'bg-brand-blue text-white' : 'hover:bg-surface-2'}`}>{x.label}</button>
          ))}
        </div>
        {style !== 'any' && converted !== code && (
          <Button variant="outline" className="h-9 px-3 text-sm" onClick={() => setCode(converted)} title="แปลงชื่อคำสั่งทั้งไฟล์ให้ตรงโหมดนี้ (แก้ได้ต่อ)">แปลงโค้ดให้</Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {max !== null && <span className="hidden squircle-xl bg-brand-blue/10 px-2.5 py-1 text-sm font-semibold text-brand-blue sm:inline">คะแนนเต็ม {max}</span>}
          <Button variant="outline" className="h-9 px-3 text-sm" onClick={resetCode} disabled={!edited}><RotateCcw className="size-4" /> <span className="max-sm:hidden">{inLesson ? 'เริ่มโค้ดใหม่' : 'กลับเป็นโค้ดตั้งต้น'}</span></Button>
        </div>

        {panel && (
          <>
            <button type="button" aria-label="ปิดเมนู" className="fixed inset-0 z-10 cursor-default" onClick={() => setPanel(null)} />
            <div className="absolute inset-x-3 top-full z-20 mt-1 max-h-[min(70svh,38rem)] overflow-y-auto squircle-2xl border border-line bg-popover p-4 shadow-2xl lg:right-auto lg:w-[40rem]">
              <button type="button" onClick={() => setPanel(null)} aria-label="ปิด" className="absolute right-3 top-3 grid size-8 place-items-center squircle-xl hover:bg-surface-2"><X className="size-4" /></button>
              {panel === 'pick' && (
                <div className="grid gap-4 pr-8">
                  {groups.map((g) => (
                    <div key={g.title} className="grid gap-2">
                      <p className="text-base"><b>{g.title}</b> <span className="text-sm text-muted-foreground">· {g.hint}</span></p>
                      <div role="radiogroup" aria-label={g.title} className="grid gap-2 sm:grid-cols-2">
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
              )}
              {panel === 'brief' && (
                <div className="grid gap-3 pr-8">
                  <p className="text-xl font-extrabold leading-snug">{sc.title}</p>
                  <ul className="flex flex-wrap gap-2 text-sm">
                    <li className="squircle-xl bg-surface-2 px-2.5 py-1">{pat?.label}</li>
                    <li className="squircle-xl bg-surface-2 px-2.5 py-1">{ev.short}</li>
                    {max !== null && <li className="squircle-xl bg-brand-blue/10 px-2.5 py-1 font-semibold text-brand-blue">คะแนนเต็ม {max}</li>}
                    {sc.config.pattern === 'grid5' && <li className="squircle-xl bg-surface-2 px-2.5 py-1">ฐาน = ช่อง {cellName(0, 0)}</li>}
                  </ul>
                  <div className="rich text-base" dangerouslySetInnerHTML={{ __html: sc.briefHtml }} />
                </div>
              )}
              {panel === 'cmds' && (
                <div className="grid gap-5 pr-8 text-base">
                  <div>
                    <p className="font-bold">โหมด “แบบเขียน” (ปุ่มด้านบน)</p>
                    <ul className="mt-1 grid gap-1 text-sm text-muted-foreground">
                      <li><b className="text-foreground">ชื่อเต็ม</b> (ค่าเริ่มต้น) ไม่ใช้ตัวย่อ เช่น <code className="font-mono">set_height(100);</code> <code className="font-mono">move_left(100);</code> ตัวพิมพ์เล็ก+ขีดล่าง จะเขียน <code className="font-mono">pArduino-&gt;</code> นำหน้าด้วยก็ได้</li>
                      <li><b className="text-foreground">ย่อ</b> เขียนสั้นๆ ได้ เช่น <code className="font-mono">fw(100);</code> <code className="font-mono">sh(100);</code> ตัวพิมพ์เล็กใหญ่ไม่สำคัญ รับทุกแบบ</li>
                      <li><b className="text-foreground">drone.</b> บังคับเขียน <code className="font-mono">drone.fw(100);</code> ชื่อต้องตรงกับ DroneEasy.hpp ทุกตัวอักษร (เช่น <code className="font-mono">drone.takeOff()</code> ไม่ใช่ takeoff)</li>
                      <li><b className="text-foreground">pArduino-&gt;</b> บังคับเขียนคำสั่งเต็ม <code className="font-mono">pArduino-&gt;move_forward_cm(100);</code> ตามโค้ดจริง (protocol.hpp) · ใช้ <code className="font-mono">delay(ms)</code> แทน settle</li>
                      <li>ทุกโหมด (ยกเว้น “ย่อ” ที่ผ่อนปรน): เขียนคำสั่งไว้ใน <code className="font-mono">void setup() {'{ }'}</code> (รันครั้งเดียว) หรือ <code className="font-mono">void loop() {'{ }'}</code> (วนซ้ำ ตัวจำลองวนสูงสุด 8 รอบ หยุดเมื่อเจอ <code className="font-mono">while (true) {'{}'}</code>) · เขียนฟังก์ชันเอง <code className="font-mono">void mission() {'{ }'}</code> แล้วเรียก <code className="font-mono">mission();</code> ได้ · <code className="font-mono">for (int i = 0; i &lt; 4; i++)</code> ได้ · ต้องมี <code className="font-mono">;</code> ท้ายคำสั่งและวงเล็บ () · ปุ่ม “แปลงโค้ดให้” แปลงชื่อคำสั่งทั้งไฟล์ให้ครั้งเดียว</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-bold">ตารางเทียบชื่อ (ผลเหมือนกันทุกแบบ)</p>
                    <p className="mt-1 text-sm text-muted-foreground">ชื่อเต็มคือชื่อเดียวกับ <code className="font-mono">pArduino-&gt;</code> ในโค้ดจริงของชมรม (protocol.hpp) ส่วน <code className="font-mono">drone.</code> คือคลาส DroneEasy.hpp ที่ห่อคำสั่งให้สั้นลง</p>
                    <div className="mt-2 overflow-x-auto squircle-xl border border-line">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-surface-2"><tr><th className="px-3 py-1.5">ย่อ</th><th className="px-3 py-1.5">ชื่อเต็ม</th><th className="px-3 py-1.5">drone.</th><th className="px-3 py-1.5">pArduino-&gt;</th></tr></thead>
                        <tbody>{PAIRS.map(([a, b, c, d]) => <tr key={a} className="border-t border-line"><td className="px-3 py-1.5 font-mono">{a}</td><td className="px-3 py-1.5 font-mono font-semibold">{b}</td><td className="px-3 py-1.5 font-mono">{c}</td><td className="px-3 py-1.5 font-mono">{d}</td></tr>)}</tbody>
                      </table>
                    </div>
                  </div>
                  {GROUPS.map((g) => (
                    <div key={g}>
                      <p className="font-bold">{g}</p>
                      <ul className="mt-1.5 grid gap-2">
                        {commands.filter((c) => c.group === g).map((c) => <li key={c.name} className="leading-7"><code className="squircle-xl bg-surface-2 px-2 py-0.5 text-sm font-semibold">{c.sig}</code><span className="mt-0.5 block text-muted-foreground">{c.desc}</span></li>)}
                      </ul>
                    </div>
                  ))}
                  <div>
                    <p className="font-bold">คีย์ลัดตัวแก้โค้ด (เหมือน VS Code · Mac ใช้ ⌘ แทน Ctrl)</p>
                    <ul className="mt-1.5 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                      {KEYS.map(([k, d]) => <li key={k} className="flex flex-wrap items-baseline gap-x-2"><kbd className="squircle-xl border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-semibold">{k}</kbd><span className="text-muted-foreground">{d}</span></li>)}
                    </ul>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">พิมพ์เล็ก/ใหญ่หรือมี _ ก็ได้ · ใส่ // ต่อท้ายเพื่อเขียนโน้ต · เขียนครอบด้วย void setup() {'{ }'} ได้เหมือนสเก็ตช์จริง (รันทีละบรรทัดจากบนลงล่าง รอบเดียว) · ประกาศค่าคงที่ <code className="font-mono">int DIST = 100;</code> แล้วใช้ <code className="font-mono">fw(DIST)</code> ได้ · ยังไม่รองรับ if / for / while</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* ซ้าย: บทสอน (ถ้ามี) + ตัวแก้โค้ดเต็มความสูง */}
        <section aria-label="ตัวแก้โค้ด" className="flex h-[30rem] min-h-0 flex-col max-lg:order-2 max-lg:border-t max-lg:border-line lg:h-auto">
          {step && (
            <div className="grid max-h-[55%] shrink-0 gap-2 overflow-y-auto border-b border-brand-blue/30 bg-brand-blue/5 px-4 py-3" aria-live="polite">
              <div className="flex items-center gap-2">
                <span className="squircle-xl bg-brand-blue px-2.5 py-0.5 text-sm font-bold text-white">บทสอน {li + 1}/{LESSONS.length}</span>
                <p className="min-w-0 flex-1 truncate text-base font-extrabold">{step.title}</p>
                <button type="button" onClick={closeLesson} className="shrink-0 squircle-xl px-2 py-1 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground">ข้ามบทสอน</button>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden><div className="h-full bg-brand-blue transition-[width]" style={{ width: `${((li + 1) / LESSONS.length) * 100}%` }} /></div>
              {step.body.map((t, i) => <p key={i} className="text-base leading-7"><Rich text={t} /></p>)}
              {step.task && (
                <div className={`flex flex-wrap items-center gap-2 squircle-xl border px-3 py-2 ${passed ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-amber-500/50 bg-amber-500/10'}`}>
                  <span aria-hidden className="text-lg">{passed ? '✅' : '👉'}</span>
                  <p className="min-w-0 flex-1 text-base font-semibold">{passed ? 'ถูกต้อง! กดถัดไปได้เลย' : step.task}</p>
                  {step.snippet && !passed && <Button variant="outline" className="h-9 px-3 text-sm" onClick={() => setLessonCode((c) => appendLine(c, step.snippet!, step.where))}>ใส่ให้</Button>}
                </div>
              )}
              {step.task && !passed && step.hint && <p className="text-sm text-muted-foreground">ใบ้: {step.hint}</p>}
              <div className="flex items-center gap-2">
                <Button variant="ghost" className="h-9 px-3 text-sm" disabled={li === 0} onClick={() => goStep(li - 1)}>ย้อนกลับ</Button>
                <Button className="h-9 px-4 text-sm" disabled={!passed && !!step.task} onClick={() => (last ? closeLesson() : goStep(li + 1))}>{last ? 'จบบทสอน' : 'ถัดไป'}</Button>
              </div>
            </div>
          )}
          <div className="min-h-0 flex-1">
            <CodeEditor value={code} onChange={setCode} label="โค้ดภารกิจ" fill commands={commands} />
          </div>
        </section>

        {/* ขวา: สนามจำลอง (บนมือถืออยู่ก่อน) */}
        <section data-tour="sim-stage" aria-label="สนามจำลอง" className="grid min-h-0 content-start gap-3 overflow-y-auto border-line p-3 max-lg:order-1 lg:border-l">
          <FlightRunner event={ev} code={code} config={config} scene={scene} maxPoints={max} playLabel="เริ่มจำลองการบิน" onFinish={onFinish} />
        </section>
      </div>
    </main>
  );
}
