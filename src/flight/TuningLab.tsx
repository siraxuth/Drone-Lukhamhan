'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CodeEditor } from '@/components/CodeEditor';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { commandsFor } from './commands';
import { simulate, type FlightConfig, type Result } from './engine';
import { parse } from './parser';
import {
  countsFor, DEFAULT_GATE, PAYLOAD_CHANNELS, servoDegreeToPulse,
  type GatePositions, type Payload, type PayloadChannel,
} from './payload';

const ServoBenchView = dynamic(() => import('./ServoBenchView'), { ssr: false });
const commands = commandsFor('full');
const benchPayload = { L: 20, R: 20 };
const TUNING_DRAFT = 'sim-tuning-sketch-v1';
const SAMPLE = `// Servo.ino · ตำแหน่งแผ่นปิดและจังหวะปล่อย
// Servo_Degree.ino · ตัวช่วยแปลงองศาเป็นพัลส์จำลอง
void tunePayload() {
  const int CLOSED = 10;
  const int OPEN = 120;
  const int MS_PER_BALL = 80;
  const int WAIT_MS = 400;

  servo_config(1, CLOSED, OPEN);
  servo_config(4, CLOSED, OPEN);
  servo_rate(MS_PER_BALL);

  // เปิด CH1 และ CH4 พร้อมกัน
  servo_write_pair(1, OPEN, 4, OPEN);
  // อีกวิธี: servo_pulse(1, servo_degree_to_pulse(OPEN));
  delay(WAIT_MS);
  servo_write_pair(1, CLOSED, 4, CLOSED);
}
`;

const PULSE_SAMPLE = `// Servo_Degree.ino · ลองเปลี่ยนช่วงพัลส์และมุมที่ส่ง
void writeDegrees(int channel, int degrees, int pulseMin, int pulseMax) {
  if (degrees < 0) { degrees = 0; }
  if (degrees > 180) { degrees = 180; }
  const int pulse = pulseMin + degrees * (pulseMax - pulseMin) / 180;
  servo_pulse(channel, pulse, pulseMin, pulseMax);
}

void runMission() {
  const int CHANNEL = 1;
  const int CLOSED = 0;
  const int OPEN = 110;
  const int MIN_US = 490;
  const int MAX_US = 2550;

  servo_config(CHANNEL, CLOSED, OPEN);
  writeDegrees(CHANNEL, OPEN, MIN_US, MAX_US);
  delay(400);
  writeDegrees(CHANNEL, CLOSED, MIN_US, MAX_US);
}
`;

const FLIGHT_SAMPLE = `// เค้าโครงแบบ protocol.hpp · ตัวคูณใช้ในสนามจำลอง
void runMission() {
  const float DISTANCE = 1.0;
  const float HEIGHT = 1.0;
  const int HOLD_MS = 1200;

  flight_config(DISTANCE, HEIGHT, HOLD_MS);
  calibration();
  delay(3000);
  take_off();
  delay(3000);
  set_height(60);
  poshold();
  auto_land();
}
`;

function average(results: Result[], read: (result: Result) => number) {
  return results.reduce((sum, result) => sum + read(result), 0) / results.length;
}

function meanHeight(result: Result) {
  let total = 0;
  const start = result.events.find(event => event.kind === 'takeoff')?.t;
  const end = result.events.findLast(event => event.kind === 'land')?.t ?? result.duration;
  if (start === undefined || end <= start) return 0;
  let time = 0;
  for (let i = 1; i < result.frames.length; i++) {
    const from = result.frames[i - 1], to = result.frames[i];
    const first = Math.max(start, from.t), last = Math.min(end, to.t);
    const dt = last - first;
    if (dt <= 0) continue;
    const slope = (to.z - from.z) / (to.t - from.t);
    total += (from.z + (first + last - 2 * from.t) * slope / 2) * dt;
    time += dt;
  }
  return time ? total / time : 0;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: FlightConfig;
  mission: string;
  onApply: (code: string) => void;
};

export function TuningLab({ open, onOpenChange, config, mission, onApply }: Props) {
  const [sketch, setSketch] = useState(SAMPLE);
  const [tab, setTab] = useState<'servo' | 'flight'>('servo');
  const [channel, setChannel] = useState<PayloadChannel>(1);
  const [angles, setAngles] = useState<GatePositions>({});
  const [gatePositions, setGatePositions] = useState<GatePositions>({});
  const [loaded, setLoaded] = useState<Payload>(benchPayload);
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [flightCount, setFlightCount] = useState(5);
  const [flightKey, setFlightKey] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [notice, setNotice] = useState('');
  const timers = useRef<number[]>([]);
  const keys = useMemo(() => parse(sketch, 'any').keyBindings, [sketch]);
  const angle = angles[channel] ?? DEFAULT_GATE.closed;
  const selectedKey = keys.some(key => key.key === flightKey) ? flightKey! : keys[0]?.key;

  function stop() {
    timers.current.forEach(timer => window.clearTimeout(timer));
    timers.current = [];
    setRunning(false);
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TUNING_DRAFT);
      if (saved !== null) setSketch(saved);
    } catch { /* storage may be unavailable */ }
    return () => timers.current.forEach(timer => window.clearTimeout(timer));
  }, []);

  function setDraft(code: string) {
    setSketch(code);
    try { localStorage.setItem(TUNING_DRAFT, code); } catch { /* storage may be unavailable */ }
    setResults([]);
    setNotice('');
  }

  function previewAngle(next: number) {
    stop();
    setAngles(state => ({ ...state, [channel]: next }));
    setGatePositions(state => ({ ...state, [channel]: Math.min(1, next / DEFAULT_GATE.open) }));
  }

  function runServo() {
    stop();
    setNotice('');
    setLoaded(benchPayload);
    setAngles({});
    setGatePositions({});
    setLog([]);
    const result = simulate(sketch, { ...config, initialPayload: benchPayload, servoBench: true, style: 'any' }, 0, selectedKey);
    const errors = result.events.filter(event => event.kind === 'error');
    if (errors.length) {
      setLog(errors.map(event => event.text));
      return;
    }
    const events = result.events.filter(event => event.kind === 'servo' || event.kind === 'drop');
    if (!events.length) {
      setLog(['สเก็ตช์นี้ยังไม่ได้ขยับชุดปล่อย ลองเรียก servo_write(1, 110);']);
      return;
    }
    setRunning(true);
    for (const event of events) timers.current.push(window.setTimeout(() => {
      if (event.gatePositions) setGatePositions(event.gatePositions);
      if (event.gateDegrees) setAngles(event.gateDegrees);
      if (event.payload) setLoaded(event.payload);
      setLog(lines => [...lines.slice(-11), `${(event.t / 1000).toFixed(2)} s · ${event.text}`]);
    }, event.t));
    timers.current.push(window.setTimeout(stop, result.duration + 200));
  }

  function runTrials() {
    const runs = Array.from({ length: flightCount }, (_, index) => simulate(
      sketch, { ...config, style: 'any' }, index + 1, selectedKey,
    ));
    setResults(runs);
  }

  function appendSketch() {
    const names = (text: string) => [...text.matchAll(/\bvoid\s+(\w+)\s*\(/g)].map(match => match[1]);
    const helpers = names(sketch);
    const duplicate = helpers.find(name => names(mission).includes(name) || name === 'setup' || name === 'loop');
    if (!helpers.length || duplicate) {
      setNotice(duplicate ? `ฟังก์ชัน ${duplicate}() มีชื่อซ้ำหรือเป็นจุดเริ่มต้นของสเก็ตช์ ลองเปลี่ยนชื่อก่อนเพิ่ม` : 'เขียน void ชื่อฟังก์ชัน() { … } ก่อนเพิ่มเข้าโค้ดภารกิจ');
      return;
    }
    stop();
    onApply(`${mission.trimEnd()}\n\n${sketch.trim()}\n`);
  }

  const close = (next: boolean) => {
    if (!next) stop();
    onOpenChange(next);
  };
  const visibleCount = Math.ceil(countsFor(loaded)[channel] / 2);
  const error = results.flatMap(result => result.events).find(event => event.kind === 'error');
  const hasFlight = results.some(result => result.events.some(event => event.kind === 'takeoff'));

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90dvh] w-[min(71rem,calc(100vw-2rem))] max-w-none overflow-auto squircle-3xl border border-line bg-surface sm:max-w-none"
        onKeyDown={event => event.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>ปรับจูน Simulator</DialogTitle>
          <DialogDescription>แก้ค่าและฟังก์ชันในสเก็ตช์ของตัวเอง แล้วทดสอบกับชุดปล่อยหรือเที่ยวบินจำลอง ชื่อไฟล์อ้างอิงจาก <a href="/docs/arduino/project-structure" className="font-semibold underline">โครงสร้างโปรเจกต์ Arduino</a></DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button variant={tab === 'servo' ? 'default' : 'outline'} aria-pressed={tab === 'servo'} onClick={() => setTab('servo')}>เซอร์โว</Button>
          <Button variant={tab === 'flight' ? 'default' : 'outline'} aria-pressed={tab === 'flight'} onClick={() => { stop(); setTab('flight'); }}>ทดสอบเที่ยวบิน</Button>
        </div>
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <section className="grid min-w-0 content-start gap-3" aria-label="สเก็ตช์ปรับจูน">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => { stop(); setDraft(SAMPLE); setTab('servo'); }}>ตัวอย่างชุดปล่อย</Button>
              <Button size="sm" variant="outline" onClick={() => { stop(); setDraft(PULSE_SAMPLE); setTab('servo'); }}>ตัวอย่างแปลงพัลส์</Button>
              <Button size="sm" variant="outline" onClick={() => { setDraft(FLIGHT_SAMPLE); stop(); setTab('flight'); }}>ตัวอย่างปรับการบิน</Button>
              <Button size="sm" variant="outline" onClick={() => { stop(); setDraft(mission); }}>คัดลอกโค้ดภารกิจมาทดลอง</Button>
            </div>
            <CodeEditor id="sim-tuning-sketch" label="สเก็ตช์ปรับจูน" rows={14} value={sketch} onChange={setDraft} commands={commands} showQuick={false} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={appendSketch}>เพิ่มฟังก์ชันในภารกิจ</Button>
              <Button variant="outline" onClick={() => { stop(); onApply(sketch); }}>ใช้สเก็ตช์นี้เป็นโค้ดภารกิจ</Button>
            </div>
            <p className="text-xs text-muted-foreground">ใช้ void ฟังก์ชัน ตัวแปรตัวเลข if/else และ for ได้ สเก็ตช์ที่ไม่มี setup() ใช้ฟังก์ชันไม่มีพารามิเตอร์ตัวแรกเป็น KEY 1 โดยเลือก runMission() ก่อนถ้ามี</p>
            {notice && <p role="alert" className="text-destructive">{notice}</p>}
          </section>
          <section className="order-first grid min-w-0 content-start gap-3 lg:order-none" aria-label={tab === 'servo' ? 'ทดสอบชุดปล่อย' : 'ผลการบินเฉลี่ย'}>
            {keys.length > 1 && <label className="flex items-center gap-2">ฟังก์ชันทดสอบ
              <select value={selectedKey ?? ''} onChange={event => setFlightKey(Number(event.target.value))} className="min-h-9 min-w-0 squircle-xl border border-line bg-surface px-2">
                {keys.map(key => <option key={key.key} value={key.key}>KEY {key.key} · {key.functionName}()</option>)}
              </select>
            </label>}
            {tab === 'servo' ? <>
              <ServoBenchView key={channel} count={visibleCount} opening={gatePositions[channel] ?? 0} />
              <div className="grid grid-cols-4 gap-1" aria-label="เลือกช่องเซอร์โว">
                {PAYLOAD_CHANNELS.map(value => <Button variant={value === channel ? 'default' : 'outline'} size="sm" key={value} aria-pressed={channel === value} onClick={() => setChannel(value)}>CH {value}</Button>)}
              </div>
              <label className="grid gap-1 text-sm">
                <span className="flex justify-between"><span>ลองขยับแผ่นปิดช่อง {channel}</span><span className="font-mono">{Number(angle.toFixed(1))}° · {servoDegreeToPulse(angle)} µs</span></span>
                <input type="range" min={0} max={180} value={angle} onChange={event => previewAngle(Number(event.target.value))} className="w-full accent-emphasis" />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={runServo}>{running ? 'เริ่มทดสอบใหม่' : 'รันสเก็ตช์ชุดปล่อย'}</Button>
                {running && <Button variant="outline" onClick={stop}>หยุด</Button>}
              </div>
              <ul aria-live="polite" className="max-h-32 overflow-auto font-mono text-xs leading-6 text-muted-foreground">
                {log.map((line, index) => <li key={index}>{line}</li>)}
              </ul>
            </> : <>
              <p className="text-sm text-muted-foreground">รันสเก็ตช์เดิมหลายครั้งในสนามนี้ โดยแต่ละเที่ยวใช้สภาพจำลองคนละชุด</p>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2">จำนวนเที่ยว
                  <select className="min-h-9 squircle-xl border border-line bg-surface px-2" value={flightCount} onChange={event => setFlightCount(Number(event.target.value))}>
                    {[3, 5, 10].map(n => <option key={n}>{n}</option>)}
                  </select>
                </label>
                <Button onClick={runTrials}>คำนวณค่าเฉลี่ย</Button>
              </div>
              {error && <p role="alert" className="text-destructive">{error.text}</p>}
              {results.length > 0 && !error && !hasFlight && <p role="status" className="text-muted-foreground">สเก็ตช์ยังไม่มีช่วงบิน ลองโหลดตัวอย่างปรับการบิน</p>}
              {hasFlight && !error && <dl className="grid grid-cols-2 gap-2" aria-live="polite">
                {[
                  ['เวลาจำลองเฉลี่ย', `${(average(results, result => result.duration) / 1000).toFixed(2)} s`],
                  ['ความสูงเฉลี่ยขณะบิน', `${average(results, meanHeight).toFixed(1)} cm`],
                  ['ระยะจากจุดเริ่มถึงจุดสุดท้ายเฉลี่ย', `${average(results, result => Math.hypot(result.finalPosition.x - result.frames[0].x, result.finalPosition.y - result.frames[0].y)).toFixed(1)} cm`],
                  ['ลงจอดสำเร็จ', `${results.filter(result => result.landedOnPad).length} / ${results.length}`],
                ].map(([label, value]) => <div key={label} className="grid gap-2 squircle-2xl border border-line bg-surface-2 p-3">
                  <dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-mono text-lg font-semibold tabular-nums">{value}</dd>
                </div>)}
              </dl>}
            </>}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
