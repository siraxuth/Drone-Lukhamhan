'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, ChevronDown, CircleHelp, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CodeEditor, highlightCode } from '@/components/CodeEditor';
import { ScenePreview } from '@/field/ScenePlan';
import { currentSeason as season } from '@/rules';
import { LEVELS, maxScore, PATTERNS, type ScenarioView, type SceneObject } from '@/lib/scenarios';
import { commandsFor } from './commands';
import { buildScenarioConfig } from './config';
import { FlightRunner } from './FlightRunner';
import { Tour, type TourStep } from '@/components/Tour';
import { programs } from './programs';
import { convertStyle, STYLES, type Style } from './style';
import type { Result } from './engine';
import { bindStarterToKey, KEY_FUNCTION_EXAMPLE } from './key-program';

const LEVEL_TONE: Record<string, string> = { เริ่มต้น: 'bg-surface-2 text-foreground', กลาง: 'bg-brand-blue/10 text-brand-blue', ยาก: 'bg-emphasis text-emphasis-foreground', 'โหดมาก': 'bg-destructive/10 text-destructive' };
const LEGACY: Record<string, string> = { mission: 'mission-start', aviation: 'aviation-start', innovation: 'innovation-start' };
const STYLE_KEY = 'sim-style-v1';
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

const demoScene = { pattern: 'blank' as const, objects: [] };
const demoConfig = { ...buildScenarioConfig({ ...demoScene, event: 'mission' }), style: 'full' as const };

const demoEvent = season.events.find((event) => event.id === 'mission')!;

const flightHeader = `void setup() {
  drone.onKey1(fly);
}

void fly() {`;
const starter = `${flightHeader}
  // พิมพ์คำสั่งบินตรงนี้
}
`;

const firstFlightCommands = [
  'calibration();',
  'delay(3000);',
  'take_off();',
  'delay(3000);',
  'set_height(100);',
  'poshold();',
  'delay(1000);',
  'auto_land();',
];

const practiceCommands = commandsFor('full');

function FirstFlightExercise({ onComplete }: { onComplete: (complete: boolean) => void }) {
  const [body, setBody] = useState('');
  const [finished, setFinished] = useState(false);
  const lines = body.split('\n').map((line) => line.trim().replace(/\s*([();])\s*/g, '$1')).filter(Boolean);
  const nextLine = firstFlightCommands.findIndex((command, index) => command !== lines[index]);
  const ready = nextLine === -1 && lines.length === firstFlightCommands.length;
  const code = `${flightHeader}\n${body}\n}\n`;
  const updateBody = (value: string) => {
    setBody(value);
    setFinished(false);
    onComplete(false);
  };
  const finishFlight = useCallback((result: Result) => {
    const passed = result.landedOnPad && !result.events.some((event) => event.kind === 'error');
    setFinished(passed);
    onComplete(passed);
  }, [onComplete]);

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <div className="grid min-w-0 content-start gap-2">
        <div className="overflow-x-auto whitespace-pre font-mono text-sm">{highlightCode(flightHeader)}</div>
        <label htmlFor="first-flight-body" className="text-sm font-semibold">พิมพ์คำสั่งตรงนี้ ภายในปีกกาของ fly()</label>
        {nextLine >= 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 squircle-xl border border-line bg-surface-2 p-3">
            <div>
              <p className="text-sm font-semibold">บรรทัดที่ {nextLine + 1} จาก {firstFlightCommands.length}</p>
              <code className="text-sm">{firstFlightCommands[nextLine]}</code>
            </div>
            <Button type="button" onClick={() => {
              const draftLines = body.split('\n').filter((line) => line.trim());
              draftLines[nextLine] = `  ${firstFlightCommands[nextLine]}`;
              updateBody(draftLines.join('\n'));
              document.getElementById('first-flight-body')?.focus();
            }}>
              <Plus aria-hidden="true" className="size-4" /> เติมลงในโค้ด
            </Button>
          </div>
        )}
        <CodeEditor
          id="first-flight-body"
          autoFocus
          label="คำสั่งในฟังก์ชัน fly"
          value={body}
          rows={10}
          commands={practiceCommands}
          showQuick={false}
          onChange={updateBody}
        />
        <pre className="font-mono text-sm">{'}'}</pre>
        <p role="status" className="text-sm">
          {finished ? 'บินจบแล้ว กด “ถัดไป” ได้เลย' : ready ? 'เขียนครบแล้ว กด KEY 1 เพื่อดูผลบิน' : nextLine === -1 ? `ขั้นนี้ใช้ ${firstFlightCommands.length} คำสั่ง ลบบรรทัดที่เกินออกก่อน` : <>บรรทัดที่ {nextLine + 1} ให้พิมพ์ <code>{firstFlightCommands[nextLine]}</code></>}
        </p>
      </div>
      {ready ? (
        <FlightRunner
          event={demoEvent} code={code} config={demoConfig} scene={demoScene}
          previewKey={1} focusPlay playLabel="KEY 1 · ดูตัวอย่างบิน"
          onStart={() => { setFinished(false); onComplete(false); }}
          onFinish={finishFlight}
        />
      ) : (
        <div className="grid min-h-32 place-items-center squircle-2xl border border-line bg-surface-2 p-4 text-center text-sm text-muted-foreground">
          เขียนครบทั้ง {firstFlightCommands.length} บรรทัดเพื่อปลดล็อก KEY 1
        </div>
      )}
    </div>
  );
}

const firstRoute: SceneObject[] = [
  { type: 'waypoint', id: 'จุด 1', x: 0, y: 1, order: 1, r: 40, zMin: 80, zMax: 120 },
];
const middleRoute: SceneObject[] = [
  ...firstRoute,
  { type: 'waypoint', id: 'จุด 2', x: 1, y: 1, order: 2, r: 40, zMin: 125, zMax: 175 },
];

function FlightExercise({ initialCode, objects = demoScene.objects, compareKeys = false }: { initialCode: string; objects?: SceneObject[]; compareKeys?: boolean }) {
  const [draft, setDraft] = useState(initialCode);
  const [result, setResult] = useState<Result | null>(null);
  const scene = useMemo(() => ({ ...demoScene, objects }), [objects]);
  const config = useMemo(() => ({ ...buildScenarioConfig({ ...scene, event: 'mission' }), style: 'full' as const }), [scene]);
  const updateDraft = (value: string) => {
    setDraft(value);
    setResult(null);
  };
  const checkpoints = objects.filter((object) => object.type === 'waypoint');
  const reached = checkpoints.filter((point) => result?.visits.some((visit) => visit.id === point.id));

  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2">
      <div className="grid min-w-0 content-start gap-2">
        <label htmlFor="sim-exercise-code" className="text-sm font-semibold">โค้ดสำหรับฝึก</label>
        <CodeEditor id="sim-exercise-code" label="โค้ดสำหรับฝึก" value={draft} onChange={updateDraft} rows={10} commands={practiceCommands} showQuick={false} />
        <Button variant="outline" onClick={() => updateDraft(initialCode)}>คืนโค้ดตั้งต้นของขั้นนี้</Button>
        {result && checkpoints.length > 0 && (
          <p role="status" className="text-sm">
            ผ่านจุดตรวจ {reached.length}/{checkpoints.length} · {result.landedOnPad ? 'ลงจอดบนฐานแล้ว' : 'ยังไม่ได้ลงจอดบนฐาน'}
          </p>
        )}
      </div>
      <FlightRunner event={demoEvent} code={draft} config={config} scene={scene} previewKey={1} bigPlay={!compareKeys} remoteKeys={compareKeys ? [1, 2] : undefined} initialView={compareKeys ? "top" : undefined} playLabel="KEY 1 · ทดสอบโค้ด" onStart={() => setResult(null)} onFinish={setResult} />
    </div>
  );
}

const SIM_TOUR: TourStep[] = [
  {
    target: '[data-tour="sim-pick"]',
    title: 'เลือกสนามฝึก',
    text: 'กด “เลือกภารกิจ” ด้านบนเพื่อดูด่าน อ่านเป้าหมายจากรายการแล้วกดด่านที่ต้องการหนึ่งครั้ง สนามและโค้ดตั้งต้นจะเปลี่ยนตามด่าน',
  },
  {
    target: '[data-tour="sim-brief-toggle"]',
    title: 'อ่านโจทย์ของด่านปัจจุบัน',
    text: 'กด “อ่านโจทย์” บนการ์ดชื่อด่าน รายละเอียดจะเลื่อนลงมาใต้ชื่อ กด “ซ่อนโจทย์” เพื่อพับกลับและคืนพื้นที่ให้สนาม',
  },
  {
    target: '[data-tour="sim-keys"]',
    title: 'กลับมาทดลองโค้ดของคุณ',
    text: 'ใต้สนามจริงของด่านมี KEY 1–11 ปุ่มที่ผูกแล้วจะแสดงชื่อฟังก์ชัน กดปุ่มนั้นเพื่อบินตามโค้ดของคุณ ถ้าปุ่มกดไม่ได้ ให้ตรวจว่าผูกชื่อไว้ใน `setup()` และสะกดตรงกับชื่อฟังก์ชัน',
  },
  {
    target: '[data-tour="sim-camera"]',
    title: 'เลือกมุมกล้องให้เหมาะกับสิ่งที่ดู',
    text: 'ในสนาม 3D ใช้ “ตามโดรน” เพื่อเห็นตัวลำและการเอียง หรือ “มองจากบน” เพื่อดูทิศทางเทียบกับจุดในสนาม ถ้าเครื่องแสดงสนาม 2D จะเห็นเส้นทางจากด้านบน หลังบินจบให้ดูเส้นทางจริงเทียบกับแผน แล้วลองแก้ระยะหรือทิศในโค้ดก่อนกด KEY อีกครั้ง',
  },
];

const CODE_COURSE: TourStep[] = [
  {
    target: '[data-sim-editor] textarea',
    title: 'เริ่มต้น · โค้ดหนึ่งบรรทัดทำอะไร',
    text: 'คำสั่งอย่าง `delay(3000);` มีชื่อคำสั่ง ค่าที่ส่งในวงเล็บ และเครื่องหมาย ; ปิดท้าย ในตัวอย่างนี้ 3000 คือมิลลิวินาที หรือ 3 วินาที อ่านคำสั่งจากบนลงล่าง ส่วนปีกกา { } ใช้บอกว่าบรรทัดไหนอยู่ในฟังก์ชันเดียวกัน',
  },
  {
    target: '[data-tour="sim-starter-example"]',
    title: 'เริ่มต้น · ผูกปุ่มกับฟังก์ชัน',
    text: 'พิมพ์ `drone.onKey1(fly);` ใน `setup()` เพื่อบอกว่า KEY 1 ต้องเรียกฟังก์ชันชื่อ fly แล้วเขียน `void fly() { ... }` แยกไว้นอก setup ชื่อทั้งสองที่ต้องสะกดเหมือนกัน ตอนเปิดเครื่องโดรนอาจยังอยู่ในมือ ให้วางบนฐานนิ่ง ๆ ก่อนกด KEY 1 ฟังก์ชัน fly จึงค่อยเริ่มตั้งศูนย์',
    content: <pre data-tour="sim-starter-example" className="max-h-48 overflow-auto whitespace-pre-wrap break-words squircle-xl border border-line bg-canvas p-3 font-mono text-xs leading-relaxed sm:text-sm">{starter}</pre>,
  },
  {
    target: '#first-flight-body',
    title: 'เริ่มต้น · ขึ้นบิน ลอยตัว แล้วลงจอด',
    wide: true,
    text: 'วางโดรนบนฐานให้หยุดนิ่งก่อนกด KEY 1 ขั้นนี้ให้พิมพ์คำสั่งในช่องใต้ void fly() ทีละบรรทัด เริ่มจากตั้งศูนย์และรอ 3 วินาที จากนั้นขึ้นบิน รอให้ยกตัว ตั้งความสูง ใช้ `poshold();` ค้างตำแหน่งและความสูง ตามด้วย `delay(1000);` เพื่อรอ 1 วินาทีก่อนลงจอด เขียนครบแล้วปุ่มทดลองบินจะเปิดให้กด',
    blockedHint: 'ปลดล็อกขั้นถัดไปเมื่อเขียนครบ กด KEY 1 และลงจอดบนฐานสำเร็จ',
    exercise: (setComplete) => <FirstFlightExercise onComplete={setComplete} />,
  },
  {
    target: '#sim-exercise-code',
    title: 'เริ่มต้น · ทิศทางอิงจากหัวโดรน',
    wide: true,
    text: 'กด KEY 1 ให้บินจนจบ แล้วกด KEY 2 ทั้งสองเที่ยวเริ่มจากฐานเดียวกันและใช้คำสั่งเดินหน้า 100 ซม. เหมือนกัน\n\nKEY 1 เรียก `flyForward()` โดรนบินไปตรงหน้าจากทิศหัวเดิม\nKEY 2 เรียก `turnThenForward()` โดรนหมุนขวา 90° ด้วย `set_yaw(1, 90);` อยู่กับที่ แล้วค้างด้วย `poshold();` รอ 1 วินาทีด้วย `delay(1000);` ก่อนใช้ `move_forward(100);` จึงบินไปทางขวาเมื่อมองจากด้านบน\n\nลองแก้ระยะในฟังก์ชันของ KEY 2 เป็น 50 ซม. แล้วกดเฉพาะ KEY 2 อีกครั้ง ดูว่าทิศเดิมแต่จุดลงจอดใกล้ฐานขึ้นไหม',
    content: <FlightExercise initialCode={KEY_FUNCTION_EXAMPLE} compareKeys />,
  },
  {
    target: '#sim-exercise-code',
    title: 'ภารกิจแรก · ผ่านจุดตรวจแล้วกลับฐาน',
    wide: true,
    text: 'จุด 1 อยู่ตรงหน้า 100 ซม. ที่ระดับ 80–120 ซม. เริ่มด้วยการตั้งศูนย์ รอ ขึ้นบิน แล้วรอให้ยกตัว จากนั้นตั้งความสูง 100 ซม. เดินหน้าไปจุดตรวจ หยุดนิ่งด้วย `poshold();` ตามด้วย `delay(1000);` แล้วถอยกลับระยะเท่ากันก่อนลงจอด กด KEY 1 แล้วดูว่าผ่านจุดตรวจและกลับลงฐานได้ครบไหม',
    content: <FlightExercise initialCode={starter} objects={firstRoute} />,
  },
  {
    target: '#sim-exercise-code',
    title: 'ระดับกลาง · ผ่านสองจุดที่คนละความสูง',
    wide: true,
    text: 'ใช้ลำดับตั้งศูนย์และขึ้นบินจากขั้นก่อน แล้วผ่านจุด 1 ตรงหน้าที่ 100 ซม. ก่อน จุด 2 อยู่ทางขวาของจุด 1 อีก 100 ซม. และต้องผ่านที่ระดับ 125–175 ซม. ลองวางแผนว่าจะตั้งความสูง 150 ซม. ตอนไหน แล้วหาทางกลับฐานเอง เปิดมองจากบนและใช้ผลหลังบินตรวจว่าผ่านครบตามลำดับหรือยัง',
    content: <FlightExercise initialCode={starter} objects={middleRoute} />,
  },
  {
    target: '[data-sim-editor] textarea',
    title: 'เอาโค้ดที่เรียนไปวางแผนด่านจริง',
    text: 'เริ่มจากอ่านโจทย์แล้วจดจุดที่ต้องผ่าน ทิศหัว และความสูง เขียนเป็นช่วงสั้น ๆ แล้วกด KEY ทดสอบทีละรอบ ถ้าพลาด ให้เปลี่ยนทีละอย่าง เช่น ระยะหรือความสูง จะได้รู้ว่าการแก้บรรทัดไหนเปลี่ยนผลบิน กด “ฝึกเขียนโค้ด” เหนือช่องโค้ดเพื่อกลับมาทบทวนได้',
  },
];

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
  const [drafts, setDrafts] = useState<Record<string, string>>(legacyProgram ? { [initial.slug]: bindStarterToKey(legacyProgram.code) } : {});
  const [briefOpen, setBriefOpen] = useState(false);
  const [panel, setPanel] = useState<null | 'pick'>(null);
  const [styleSel, setStyleSel] = useState<Style>('full');
  const [missionSearch, setMissionSearch] = useState('');
  const [missionLevel, setMissionLevel] = useState('ทุกระดับ');
  const [missionType, setMissionType] = useState('ทุกประเภท');
  const [payloads, setPayloads] = useState<Record<string, { L: number; R: number }>>({});
  const [canReload, setCanReload] = useState(true);
  const [loadCount, setLoadCount] = useState({ L: 20, R: 20 });
  const sc = scenarios.find((s) => s.slug === slug) ?? scenarios[0];
  const code = drafts[sc.slug] ?? sc.starter;
  const edited = code !== sc.starter;
  const ev = season.events.find((e) => e.id === sc.config.event)!;
  const style: Style = styleSel;
  const commands = useMemo(() => commandsFor(style), [style]);
  const payload = payloads[sc.slug] ?? { L: 0, R: 0 };
  const config = useMemo(() => ({ ...buildScenarioConfig(sc.config), style, initialPayload: payload }), [sc, style, payload]);
  const converted = useMemo(() => convertStyle(code, style), [code, style]);
  const scene = useMemo(() => (sc.config.pattern !== 'standard' || sc.config.objects.length ? { pattern: sc.config.pattern, objects: sc.config.objects, start: sc.config.start, base: sc.config.base } : undefined), [sc]);
  const max = maxScore(sc.config);
  const pat = PATTERNS.find((p) => p.id === sc.config.pattern);

  useEffect(() => { try { const v = localStorage.getItem(STYLE_KEY); if (v === 'full' || v === 'any' || v === 'drone' || v === 'parduino') setStyleSel(v); } catch { /* ไม่เป็นไร */ } }, []);
  const chooseStyle = (v: Style) => { setStyleSel(v); try { localStorage.setItem(STYLE_KEY, v); } catch { /* ไม่เป็นไร */ } };

  useEffect(() => { document.title = 'ตัวจำลองการบิน · ชมรมโดรน ลือคำหาญฯ'; }, []);

  const onFinish = useCallback((result: Result) => {
    setPayloads((current) => ({ ...current, [sc.slug]: result.payloadRemaining }));
    setCanReload(result.landedOnPad);
  }, [sc.slug]);
  const onFlightResult = useCallback((result: Result | null) => { if (!result) setCanReload(true); }, []);

  const pick = (s: string) => {
    setSlug(s); setPanel(null);
    setCanReload(true);
    const u = new URL(window.location.href);
    u.searchParams.set('tab', s); u.searchParams.delete('p'); u.searchParams.delete('mode');
    window.history.replaceState(null, '', u);
  };
  const setCode = (v: string) => setDrafts((d) => ({ ...d, [sc.slug]: v }));
  const resetCode = () => setDrafts((d) => { const n = { ...d }; delete n[sc.slug]; return n; });

  const categories = [...new Set(scenarios.flatMap((s) => s.config.tags?.length ? s.config.tags : [s.config.event]))];
  const typeLabel: Record<string, string> = { route: 'วางเส้นทาง', checkpoint: 'Checkpoint', altitude: 'ความสูง', hoop: 'ลอดห่วง', cargo: 'ปล่อยบอล', landing: 'ลงจอด', target: 'ยิงเป้า', mixed: 'ภารกิจผสม', mission: 'ปล่อยบอล', aviation: 'แตะลูกโป่ง', innovation: 'ยิงเป้า' };
  const filteredScenarios = scenarios.filter((s) => {
    const tags = s.config.tags?.length ? s.config.tags : [s.config.event];
    return (missionLevel === 'ทุกระดับ' || s.level === missionLevel)
      && (missionType === 'ทุกประเภท' || tags.includes(missionType))
      && `${s.title} ${s.briefHtml}`.toLocaleLowerCase().includes(missionSearch.toLocaleLowerCase());
  });
  const reloadPayload = () => {
    if (canReload && sc.config.requiresPayload) setPayloads((current) => ({ ...current, [sc.slug]: { ...loadCount } }));
  };


  return (
    <main className="flex h-svh w-full min-w-0 flex-col overflow-hidden pt-[4.75rem]">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1"><h1 className="text-xl font-extrabold sm:text-2xl">สนามฝึกการบินโดรน</h1><p className="text-sm text-muted-foreground">วางแผนคำสั่ง ดูเส้นทางจริง แล้วเรียนรู้จากสิ่งที่คลาดเคลื่อน</p></div>
        {qs.get('lesson') !== '1' && <Button variant="outline" className="min-h-10" data-sim-guide><CircleHelp className="size-4" /> วิธีใช้</Button>}
        <Button className="min-h-10" data-tour="sim-pick" onClick={() => setPanel('pick')}><BookOpen className="size-4" /> เลือกภารกิจ</Button>
      </header>
      <div className="grid w-full min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 sm:p-4 xl:overflow-hidden xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section data-tour="sim-stage" aria-label="สนามจำลอง" className="order-1 grid min-h-0 min-w-0 content-start gap-2 xl:order-2 xl:grid-rows-[auto_minmax(25rem,1fr)_auto] xl:overflow-y-auto">
          <div className="min-w-0 squircle-2xl border border-line bg-surface">
            <div className="flex min-w-0 items-center gap-2 px-3 py-2">
            <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-extrabold sm:text-base">{sc.title}</h2><p className="truncate text-xs text-muted-foreground">{sc.level} · {pat?.label}</p></div>
              <Button size="sm" variant="outline" data-tour="sim-brief-toggle" aria-expanded={briefOpen} aria-controls="sim-mission-brief" onClick={() => setBriefOpen(!briefOpen)}>
                <ChevronDown className={`size-4 transition-transform motion-reduce:transition-none ${briefOpen ? 'rotate-180' : ''}`} />
                {briefOpen ? 'ซ่อนโจทย์' : 'อ่านโจทย์'}
              </Button>
            </div>
            <div id="sim-mission-brief" inert={!briefOpen} className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${briefOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="min-h-0 overflow-hidden">
                <div className="rich max-h-[25svh] overflow-y-auto border-t border-line px-3 py-3 text-sm leading-6" dangerouslySetInnerHTML={{ __html: sc.briefHtml }} />
              </div>
            </div>
          </div>
          <div data-tour="sim-stage-canvas" className="min-h-0 min-w-0 squircle-3xl border border-line bg-surface p-2 sm:p-3 xl:flex xl:flex-1 xl:flex-col">
            <FlightRunner event={ev} code={code} config={config} scene={scene} maxPoints={max} bigPlay={false} onResult={onFlightResult} onStart={() => setCanReload(false)} onFinish={onFinish} />
          </div>
          {sc.config.requiresPayload && <section className="grid gap-2 squircle-2xl border border-line bg-surface p-3" aria-label="เตรียมโดรน">
            <div className="flex flex-wrap items-center gap-2"><h2 className="mr-auto text-sm font-bold">เตรียมโดรน</h2>{sc.config.requiresPayload && <span className="text-xs text-muted-foreground">บอล ซ้าย {payload.L}/20 · ขวา {payload.R}/20</span>}{sc.config.requiresPayload && <Button size="sm" variant="outline" onClick={reloadPayload} disabled={!canReload || (payload.L === loadCount.L && payload.R === loadCount.R)} title={!canReload ? 'ต้องกลับมาลงบนฐานก่อน' : undefined}>{`ใส่บอล ${loadCount.L + loadCount.R} ลูก`}</Button>}</div>
            {!canReload ? <p className="text-xs text-muted-foreground">เติมบอลได้เมื่อโดรนลงบนฐานแล้ว</p> : payload.L === loadCount.L && payload.R === loadCount.R ? <p className="text-xs text-muted-foreground">ใส่บอลตามจำนวนที่เลือกแล้ว พร้อมบิน</p> : <p className="text-xs text-muted-foreground">ถ้าโจทย์ให้ปล่อยบอล ให้เติมก่อนกด KEY</p>}
          <div className="flex flex-wrap gap-3">
              {(['L', 'R'] as const).map(side => <label key={side} className="flex items-center gap-2 text-sm">เติมฝั่ง{side === 'L' ? 'ซ้าย' : 'ขวา'}
                <input aria-label={`จำนวนบอลฝั่ง${side === 'L' ? 'ซ้าย' : 'ขวา'}`} type="number" min={0} max={20} step={1} disabled={!canReload} value={loadCount[side]} onChange={e => setLoadCount(c => ({ ...c, [side]: Math.max(0, Math.min(20, Math.trunc(Number(e.target.value) || 0))) }))} className="h-9 w-16 squircle-xl border border-line bg-surface px-2" /> ลูก
              </label>)}
            </div>
            {sc.config.objects.filter((o): o is Extract<SceneObject, { type: 'platform' }> => o.type === 'platform').map(o => <p key={o.id} className="text-xs text-muted-foreground">{o.id}: ต้องใส่ {o.requiredBalls ?? 20} ลูก</p>)}
          </section>}
        </section>
        <aside className="order-2 grid min-h-0 min-w-0 content-start gap-2 xl:order-1 xl:grid-rows-[minmax(0,1fr)] xl:overflow-hidden xl:pr-1">
          <section className="grid min-h-[20rem] min-w-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden squircle-3xl border border-line bg-surface xl:min-h-0" data-tour="sim-code" aria-label="โค้ดภารกิจ">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2"><div className="min-w-0 flex-1"><h2 className="font-bold">เขียนโค้ดภารกิจ</h2><p className="text-xs text-muted-foreground">เขียนฟังก์ชัน → ผูก KEY → กดปุ่มใต้สนาม</p></div><Button className="min-h-10" data-sim-course>ฝึกเขียนโค้ด</Button><details className="relative"><summary className="cursor-pointer list-none squircle-xl border border-line bg-surface-2 px-2.5 py-2 text-xs font-semibold hover:bg-surface focus-visible:ring-2 focus-visible:ring-brand-blue">ตัวอย่าง KEY 1–2</summary><pre className="absolute right-0 top-full z-20 mt-2 max-h-64 w-[min(32rem,80vw)] overflow-auto squircle-2xl border border-line bg-surface p-3 font-mono text-xs leading-5 shadow-xl">{KEY_FUNCTION_EXAMPLE}</pre></details><details className="relative"><summary className="cursor-pointer list-none squircle-xl border border-line bg-surface-2 px-2.5 py-2 text-xs font-semibold hover:bg-surface focus-visible:ring-2 focus-visible:ring-brand-blue">ชื่อคำสั่ง</summary><div className="absolute right-0 top-full z-20 mt-2 max-h-64 w-[min(36rem,85vw)] overflow-auto squircle-2xl border border-line bg-surface p-3 text-xs shadow-xl"><p className="mb-2">ใช้ <code>move_forward(100);</code>, <code>set_height(120);</code> และคำสั่งเต็มที่อ่านง่าย</p><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th className="p-1">ย่อ</th><th className="p-1">เต็ม</th><th className="p-1">drone.</th><th className="p-1">pArduino-&gt;</th></tr></thead><tbody>{PAIRS.map(([a,b,c,d]) => <tr key={a} className="border-t border-line"><td className="p-1 font-mono">{a}</td><td className="p-1 font-mono">{b}</td><td className="p-1 font-mono">{c}</td><td className="p-1 font-mono">{d}</td></tr>)}</tbody></table></div><details className="mt-2"><summary className="cursor-pointer font-semibold">คีย์ลัดในตัวแก้โค้ด</summary><ul className="mt-1 grid gap-1 sm:grid-cols-2">{KEYS.map(([k,d]) => <li key={k}><kbd className="font-mono">{k}</kbd> · {d}</li>)}</ul></details></div></details></div>
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">รูปแบบคำสั่ง</span>
        <div role="group" aria-label="แบบการเขียนโค้ด" data-tour="sim-style" className="flex items-center gap-1 squircle-xl border border-line bg-surface p-1">
          {STYLES.map((x) => <button key={x.id} type="button" aria-pressed={style === x.id} onClick={() => chooseStyle(x.id)} title={x.hint} className={"h-8 squircle-xl px-2.5 font-mono text-sm font-semibold transition-colors disabled:opacity-60 " + (style === x.id ? "bg-brand-blue text-background" : "hover:bg-surface-2")}>{x.label}</button>)}
        </div>
        {style !== 'any' && converted !== code && <Button variant="outline" onClick={() => setCode(converted)}>แปลงชื่อคำสั่ง</Button>}
        {edited && <Button variant="outline" onClick={resetCode}><RotateCcw className="size-4" /> คืนโค้ดตั้งต้น</Button>}
            </div>
            <div data-sim-editor className="grid min-h-0 min-w-0"><CodeEditor value={code} onChange={setCode} label="โค้ดภารกิจ" fill commands={commands} showQuick={false} /></div>
          </section>

        </aside>
      </div>
      {qs.get('lesson') !== '1' && <Tour id="simulator-guide-v2" steps={SIM_TOUR} autoOpenImmediately trigger="[data-sim-guide]" allowTargetInteraction />}
      <Tour id="sim-code-course" steps={CODE_COURSE} forceQuery="lesson" autoOpenImmediately startOnFocus="[data-sim-editor] textarea" trigger="[data-sim-course]" allowTargetInteraction />
      <Dialog open={panel === 'pick'} onOpenChange={(open) => setPanel(open ? 'pick' : null)}>
        <DialogContent className="max-h-[90svh] w-[96vw] gap-4 overflow-y-auto p-4 sm:max-w-5xl sm:p-6">
          <DialogHeader><DialogTitle className="font-display text-2xl font-extrabold">เลือกภารกิจ</DialogTitle><DialogDescription>เลือกโจทย์ตามระดับและประเภท กดชื่อภารกิจหนึ่งครั้งเพื่อเลือกได้เลย</DialogDescription></DialogHeader>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input value={missionSearch} onChange={(e) => setMissionSearch(e.target.value)} placeholder="ค้นหาด่าน..." aria-label="ค้นหาภารกิจ" className="h-10 min-w-0 squircle-xl border border-line bg-canvas px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-blue" />
            <select aria-label="กรองตามระดับ" value={missionLevel} onChange={(e) => setMissionLevel(e.target.value)} className="h-10 squircle-xl border border-line bg-canvas px-3 text-sm"><option>ทุกระดับ</option>{LEVELS.map((level) => <option key={level}>{level}</option>)}</select>
            <select aria-label="กรองตามชนิดภารกิจ" value={missionType} onChange={(e) => setMissionType(e.target.value)} className="h-10 squircle-xl border border-line bg-canvas px-3 text-sm"><option>ทุกประเภท</option>{categories.map((type) => <option key={type} value={type}>{typeLabel[type] ?? type}</option>)}</select>
          </div>
          <p className="text-sm text-muted-foreground">พบ {filteredScenarios.length} ภารกิจ · กดภารกิจที่ต้องการหนึ่งครั้ง</p>
          <section className="grid gap-1 squircle-2xl border border-line bg-surface-2 p-3" aria-label="รายละเอียดภารกิจที่เลือก">
            <h3 className="font-bold">{sc.title} · {sc.level}</h3>
            <div className="rich text-sm leading-6 text-muted-foreground" dangerouslySetInnerHTML={{ __html: sc.briefHtml }} />
            <p className="text-xs text-muted-foreground">{pat?.label} · {ev.short}{max !== null ? ` · คะแนนเต็ม ${max}` : ''}{sc.config.pattern === 'grid5' ? ' · ฐาน C3 · 1 ช่อง = 1 เมตร' : ''}</p>
          </section>
          <div className="grid max-h-[55svh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredScenarios.map((s) => {
              const selected = slug === s.slug;
              const objective = /<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/i.exec(s.briefHtml)?.[1] ?? s.briefHtml;
              return <button key={s.slug} type="button" aria-pressed={selected} onClick={() => pick(s.slug)} className={'grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-center gap-2 squircle-2xl border p-2 text-left ' + (selected ? 'border-brand-blue bg-brand-blue/5' : 'border-line bg-surface hover:border-brand-blue hover:bg-surface-2')}>
                <ScenePreview config={s.config} className="size-12 squircle-xl" /><span className="min-w-0"><span className="block truncate text-sm font-bold">{s.title}</span><span className={'mt-1 inline-block squircle-xl px-2 py-0.5 text-xs font-medium ' + (LEVEL_TONE[s.level] ?? 'bg-surface-2 text-foreground')}>{s.level}</span><span className="rich mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground" dangerouslySetInnerHTML={{ __html: objective }} /><span className="mt-2 block text-xs font-semibold text-brand-blue">{selected ? 'กำลังใช้งาน' : 'เลือกด่านนี้ →'}</span></span>
              </button>;
            })}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
