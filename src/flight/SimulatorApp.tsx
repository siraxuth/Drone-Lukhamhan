'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Blocks, BookOpen, Braces, ChevronDown, CircleHelp, Plus, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { BlockProgramEditor } from './BlockProgramEditor';
import { generateBlockProgram } from './block-program';
import { parseBlockProgram, type BlockProgram } from './parser';
import { readWorkspace, WORKSPACE_STORAGE_KEY, type SimulatorWorkspaceData } from './workspace';

const LEVEL_TONE: Record<string, string> = { เริ่มต้น: 'bg-surface-2 text-foreground', กลาง: 'bg-brand-blue/10 text-brand-blue', ยาก: 'bg-emphasis text-emphasis-foreground', 'โหดมาก': 'bg-destructive/10 text-destructive' };
const LEGACY: Record<string, string> = { mission: 'mission-start', aviation: 'aviation-start', innovation: 'innovation-start' };
const STYLE_KEY = 'sim-style-v1';
const LAST_KEY = 'sim-last-mission-v1';
const DONE_KEY = 'sim-progress-v1';
/** ด่านสำหรับคนเพิ่งเริ่ม เรียงจากง่ายไปยาก (ด่านที่ไม่มีในฐานข้อมูลจะถูกข้าม) */
const START_HERE = ['blank-hover', 'grid-line', 'grid-l', 'grid-square', 'grid-hoops', 'grid-delivery'];
/** เป้าหมายของด่าน: บล็อก (ย่อหน้าหรือข้อในรายการ) ที่ขึ้นต้นด้วย "เป้าหมาย" ถ้าไม่มีใช้ย่อหน้าแรก (มักเป็นคำโปรย) */
function objectiveOf(html: string) {
  const blocks = [...html.matchAll(/<(p|li)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map((match) => ({ tag: match[1].toLowerCase(), inner: match[2] }));
  const goal = blocks.find((block) => block.inner.replace(/<[^>]+>/g, '').trim().startsWith('เป้าหมาย'));
  return (goal ?? blocks.find((block) => block.tag === 'p'))?.inner ?? html;
}
const KEYS: Array<[string, string]> = [
  ['Tab / Shift+Tab', 'เยื้องเข้า / ออก (เลือกหลายบรรทัดได้)'], ['Ctrl+] / Ctrl+[', 'เยื้องเข้า / ออกทั้งบรรทัด'],
  ['Enter', 'ขึ้นบรรทัดใหม่ คงการเยื้อง · หลัง { เยื้องเพิ่มและปิด } ให้'], ['Ctrl+Enter / Ctrl+Shift+Enter', 'เพิ่มบรรทัดใหม่ด้านล่าง / ด้านบน'],
  ['Ctrl+/', 'คอมเมนต์ / เลิกคอมเมนต์บรรทัด'], ['Alt+↑ / Alt+↓', 'ย้ายบรรทัดขึ้น / ลง'], ['Shift+Alt+↑ / ↓', 'คัดลอกบรรทัดขึ้น / ลง'],
  ['Ctrl+Shift+K', 'ลบทั้งบรรทัด'], ['Ctrl+L', 'เลือกทั้งบรรทัด'], ['Ctrl+C', 'ถ้าไม่ได้เลือกข้อความ จะคัดลอกทั้งบรรทัด'], ['Ctrl+D', 'เลือกคำ กดซ้ำไปคำเดียวกันถัดไป'],
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
  ['fwt(1500)', 'move_forward_time(1500)', 'drone.moveForwardTime(1500)', 'pArduino->move_forward_time(1500)'],
  ['bwt / mlt / mrt', 'move_backward_time / move_left_time / move_right_time', 'drone.moveBackwardTime ...', 'pArduino->move_backward_time ...'],
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

function KeyExamplePopover() {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className="min-h-10" />}>ช่วยเขียน</PopoverTrigger>
      <PopoverContent align="end" className="max-h-[min(70svh,32rem)] w-[min(38rem,calc(100vw-2rem))] overflow-y-auto p-3">
        <p className="mb-2 text-sm font-semibold">ตัวอย่างผูก KEY</p>
        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5">{KEY_FUNCTION_EXAMPLE}</pre>
        <p className="mb-2 mt-3 text-sm font-semibold">ชื่อคำสั่ง</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs"><thead><tr><th className="p-1">ย่อ</th><th className="p-1">เต็ม</th><th className="p-1">drone.</th><th className="p-1">pArduino-&gt;</th></tr></thead>
            <tbody>{PAIRS.map(([a, b, c, d]) => <tr key={a} className="border-t border-line"><td className="p-1 font-mono">{a}</td><td className="p-1 font-mono">{b}</td><td className="p-1 font-mono">{c}</td><td className="p-1 font-mono">{d}</td></tr>)}</tbody>
          </table>
        </div>
        <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold">คีย์ลัดในตัวแก้โค้ด</summary><ul className="mt-1 grid gap-1 sm:grid-cols-2">{KEYS.map(([key, description]) => <li key={key}><kbd className="font-mono">{key}</kbd> · {description}</li>)}</ul></details>
      </PopoverContent>
    </Popover>
  );
}

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
    text: 'กด “เลือกภารกิจ” ด้านบนเพื่อดูด่าน ถ้าเพิ่งเริ่ม เลือกจากกลุ่ม “เริ่มจากตรงนี้” อ่านเป้าหมายแล้วกดด่านหนึ่งครั้ง สนามและโค้ดตั้งต้นจะเปลี่ยนตามด่าน',
    advanceOnClick: true,
  },
  {
    target: '[data-tour="sim-brief-toggle"]',
    title: 'อ่านโจทย์ของด่านปัจจุบัน',
    text: 'กด “อ่านโจทย์” บนการ์ดชื่อด่าน รายละเอียดจะเลื่อนลงมาใต้ชื่อ กด “ซ่อนโจทย์” เพื่อพับกลับและคืนพื้นที่ให้สนาม',
  },
  {
    target: '[data-tour="sim-keys"]',
    title: 'กด KEY เพื่อทดลองโค้ด',
    text: 'รีโมตอยู่ใต้สนาม กด KEY ที่ขึ้นว่า “พร้อมกด” เพื่อบินตามโค้ด ในมุมเดินมีปุ่ม “เปิดรีโมท” อยู่บนสนามด้วย ถ้าไม่มี KEY ที่พร้อมกด ให้ตรวจชื่อฟังก์ชันที่ผูกไว้ใน `setup()`',
  },
  {
    target: '[data-tour="sim-camera"]',
    title: 'เลือกมุมกล้องให้เหมาะกับสิ่งที่ดู',
    text: 'เลือก “ตามโดรน” เพื่อดูตัวลำ “มองจากบน” เพื่อดูเส้นทาง หรือ “เดินในสนาม” เพื่อวางโดรนเอง มุมเดินจะขยายสนามเต็มจอและเปิดวิธีบังคับให้ครั้งแรก ในเต็มจอมีปุ่มสลับมุมอยู่ด้านบน ถ้าเครื่องใช้ 3D ไม่ได้ ยังดูสนาม 2D ได้',
  },
];

const CODE_COURSE: TourStep[] = [
  {
    target: '[data-sim-editor] textarea',
    title: 'เริ่มต้น · โค้ดหนึ่งบรรทัดทำอะไร',
    text: 'คำสั่งอย่าง `delay(3000);` มีชื่อคำสั่ง ค่าที่ส่งในวงเล็บ และเครื่องหมาย ; ปิดท้าย ในตัวอย่างนี้ 3000 คือมิลลิวินาที หรือ 3 วินาที อ่านคำสั่งจากบนลงล่าง ส่วนปีกกา { } ใช้บอกว่าบรรทัดไหนอยู่ในฟังก์ชันเดียวกัน',
  },
  {
    title: 'เริ่มต้น · ผูกปุ่มกับฟังก์ชัน',
    text: 'พิมพ์ `drone.onKey1(fly);` ใน `setup()` เพื่อบอกว่า KEY 1 ต้องเรียกฟังก์ชันชื่อ fly แล้วเขียน `void fly() { ... }` แยกไว้นอก setup ชื่อทั้งสองที่ต้องสะกดเหมือนกัน ตอนเปิดเครื่องโดรนอาจยังอยู่ในมือ ให้วางบนฐานนิ่ง ๆ ก่อนกด KEY 1 ฟังก์ชัน fly จึงค่อยเริ่มตั้งศูนย์',
    content: <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words squircle-xl border border-line bg-canvas p-3 font-mono text-xs leading-relaxed sm:text-sm">{starter}</pre>,
  },
  {
    title: 'เริ่มต้น · ขึ้นบิน ลอยตัว แล้วลงจอด',
    wide: true,
    text: 'วางโดรนบนฐานให้หยุดนิ่งก่อนกด KEY 1 ขั้นนี้ให้พิมพ์คำสั่งในช่องใต้ void fly() ทีละบรรทัด เริ่มจากตั้งศูนย์และรอ 3 วินาที จากนั้นขึ้นบิน รอให้ยกตัว ตั้งความสูง ใช้ `poshold();` ค้างตำแหน่งและความสูง ตามด้วย `delay(1000);` เพื่อรอ 1 วินาทีก่อนลงจอด เขียนครบแล้วปุ่มทดลองบินจะเปิดให้กด',
    blockedHint: 'ปลดล็อกขั้นถัดไปเมื่อเขียนครบ กด KEY 1 และลงจอดบนฐานสำเร็จ',
    exercise: (setComplete) => <FirstFlightExercise onComplete={setComplete} />,
  },
  {
    title: 'เริ่มต้น · ทิศทางอิงจากหัวโดรน',
    wide: true,
    text: 'กด KEY 1 ให้บินจนจบ แล้วกด KEY 2 ทั้งสองเที่ยวเริ่มจากฐานเดียวกันและใช้คำสั่งเดินหน้า 100 ซม. เหมือนกัน\n\nKEY 1 เรียก `flyForward()` โดรนบินไปตรงหน้าจากทิศหัวเดิม\nKEY 2 เรียก `turnThenForward()` โดรนหมุนขวา 90° ด้วย `set_yaw(1, 90);` อยู่กับที่ แล้วค้างด้วย `poshold();` รอ 1 วินาทีด้วย `delay(1000);` ก่อนใช้ `move_forward(100);` จึงบินไปทางขวาเมื่อมองจากด้านบน\n\nลองแก้ระยะในฟังก์ชันของ KEY 2 เป็น 50 ซม. แล้วกดเฉพาะ KEY 2 อีกครั้ง ดูว่าทิศเดิมแต่จุดลงจอดใกล้ฐานขึ้นไหม',
    content: <FlightExercise initialCode={KEY_FUNCTION_EXAMPLE} compareKeys />,
  },
  {
    title: 'ภารกิจแรก · ผ่านจุดตรวจแล้วกลับฐาน',
    wide: true,
    text: 'จุด 1 อยู่ตรงหน้า 100 ซม. ที่ระดับ 80–120 ซม. เริ่มด้วยการตั้งศูนย์ รอ ขึ้นบิน แล้วรอให้ยกตัว จากนั้นตั้งความสูง 100 ซม. เดินหน้าไปจุดตรวจ หยุดนิ่งด้วย `poshold();` ตามด้วย `delay(1000);` แล้วถอยกลับระยะเท่ากันก่อนลงจอด กด KEY 1 แล้วดูว่าผ่านจุดตรวจและกลับลงฐานได้ครบไหม',
    content: <FlightExercise initialCode={starter} objects={firstRoute} />,
  },
  {
    title: 'ระดับกลาง · ผ่านสองจุดที่คนละความสูง',
    wide: true,
    text: 'ใช้ขั้นตั้งศูนย์และขึ้นบินจากบทก่อน สนามนี้มีจุด 1 ตรงหน้า 100 ซม. และจุด 2 อยู่ทางขวาอีก 100 ซม. ที่ระดับ 125–175 ซม. เลือกผ่านจุดไหนก่อนก็ได้ ลองวางแผนว่าจะตั้งความสูง 150 ซม. ตอนไหน แล้วหาทางกลับฐานเอง เปิดมองจากบนเพื่อเช็กว่าผ่านครบทั้งสองจุดหรือยัง',
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
export function SimulatorApp({ scenarios, initialWorkspace, signedIn }: { scenarios: ScenarioView[]; initialWorkspace: SimulatorWorkspaceData | null; signedIn: boolean }) {
  const qs = useSearchParams();
  const wanted = LEGACY[qs.get('tab') ?? ''] ?? qs.get('tab');
  const legacyProgram = programs.find((p) => p.id === qs.get('p'));
  const hasLink = !!wanted || !!legacyProgram;
  // เข้ามาครั้งแรกเริ่มที่ด่านง่ายสุด ไม่ใช่ด่านแรกของรายการ (ซึ่งเป็นโจทย์นำเสนอที่ยากที่สุด)
  const beginnerSlug = START_HERE.find((id) => scenarios.some((s) => s.slug === id));
  const initial = scenarios.find((s) => s.slug === wanted) ?? scenarios.find((s) => legacyProgram && s.slug === LEGACY[legacyProgram.event]) ?? scenarios.find((s) => s.slug === initialWorkspace?.slug) ?? scenarios.find((s) => s.slug === beginnerSlug) ?? scenarios[0];
  const [slug, setSlug] = useState(initial.slug);
  const [drafts, setDrafts] = useState<Record<string, string>>(legacyProgram ? { ...initialWorkspace?.drafts, [initial.slug]: bindStarterToKey(legacyProgram.code) } : initialWorkspace?.drafts ?? {});
  const [briefOpen, setBriefOpen] = useState(false);
  const [panel, setPanel] = useState<null | 'pick'>(null);
  const [styleSel, setStyleSel] = useState<Style>(initialWorkspace?.style ?? 'full');
  const [editorMode, setEditorMode] = useState<'cpp' | 'blocks'>(initialWorkspace?.editorMode ?? 'cpp');
  const [blockPrograms, setBlockPrograms] = useState<Record<string, BlockProgram>>(initialWorkspace?.blockPrograms ?? {});
  const [blockProgram, setBlockProgram] = useState<BlockProgram | null>(initialWorkspace?.editorMode === 'blocks' ? initialWorkspace.blockPrograms[initial.slug] ?? parseBlockProgram(initialWorkspace.drafts[initial.slug] ?? initial.starter).program : null);
  const [blockProgramSlug, setBlockProgramSlug] = useState(initial.slug);
  const [blockSkipped, setBlockSkipped] = useState(0);
  const [blockRevision, setBlockRevision] = useState(0);
  const [activeBlockCommand, setActiveBlockCommand] = useState<{ key: number; line: number } | null>(null);
  const [pendingBlockImport, setPendingBlockImport] = useState<{ slug: string; program: BlockProgram; skipped: number } | null>(null);
  const [missionSearch, setMissionSearch] = useState('');
  const [missionLevel, setMissionLevel] = useState('ทุกระดับ');
  const [missionType, setMissionType] = useState('ทุกประเภท');
  const [payloads, setPayloads] = useState<Record<string, { L: number; R: number }>>({});
  const [canReload, setCanReload] = useState(true);
  const [loadDraft, setLoadDraft] = useState({ L: '20', R: '20' });
  const loadCount = { L: Number(loadDraft.L) || 0, R: Number(loadDraft.R) || 0 };
  const payloadPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    const open = (event: KeyboardEvent) => {
      if (!event.shiftKey || event.code !== 'KeyS' || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (!payloadPanel.current) return;
      event.preventDefault(); event.stopImmediatePropagation();
      window.dispatchEvent(new Event('simulator:prepare-drone'));
      if (document.pointerLockElement) document.exitPointerLock();
      payloadPanel.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      payloadPanel.current.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus({ preventScroll: true });
    };
    window.addEventListener('keydown', open, true);
    return () => window.removeEventListener('keydown', open, true);
  }, []);
  /** คะแนนสูงสุดต่อด่านที่เคยบินจบโดยไม่พัง เก็บในเครื่องนี้ */
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [workspaceReady, setWorkspaceReady] = useState(signedIn);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const latestWorkspace = useRef<{ ready: boolean; data: SimulatorWorkspaceData }>({ ready: workspaceReady, data: { slug, drafts, style: styleSel, editorMode, blockPrograms } });
  latestWorkspace.current = { ready: workspaceReady, data: { slug, drafts, style: styleSel, editorMode, blockPrograms } };
  const sc = scenarios.find((s) => s.slug === slug) ?? scenarios[0];
  const code = drafts[sc.slug] ?? sc.starter;
  const edited = code !== sc.starter;
  const ev = season.events.find((e) => e.id === sc.config.event)!;
  const style: Style = styleSel;
  const commands = useMemo(() => commandsFor(style), [style]);
  const payload = payloads[sc.slug] ?? { L: 0, R: 0 };
  const config = useMemo(() => ({ ...buildScenarioConfig(sc.config), style, initialPayload: payload }), [sc, style, payload]);
  const converted = useMemo(() => convertStyle(code, style), [code, style]);
  const scene = useMemo(() => (sc.config.pattern !== 'standard' || sc.config.objects.length || sc.config.start ? { pattern: sc.config.pattern, objects: sc.config.objects, start: sc.config.start, base: sc.config.base } : undefined), [sc]);
  const max = maxScore(sc.config);
  const pat = PATTERNS.find((p) => p.id === sc.config.pattern);

  useEffect(() => {
    if (signedIn) return;
    try {
      const saved = readWorkspace(JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? 'null'));
      if (saved) {
        setDrafts(saved.drafts);
        setStyleSel(saved.style);
        setEditorMode(saved.editorMode);
        setBlockPrograms(saved.blockPrograms);
        const target = hasLink ? initial.slug : scenarios.some(item => item.slug === saved.slug) ? saved.slug : initial.slug;
        if (!hasLink) setSlug(target);
        if (saved.editorMode === 'blocks') {
          setBlockProgram(saved.blockPrograms[target] ?? parseBlockProgram(saved.drafts[target] ?? scenarios.find(item => item.slug === target)?.starter ?? '').program);
          setBlockProgramSlug(target);
        }
      } else {
        const style = localStorage.getItem(STYLE_KEY);
        if (style === 'full' || style === 'any' || style === 'drone' || style === 'parduino') setStyleSel(style);
      }
    } catch { /* storage may be disabled */ }
    setWorkspaceReady(true);
  }, [signedIn]);
  // กลับมาใหม่: ถ้าไม่ได้เข้าด้วยลิงก์ด่านเฉพาะ ให้ต่อจากด่านที่เล่นล่าสุด
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(DONE_KEY) ?? '{}');
      if (saved && typeof saved === 'object') setProgress(saved as Record<string, number>);
      const last = localStorage.getItem(LAST_KEY);
      if (!signedIn && !hasLink && !localStorage.getItem(WORKSPACE_STORAGE_KEY) && last && last !== initial.slug && scenarios.some((s) => s.slug === last)) setSlug(last);
    } catch { /* ไม่มี storage ก็เริ่มที่ด่านง่าย */ }
  }, []);
  useEffect(() => {
    if (!workspaceReady) return;
    const data = latestWorkspace.current.data;
    try { localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(data)); } catch { /* storage may be disabled */ }
    if (!signedIn) { setSaveStatus('saved'); return; }
    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/simulator/workspace', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        setSaveStatus(response.ok ? 'saved' : 'error');
      } catch { setSaveStatus('error'); }
    }, 600);
    return () => clearTimeout(timer);
  }, [workspaceReady, signedIn, slug, drafts, styleSel, editorMode, blockPrograms]);
  useEffect(() => {
    if (!signedIn) return;
    const flush = () => {
      if (!latestWorkspace.current.ready) return;
      void fetch('/api/simulator/workspace', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(latestWorkspace.current.data), keepalive: true });
    };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, [signedIn]);
  const saveNow = async () => {
    if (!latestWorkspace.current.ready || saveStatus === 'saving') return;
    setSaveStatus('saving');
    const data = latestWorkspace.current.data;
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(data));
      if (signedIn) {
        const response = await fetch('/api/simulator/workspace', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!response.ok) throw new Error('workspace save failed');
      }
      setSaveStatus('saved');
    } catch { setSaveStatus('error'); }
  };
  const chooseStyle = (v: Style) => { setStyleSel(v); if (v !== 'any') setCode(convertStyle(code, v)); try { localStorage.setItem(STYLE_KEY, v); } catch { /* ไม่เป็นไร */ } };

  useEffect(() => { document.title = 'ตัวจำลองการบิน · ชมรมโดรน ลือคำหาญฯ'; }, []);

  const onFinish = useCallback((result: Result) => {
    setPayloads((current) => ({ ...current, [sc.slug]: result.payloadRemaining }));
    setCanReload(result.landedOnPad);
    if (!result.events.some((event) => event.kind === 'error')) {
      setProgress((current) => {
        const next = { ...current, [sc.slug]: Math.max(current[sc.slug] ?? 0, result.score) };
        try { localStorage.setItem(DONE_KEY, JSON.stringify(next)); } catch { /* ไม่เป็นไร */ }
        return next;
      });
    }
  }, [sc.slug]);
  const onFlightResult = useCallback((result: Result | null) => { if (!result) setCanReload(true); }, []);

  const commitPick = (s: string) => {
    setSlug(s); setPanel(null);
    setCanReload(true);
    try { localStorage.setItem(LAST_KEY, s); } catch { /* ไม่เป็นไร */ }
    const u = new URL(window.location.href);
    u.searchParams.set('tab', s); u.searchParams.delete('p'); u.searchParams.delete('mode');
    window.history.replaceState(null, '', u);
  };
  const setCode = (v: string) => setDrafts((d) => ({ ...d, [sc.slug]: v }));
  const useBlockProgram = (targetSlug: string, program: BlockProgram, skipped: number) => {
    setBlockProgram(program);
    setBlockPrograms(current => ({ ...current, [targetSlug]: program }));
    setBlockProgramSlug(targetSlug);
    setBlockSkipped(skipped);
    setDrafts((current) => ({ ...current, [targetSlug]: convertStyle(generateBlockProgram(program), style) }));
    setEditorMode('blocks');
    setPendingBlockImport(null);
    if (targetSlug !== slug) commitPick(targetSlug);
  };
  const pick = (s: string) => {
    if (editorMode === 'blocks') {
      const target = scenarios.find((scenario) => scenario.slug === s);
      if (target) {
        const savedProgram = blockPrograms[s];
        if (savedProgram) { useBlockProgram(s, savedProgram, 0); return; }
        const imported = parseBlockProgram(drafts[s] ?? target.starter);
        if (imported.skipped) {
          setPendingBlockImport({ slug: s, ...imported });
          setPanel(null);
          return;
        }
        useBlockProgram(s, imported.program, 0);
        return;
      }
    }
    commitPick(s);
  };
  const enterBlocks = () => {
    const imported = parseBlockProgram(code);
    if (imported.skipped) setPendingBlockImport({ slug: sc.slug, ...imported });
    else useBlockProgram(sc.slug, imported.program, 0);
  };
  const resetCode = () => {
    setDrafts((d) => { const n = { ...d }; delete n[sc.slug]; return n; });
    if (editorMode === 'blocks') {
      const imported = parseBlockProgram(sc.starter);
      setBlockProgram(imported.program);
      setBlockProgramSlug(sc.slug);
      setBlockSkipped(imported.skipped);
      setBlockRevision((revision) => revision + 1);
      setBlockPrograms(current => { const next = { ...current }; delete next[sc.slug]; return next; });
    }
  };
  const onBlockProgramChange = (program: BlockProgram) => {
    setBlockProgram(program);
    setBlockPrograms(current => ({ ...current, [blockProgramSlug]: program }));
    setDrafts((current) => ({ ...current, [blockProgramSlug]: convertStyle(generateBlockProgram(program), style) }));
  };

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
    <main className="flex min-h-svh w-full min-w-0 flex-col pt-[4.75rem] xl:h-svh xl:overflow-hidden">
      <header className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-2 sm:flex sm:flex-wrap sm:gap-3 sm:px-6">
        <div className="min-w-0 flex-1"><h1 className="text-base font-extrabold sm:text-2xl">สนามฝึกการบินโดรน</h1><p className="hidden text-sm text-muted-foreground lg:block">วางแผนคำสั่ง ดูเส้นทางจริง แล้วเรียนรู้จากสิ่งที่คลาดเคลื่อน</p></div>
        {qs.get('lesson') !== '1' && <Button variant="outline" className="min-h-10 px-2 sm:px-4" data-sim-guide aria-label="วิธีใช้"><CircleHelp className="size-4" /><span className="hidden sm:inline">วิธีใช้</span></Button>}
        <Button type="button" variant="outline" className="min-h-10 px-2 sm:px-4" disabled={!workspaceReady || saveStatus === 'saving'} onClick={saveNow}><Save className="size-4" />{saveStatus === 'saving' ? 'กำลังเซฟ' : 'เซฟ'}</Button>
        <span role="status" className="col-span-2 min-w-0 text-xs text-muted-foreground sm:order-none sm:w-auto">{saveStatus === 'saving' ? 'กำลังบันทึก…' : saveStatus === 'saved' ? signedIn ? 'บันทึกในบัญชีแล้ว' : 'บันทึกในเครื่องแล้ว' : saveStatus === 'error' ? 'บันทึกไม่สำเร็จ กดเซฟอีกครั้ง' : ''}</span>
        <Button className="col-start-3 row-start-2 min-h-10 whitespace-nowrap" data-tour="sim-pick" onClick={() => setPanel('pick')}><BookOpen className="size-4" /> เลือกภารกิจ</Button>
      </header>
      <div className="grid w-full min-w-0 flex-1 auto-rows-max grid-cols-1 gap-3 p-3 sm:p-4 xl:min-h-0 xl:auto-rows-[minmax(0,1fr)] xl:overflow-hidden xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section data-tour="sim-stage" aria-label="สนามจำลอง" className="order-1 grid min-h-0 min-w-0 grid-cols-1 content-start gap-2 xl:order-2 xl:grid-rows-[auto_auto_auto] xl:overflow-y-auto">
          <div className="min-w-0 squircle-2xl border border-line bg-surface">
            <div className="flex min-w-0 items-center gap-2 px-3 py-2">
            <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-extrabold sm:text-base">{sc.title}</h2><p className="truncate text-xs text-muted-foreground">{sc.level} · {pat?.label}</p>{!briefOpen && <p className="rich mt-0.5 line-clamp-2 text-xs leading-5" dangerouslySetInnerHTML={{ __html: objectiveOf(sc.briefHtml) }} />}</div>
              <Button size="sm" variant="outline" className="min-h-9" data-tour="sim-brief-toggle" aria-expanded={briefOpen} aria-controls="sim-mission-brief" onClick={() => setBriefOpen(!briefOpen)}>
                <ChevronDown className={`size-4 transition-transform motion-reduce:transition-none ${briefOpen ? 'rotate-180' : ''}`} />
                {briefOpen ? 'ซ่อนโจทย์' : 'อ่านโจทย์'}
              </Button>
            </div>
            <div id="sim-mission-brief" inert={!briefOpen} className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${briefOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="min-h-0 overflow-hidden">
                <div className="rich border-t border-line px-3 py-3 text-sm leading-6 xl:max-h-[25svh] xl:overflow-y-auto" dangerouslySetInnerHTML={{ __html: sc.briefHtml }} />
                {sc.config.objects.filter((object) => object.type === 'waypoint').length > 1 && <p className="border-t border-line px-3 py-2 text-xs text-muted-foreground">เลขบนจุดใช้ดูตำแหน่งในสนาม เลือกผ่านจุดไหนก่อนก็ได้ ขอให้ผ่านครบตามโจทย์</p>}
              </div>
            </div>
          </div>
          <div data-tour="sim-stage-canvas" className="min-w-0 squircle-3xl border border-line bg-surface p-2 sm:p-3">
            <FlightRunner event={ev} code={code} config={config} scene={scene} maxPoints={max} bigPlay={false} fullHeightField onResult={onFlightResult} onCommandProgress={setActiveBlockCommand} onStart={() => setCanReload(false)} onFinish={onFinish} />
          </div>
          {sc.config.requiresPayload && <section ref={payloadPanel} className="grid gap-2 squircle-2xl border border-line bg-surface p-3" aria-label="เตรียมโดรน" aria-keyshortcuts="Shift+S">
            <div className="flex flex-wrap items-center gap-2"><h2 className="mr-auto text-sm font-bold">เตรียมโดรน · Shift+S</h2>{sc.config.requiresPayload && <span className="text-xs text-muted-foreground">บอล ซ้าย {payload.L}/20 · ขวา {payload.R}/20</span>}{sc.config.requiresPayload && <Button size="sm" variant="outline" className="min-h-9" onClick={reloadPayload} disabled={!canReload || (payload.L === loadCount.L && payload.R === loadCount.R)} title={!canReload ? 'ต้องกลับมาลงบนฐานก่อน' : undefined}>{`ใส่บอล ${loadCount.L + loadCount.R} ลูก`}</Button>}</div>
            {!canReload ? <p className="text-xs text-muted-foreground">เติมบอลได้เมื่อโดรนลงบนฐานแล้ว</p> : payload.L === loadCount.L && payload.R === loadCount.R ? <p className="text-xs text-muted-foreground">ใส่บอลตามจำนวนที่เลือกแล้ว พร้อมบิน</p> : <p className="text-xs text-muted-foreground">ถ้าโจทย์ให้ปล่อยบอล ให้เติมก่อนกด KEY</p>}
          <div className="flex flex-wrap gap-3">
              {(['L', 'R'] as const).map(side => <label key={side} className="flex items-center gap-2 text-sm">เติมฝั่ง{side === 'L' ? 'ซ้าย' : 'ขวา'}
                <input aria-label={`จำนวนบอลฝั่ง${side === 'L' ? 'ซ้าย' : 'ขวา'}`} type="number" min={0} max={20} step={1} disabled={!canReload} value={loadDraft[side]} onFocus={e => e.currentTarget.select()} onChange={e => { const raw = e.target.value; setLoadDraft(c => ({ ...c, [side]: raw === '' ? '' : String(Math.max(0, Math.min(20, Math.trunc(Number(raw) || 0)))) })); }} className="h-9 w-16 squircle-xl border border-line bg-surface px-2" /> ลูก
              </label>)}
            </div>
            {sc.config.objects.filter((o): o is Extract<SceneObject, { type: 'platform' }> => o.type === 'platform').map(o => <p key={o.id} className="text-xs text-muted-foreground">{o.id}: ต้องใส่ {o.requiredBalls ?? 20} ลูก</p>)}
          </section>}
        </section>
        <aside className="order-2 grid min-h-0 min-w-0 content-start gap-2 xl:order-1 xl:grid-rows-[minmax(0,1fr)] xl:overflow-hidden xl:pr-1">
          <section className="grid min-h-[28rem] min-w-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden squircle-3xl border border-line bg-surface xl:min-h-0" data-tour="sim-code" aria-label="โค้ดภารกิจ">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
              <div className="min-w-0 flex-1"><h2 className="font-bold">เขียนโค้ดภารกิจ</h2><p className="text-xs text-muted-foreground">เขียนฟังก์ชัน → ผูก KEY → กดปุ่มใต้สนาม</p></div>
              <Button className="min-h-10" data-sim-course>ฝึกเขียนโค้ด</Button>
              <KeyExamplePopover />
            </div>
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2 px-3 py-2">
        <div role="tablist" aria-label="รูปแบบการเขียนโปรแกรม" className="flex items-center gap-1 squircle-xl border border-line bg-surface p-1">
          <button type="button" role="tab" aria-selected={editorMode === 'blocks'} onClick={enterBlocks} className={`inline-flex h-8 items-center gap-1.5 squircle-lg px-3 text-sm font-semibold transition-colors ${editorMode === 'blocks' ? 'bg-brand-blue text-background' : 'hover:bg-surface-2'}`}><Blocks className="size-4" /> บล็อก</button>
          <button type="button" role="tab" aria-selected={editorMode === 'cpp'} onClick={() => setEditorMode('cpp')} className={`inline-flex h-8 items-center gap-1.5 squircle-lg px-3 text-sm font-semibold transition-colors ${editorMode === 'cpp' ? 'bg-brand-blue text-background' : 'hover:bg-surface-2'}`}><Braces className="size-4" /> C++</button>
        </div>
        {editorMode === 'cpp' && (
          <Popover>
            <PopoverTrigger render={<Button variant="outline" className="min-h-9" data-tour="sim-style" />}>ชื่อคำสั่ง: {STYLES.find((x) => x.id === style)?.label}</PopoverTrigger>
            <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] p-3">
              <p className="text-sm font-semibold">รูปแบบชื่อคำสั่ง</p>
              <p className="mb-2 mt-1 text-xs leading-5 text-muted-foreground">ตัวอย่างโจทย์ใช้ชื่อเต็ม (`take_off()`) ไม่ต้องเปลี่ยนถ้าเขียนตามโจทย์ ที่เหลือเป็นชื่อสั้นหรือรูปแบบของ Arduino ใช้เมื่อโค้ดจากที่อื่นเขียนไว้อีกแบบ พอเลือกรูปแบบใหม่ โค้ดที่เขียนไว้จะถูกแปลงชื่อคำสั่งให้ทันที</p>
              <div role="group" aria-label="แบบการเขียนโค้ด" className="flex flex-wrap items-center gap-1 squircle-xl border border-line bg-surface p-1">
                {STYLES.map((x) => <button key={x.id} type="button" aria-pressed={style === x.id} onClick={() => chooseStyle(x.id)} title={x.hint} className={"h-9 squircle-xl px-2.5 font-mono text-sm font-semibold transition-colors " + (style === x.id ? "bg-brand-blue text-background" : "hover:bg-surface-2")}>{x.label}</button>)}
              </div>
            </PopoverContent>
          </Popover>
        )}
        {editorMode === 'cpp' && style !== 'any' && converted !== code && <Button variant="outline" className="min-h-9" onClick={() => setCode(converted)}>แปลงชื่อคำสั่ง</Button>}
        {edited && <Button variant="outline" onClick={resetCode}><RotateCcw className="size-4" /> คืนโค้ดตั้งต้น</Button>}
            </div>
            {editorMode === 'cpp'
              ? <div data-sim-editor className="grid min-h-0 min-w-0"><CodeEditor value={code} onChange={setCode} label="โค้ดภารกิจ" fill commands={commands} showQuick={false} /></div>
              : blockProgram && blockProgramSlug === sc.slug
                ? <div className={`grid min-h-0 min-w-0 ${blockSkipped > 0 ? 'grid-rows-[auto_minmax(0,1fr)]' : 'grid-rows-[minmax(0,1fr)]'}`}>
                    {blockSkipped > 0 && <p role="status" className="border-b border-line bg-emphasis px-3 py-2 text-xs text-emphasis-foreground">นำเข้าเป็นบล็อกแล้ว ข้าม {blockSkipped} ส่วนที่ไม่มีบล็อกรองรับ โค้ด C++ ส่วนนั้นไม่ได้อยู่ในโปรแกรมบล็อก</p>}
                    <BlockProgramEditor key={`${sc.slug}-${blockRevision}`} program={blockProgram} activeCommand={activeBlockCommand} onChange={onBlockProgramChange} />
                  </div>
                : <div className="grid min-h-[26rem] place-items-center text-sm text-muted-foreground">กำลังเตรียมโปรแกรมบล็อก…</div>}
          </section>

        </aside>
        {/* จอแคบ: สนามกับโค้ดเรียงต่อกัน ปุ่มนี้พาไปมาระหว่างสองส่วนได้ในแตะเดียว */}
        <div className="pointer-events-none sticky bottom-0 z-20 order-3 flex justify-center pb-1 xl:hidden">
          <div className="pointer-events-auto flex gap-1 squircle-2xl border border-line bg-surface/95 p-1 shadow-lg backdrop-blur">
            <Button size="sm" variant="ghost" className="min-h-10" onClick={() => document.querySelector('[data-tour="sim-stage"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>สนามจำลอง</Button>
            <Button size="sm" variant="ghost" className="min-h-10" onClick={() => document.querySelector('[data-tour="sim-code"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>เขียนโค้ด</Button>
          </div>
        </div>
      </div>
      {qs.get('lesson') !== '1' && <Tour id="simulator-guide-v2" steps={SIM_TOUR} autoOpenImmediately trigger="[data-sim-guide]" allowTargetInteraction paused={panel === 'pick'} />}
      <Tour id="sim-code-course" steps={CODE_COURSE} forceQuery="lesson" autoOpenImmediately startOnFocus="[data-sim-editor] textarea" trigger="[data-sim-course]" allowTargetInteraction />
      <Dialog open={!!pendingBlockImport} onOpenChange={(open) => { if (!open) setPendingBlockImport(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>มีโค้ดบางส่วนที่แปลงเป็นบล็อกไม่ได้</DialogTitle>
            <DialogDescription>
              พบ {pendingBlockImport?.skipped ?? 0} ส่วนที่ยังไม่มีบล็อกตรงกัน หากไปต่อ ส่วนเหล่านี้จะไม่อยู่ใน workspace และโค้ดจะถูกสร้างใหม่จากบล็อก
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingBlockImport(null)}>กลับไปใช้ C++</Button>
            <Button onClick={() => {
              if (!pendingBlockImport) return;
              useBlockProgram(pendingBlockImport.slug, pendingBlockImport.program, pendingBlockImport.skipped);
            }}>ข้ามส่วนที่แปลงไม่ได้</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={panel === 'pick'} onOpenChange={(open) => setPanel(open ? 'pick' : null)}>
        <DialogContent className="max-h-[90svh] w-[96vw] gap-4 overflow-y-auto p-4 sm:max-w-5xl sm:p-6">
          <DialogHeader><DialogTitle className="font-display text-2xl font-extrabold">เลือกภารกิจ</DialogTitle><DialogDescription>เพิ่งเริ่มเขียนโค้ด ให้เริ่มจาก 6 ด่านแรกด้านล่าง หรือค้นหาและกรองจากทั้งหมด กดการ์ดหนึ่งครั้งเพื่อเลือก</DialogDescription></DialogHeader>
          <section className="flex flex-wrap items-center gap-2 squircle-2xl border border-line bg-surface-2 px-3 py-2" aria-label="ภารกิจที่เลือกอยู่">
            <p className="min-w-0 flex-1 text-sm"><span className="text-muted-foreground">กำลังใช้ </span><b>{sc.title}</b> · {sc.level}<span className="block text-xs text-muted-foreground">{pat?.label} · {ev.short}{max !== null ? ` · คะแนนเต็ม ${max}` : ''}{sc.config.pattern === 'grid5' ? ' · ฐาน C3 · 1 ช่อง = 1 เมตร' : ''}</span></p>
            <Button size="sm" className="min-h-9" onClick={() => setPanel(null)}>ใช้ด่านนี้ต่อ</Button>
          </section>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input value={missionSearch} onChange={(e) => setMissionSearch(e.target.value)} placeholder="ค้นหาด่าน..." aria-label="ค้นหาภารกิจ" className="h-10 min-w-0 squircle-xl border border-line bg-canvas px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-blue" />
            <select aria-label="กรองตามระดับ" value={missionLevel} onChange={(e) => setMissionLevel(e.target.value)} className="h-10 squircle-xl border border-line bg-canvas px-3 text-sm"><option>ทุกระดับ</option>{LEVELS.map((level) => <option key={level}>{level}</option>)}</select>
            <select aria-label="กรองตามชนิดภารกิจ" value={missionType} onChange={(e) => setMissionType(e.target.value)} className="h-10 squircle-xl border border-line bg-canvas px-3 text-sm"><option>ทุกประเภท</option>{categories.map((type) => <option key={type} value={type}>{typeLabel[type] ?? type}</option>)}</select>
          </div>
          {(() => {
            const card = (s: ScenarioView, n?: number) => {
              const selected = slug === s.slug;
              const best = progress[s.slug];
              return <button key={s.slug} type="button" aria-pressed={selected} onClick={() => pick(s.slug)} className={'grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-center gap-2 squircle-2xl border p-2 text-left ' + (selected ? 'border-brand-blue bg-brand-blue/5' : 'border-line bg-surface hover:border-brand-blue hover:bg-surface-2')}>
                <ScenePreview config={s.config} className="size-12 squircle-xl" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{n ? `${n}. ` : ''}{s.title}</span>
                  <span className={'mt-1 inline-block squircle-xl px-2 py-0.5 text-xs font-medium ' + (LEVEL_TONE[s.level] ?? 'bg-surface-2 text-foreground')}>{s.level}</span>
                  <span className="rich mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground" dangerouslySetInnerHTML={{ __html: objectiveOf(s.briefHtml) }} />
                  <span className="mt-2 flex flex-wrap items-center justify-between gap-x-2 text-xs"><span className="font-semibold text-brand-blue">{selected ? 'กำลังใช้งาน' : 'เลือกด่านนี้ →'}</span>{best !== undefined && <span className="text-muted-foreground">✓ บินแล้ว{best > 0 ? ` · ${best} คะแนน` : ''}</span>}</span>
                </span>
              </button>;
            };
            const startList = START_HERE.map((id) => scenarios.find((s) => s.slug === id)).filter((s): s is ScenarioView => !!s);
            const showStart = !missionSearch && missionLevel === 'ทุกระดับ' && missionType === 'ทุกประเภท' && startList.length > 0;
            const rest = showStart ? filteredScenarios.filter((s) => !START_HERE.includes(s.slug)) : filteredScenarios;
            return <>
              {showStart && <section aria-label="เริ่มจากตรงนี้"><h3 className="mb-2 text-sm font-bold">เริ่มจากตรงนี้ · เรียงจากง่ายไปยาก</h3><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{startList.map((s, i) => card(s, i + 1))}</div></section>}
              <p className="text-sm text-muted-foreground">{showStart ? `ภารกิจอื่น ๆ ${rest.length} ด่าน` : `พบ ${filteredScenarios.length} ภารกิจ`} · กดการ์ดหนึ่งครั้งเพื่อเลือก</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{rest.map((s) => card(s))}</div>
            </>;
          })()}
        </DialogContent>
      </Dialog>
    </main>
  );
}
