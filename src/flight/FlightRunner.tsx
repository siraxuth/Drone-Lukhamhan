'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NO_MARKS, type CompetitorAct, type LivePose, type Marks, type ShotHighlight, type ViewPreset } from '@/field/Field3D';
import { FieldPlan2D } from '@/field/FieldPlan2D';
import type { RuleEvent } from '@/rules/types';
import { detectQuality } from '@/scene/quality';
import { Eye, Layers, Pause, Play, RotateCcw, Video, Volume2, VolumeX } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildConfig, toField } from './config';
import { baseAt, startOf } from '@/lib/scenarios';
import type { FlightConfig } from './engine';
import type { SceneSpec } from '@/field/SceneObjects';
import { frameAt, simulate, type Result, type SimEvent } from './engine';
import { FlightAudio } from './sound';

const Field3D = dynamic(() => import('@/field/Field3D'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted-foreground">กำลังโหลดสนาม 3 มิติ…</div>,
});

/** ขาโดรนอยู่ต่ำกว่าจุดกึ่งกลางโมเดล 7.0 ซม. · แท่น Takeoff สูง 20 ซม. → โดรนจอดอยู่บนแท่น ไม่จมพื้น */
const LEG = 0.0702;
const PAD = 0.2;
const REST = PAD + LEG;
const VIEWS: Array<{ id: ViewPreset; label: string; Icon: typeof Eye }> = [
  { id: 'chase', label: 'ตามโดรน', Icon: Video },
  { id: 'top', label: 'มองจากบน', Icon: Layers },
  { id: 'operator', label: 'มุมคนแข่ง', Icon: Eye },
];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const fmtTime = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`;

type Props = {
  event: RuleEvent;
  code: string;
  /** ปุ่มเล่นใหญ่ตรงกลางสนามเมื่อยังไม่เคยเล่น */
  bigPlay?: boolean;
  onResult?: (r: Result | null) => void;
  /** เรียกเมื่อโดรนบินจบ (ใช้กับบทสอน) */
  onFinish?: (r: Result) => void;
  /** คำที่ใช้บนปุ่ม */
  playLabel?: string;
  /** โจทย์ฝึก: ตั้งค่าเอนจินและวัตถุบนสนามเอง (ไม่ใส่ = สนามแข่งจริงตามประเภท) */
  config?: FlightConfig;
  scene?: Pick<SceneSpec, 'pattern' | 'objects' | 'start' | 'base'>;
  /** คะแนนเต็มที่โชว์ (undefined = ตามกติกาของประเภท, null = ไม่โชว์คะแนนเต็ม) */
  maxPoints?: number | null;
};

/**
 * เครื่องเล่นการบินจำลอง: รันโค้ดผ่าน engine แล้วเล่นบนสนาม 3 มิติ พร้อมเสียง
 * ใช้ทั้งหน้า /field (เดโมโค้ดตัวอย่าง) และ /simulator (โค้ดที่ผู้ใช้เขียนเอง)
 */
export function FlightRunner({ event, code, bigPlay = true, onResult, onFinish, playLabel = 'เริ่มจำลองการบิน', config, scene, maxPoints }: Props) {
  const cfg = useMemo(() => config ?? buildConfig(event.id), [config, event.id]);
  // จุดวางโดรนตอนเริ่ม (ตามโจทย์) · สูงเท่าแท่น 20 ซม. ถ้าเริ่มบนฐาน ไม่งั้นเริ่มบนพื้น
  const { HOME, IDLE } = useMemo(() => {
    const st = scene ? startOf(scene) : { x: 0, y: 0, yaw: 0 };
    const pb = scene ? baseAt(scene) : { x: 0, y: 0 };
    const onBase = !!pb && Math.abs(pb.x - st.x) <= 0.75 && Math.abs(pb.y - st.y) <= 0.75;
    const alt = onBase ? REST : LEG;
    return { HOME: { x: st.x, y: st.y, yaw: st.yaw, alt }, IDLE: { x: st.x, y: st.y, alt, yaw: st.yaw, pitch: 0, roll: 0, spin: 0 } as LivePose };
  }, [scene]);
  const [result, setResult] = useState<Result | null>(null);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [done, setDone] = useState(false);
  const speed = 1; // เล่นด้วยความเร็วจริงเสมอ
  const [view, setView] = useState<ViewPreset>('chase');
  const [marks, setMarks] = useState<Marks>(NO_MARKS);
  const [highlight, setHighlight] = useState<ShotHighlight>(null);
  const [shotCallout, setShotCallout] = useState<{ id: number; ok: boolean; points: number; target?: string } | null>(null);
  const [popCallout, setPopCallout] = useState<{ id: number; points: number; target: string } | null>(null);
  const [dropCallout, setDropCallout] = useState<{ id: number; points: number; balls: number; target: string } | null>(null);
  const dropSequence = useRef(0);
  const [landingCallout, setLandingCallout] = useState<{ id: number; points: number; target: string } | null>(null);
  const [log, setLog] = useState<SimEvent[]>([]);
  const [muted, setMuted] = useState(false);
  const [mode, setMode] = useState<'pending' | '2d' | '3d'>('pending');
  const [low, setLow] = useState(true);
  const [pose2d, setPose2d] = useState(HOME);
  const [holdKey, setHoldKey] = useState(0);
  const [loaded, setLoaded] = useState({ L: 0, R: 0 });
  const actRef = useRef<CompetitorAct>({ mode: 'idle' });
  const [holding, setHolding] = useState(false);

  const poseRef = useRef<LivePose>({ ...IDLE });
  const playheadRef = useRef(0);
  const shotSequence = useRef(0);
  const popSequence = useRef(0);
  const landingSequence = useRef(0);
  const audio = useRef<FlightAudio | null>(null);
  const run = useRef<{ t: number; last: number; raf: number; fired: number; count: ReturnType<typeof setInterval> | undefined; spin: number; prev: { x: number; y: number }; speed: number; uiAt: number; airborne: boolean }>({ t: 0, last: 0, raf: 0, fired: 0, count: undefined, spin: 0, prev: { x: 0, y: 0 }, speed: 0, uiAt: 0, airborne: false });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  const resultRef = useRef<Result | null>(null);
  const speedRef = useRef(1);
  speedRef.current = speed;

  useEffect(() => {
    const q = detectQuality();
    setLow(q !== 'high');
    setMode(q === 'off' ? '2d' : '3d');
    try { setMuted(localStorage.getItem('flight-muted') === '1'); } catch { /* ไม่มี storage ก็ไม่เป็นไร */ }
    return () => { cancelAnimationFrame(run.current.raf); audio.current?.dispose(); };
  }, []);

  const snd = () => (audio.current ??= new FlightAudio());

  const reset = useCallback(() => {
    cancelAnimationFrame(run.current.raf);
    clearInterval(run.current.count);
    timers.current.forEach(clearTimeout); timers.current = [];
    audio.current?.stopMotor();
    resultRef.current = null;
    Object.assign(run.current, { t: 0, fired: 0, count: undefined, spin: 0, speed: 0, airborne: false });
    poseRef.current = { ...IDLE };
    playheadRef.current = 0;
    shotSequence.current = 0;
    popSequence.current = 0;
    landingSequence.current = 0;
    setPose2d(HOME); setResult(null); setPlaying(false); setDone(false); setNow(0); setMarks(NO_MARKS); setHighlight(null); setShotCallout(null); setPopCallout(null); setDropCallout(null); setLandingCallout(null); setLog([]); setHolding(false); setLoaded({ L: 0, R: 0 }); actRef.current.mode = 'idle';
    onResult?.(null);
  }, [onResult]);

  // เปลี่ยนประเภทหรือโค้ดแล้วผลเก่าไม่ใช้ต่อ
  useEffect(() => { reset(); }, [event.id, code, cfg, reset]);

  const fire = useCallback((e: SimEvent, r: Result) => {
    const a = audio.current;
    const sp = speedRef.current;
    setLog((l) => [...l, e]);
    if (e.kind === 'takeoff') { run.current.airborne = true; a?.sfx('takeoff'); }
    else if (e.kind === 'land') {
      run.current.airborne = false;
      a?.sfx('land');
      if (e.ok && e.points) {
        a?.ting(0);
        const id = ++landingSequence.current;
        setLandingCallout({ id, points: e.points, target: e.id === 'pad' ? 'แท่น Takeoff' : (e.id ?? 'แท่นวงกลม') });
        later(() => setLandingCallout((current) => current?.id === id ? null : current), 1300 / sp);
      }
      if (e.id === 'pad' && r.stopTime !== null) later(() => a?.sfx('win'), 1300 / sp);
    }
    else if (e.kind === 'info' && e.id === 'load') {
      // คนแข่งเดินมาใส่บอลที่ตัวโดรนทีละลูก (ซ้ายแล้วขวา) ตลอดช่วงบรรจุ
      a?.sfx('load');
      const dur = (e.dur ?? 4000) / sp;
      actRef.current.mode = 'load';
      setLoaded({ L: 0, R: 0 });
      const total = 40;
      for (let i = 1; i <= total; i++) later(() => setLoaded({ L: Math.min(20, i), R: Math.max(0, i - 20) }), (dur * 0.12) + ((dur * 0.8) * i) / total);
      for (let i = 0; i < 8; i++) later(() => a?.ting(i, true), dur * 0.15 + (dur * 0.75 * i) / 8);
      later(() => { if (actRef.current.mode === 'load') actRef.current.mode = 'idle'; }, dur);
    }
    else if (e.kind === 'info' && e.id === 'turn') {
      // คนแข่งหมุนตัวโดรนด้วยมือ (โดรนหมุนเองตามเฟรมจากเอนจิน)
      a?.sfx('load');
      actRef.current.mode = 'turn';
      later(() => { if (actRef.current.mode === 'turn') actRef.current.mode = 'idle'; }, (e.dur ?? 2500) / sp);
    }
    else if (e.kind === 'hold') {
      a?.sfx('hold');
      setHoldKey((k) => k + 1); setHolding(true);
      later(() => setHolding(false), (e.dur ?? 1200) / sp);
    }
    else if (e.kind === 'drop') {
      if (!e.ok || !e.at) { a?.sfx('miss'); return; }
      // ปล่อยบอลทีละลูกตลอดช่วงเวลาที่ปล่อย: ลูกละหนึ่ง "ติ๊ง" ไล่โน้ตขึ้น (ค่อยๆ เบาเมื่อลูกเยอะ)
      const p = cfg.platforms.find((q) => q.id === e.id);
      const c = p ? toField(p.x, p.y) : toField(e.at.x, e.at.y);
      const n = e.n ?? 1, gap = (e.dur ?? 300) / Math.max(1, n);
      const fromL = e.from?.L ?? 0;
      // คะแนนเด้งเมื่อบอลชุดนี้ตกถึงแท่นครบ
      later(() => {
        const id = ++dropSequence.current;
        setDropCallout({ id, points: e.points ?? 0, balls: n, target: p?.id ?? e.id ?? '' });
        later(() => setDropCallout((current) => current?.id === id ? null : current), 1300 / sp);
      }, ((n - 1) * gap + 300) / sp);
      for (let i = 0; i < n; i++) {
        later(() => setLoaded((l) => (i < fromL ? { ...l, L: Math.max(0, l.L - 1) } : { ...l, R: Math.max(0, l.R - 1) })), (i * gap) / sp);
        later(() => {
          const ang = (i / Math.max(1, n)) * Math.PI * 7;
          const rr = 0.08 + 0.3 * Math.sqrt((i % 20) / 20);
          setMarks((m) => ({ ...m, balls: [...m.balls, { x: c.x + Math.cos(ang) * rr, y: c.y + Math.sin(ang) * rr }] }));
          if (n <= 4) { a?.sfx('drop'); a?.ting(i); } else { if (i % 2 === 0) a?.ting(i, true); if (i % 4 === 0) a?.sfx('drop'); }
        }, (i * gap + 260) / sp); // ลูกบอลใช้เวลาตกลงถึงแท่น ~0.26 วินาที
      }
    } else if (e.kind === 'pop') {
      if (e.ok && e.id) {
        a?.sfx('pop'); later(() => a?.ting(2), 90);
        setMarks((m) => ({ ...m, popped: [...m.popped, e.id as string] }));
        const id = ++popSequence.current;
        setPopCallout({ id, points: e.points ?? 5, target: e.id });
        later(() => setPopCallout((current) => current?.id === id ? null : current), 1100 / sp);
      } else a?.sfx('miss');
    } else if (e.kind === 'shot' || e.kind === 'shot_b') {
      a?.sfx('shot');
      later(() => a?.sfx(e.ok ? 'hit' : 'miss', e.points ?? 0), 220 / sp);
      if (e.at && e.to) {
        const f = toField(e.at.x, e.at.y), t = toField(e.to.x, e.to.y);
        const mount = e.kind === 'shot_b' ? 'back' : 'front';
        const yaw = frameAt(r.frames, e.t).yaw * Math.PI / 180;
        const side = mount === 'front' ? 1 : -1;
        const from: [number, number, number] = [f.x + Math.sin(yaw) * side * 0.085, f.y + Math.cos(yaw) * side * 0.085, e.at.z / 100 + 0.065];
        const id = ++shotSequence.current;
        setHighlight({ id, from, to: [t.x, t.y, e.to.z / 100] });
        setShotCallout(null);
        later(() => setShotCallout({ id, ok: !!e.ok, points: e.points ?? 0, target: e.id }), 220 / sp);
        later(() => setShotCallout((current) => current?.id === id ? null : current), 1350 / sp);
        later(() => setHighlight((current) => current?.id === id ? null : current), 1550 / sp);
        setMarks((m) => ({
          ...m, darts: [...m.darts, {
            from,
            to: [t.x, t.y, e.to!.z / 100],
            ok: !!e.ok,
            mount,
            t: e.t,
            terminal: e.t >= r.duration,
            speed: sp,
          }]
        }));
      }
    } else if (e.kind === 'error') a?.sfx('error');
  }, [cfg.platforms]);

  useEffect(() => { if (done && result) onFinish?.(result); }, [done, result, onFinish]);

  const tick = useCallback((ts: number) => {
    const r = resultRef.current;
    if (!r) return;
    const c = run.current;
    const dt = Math.min(0.05, (ts - c.last) / 1000);
    c.last = ts;
    c.t = Math.min(r.duration, c.t + dt * 1000 * speedRef.current);
    playheadRef.current = c.t;
    const f = frameAt(r.frames, c.t);
    const b = frameAt(r.frames, Math.max(0, c.t - 120));
    const b2 = frameAt(r.frames, Math.max(0, c.t - 240));
    const fld = toField(f.x, f.y), prev = toField(b.x, b.y), prev2 = toField(b2.x, b2.y);
    // ความเร็วในกรอบสนาม (ม./วินาที) → แยกเป็นไปข้างหน้า/ด้านข้างตามหัวโดรน เพื่อเอียงตัวตามทิศที่บิน
    const span = Math.max(0.001, (c.t - Math.max(0, c.t - 120)) / 1000);
    const vx = (fld.x - prev.x) / span, vy = (fld.y - prev.y) / span;
    const wx = (prev.x - prev2.x) / span, wy = (prev.y - prev2.y) / span; // ความเร็วเมื่อ 120 ms ก่อน
    const yawR = (f.yaw * Math.PI) / 180;
    const along = (ux: number, uy: number) => ux * Math.sin(yawR) + uy * Math.cos(yawR);
    const across = (ux: number, uy: number) => ux * Math.cos(yawR) - uy * Math.sin(yawR);
    const vf = along(vx, vy), vr = across(vx, vy);
    // ความเร่ง (ม./วินาที²): ออกตัวเป็นบวก เบรกเป็นลบ → เอียงเพิ่ม "กระชาก" ตอนเริ่มและตอนเบรก (เบรก = เงยหัวขึ้น)
    const af = (vf - along(wx, wy)) / span, ar = (vr - across(wx, wy)) / span;
    const sp = Math.hypot(vx, vy);
    const p = poseRef.current;
    const tp = clamp(vf * 8 + af * 4.5, -22, 22), tr = clamp(vr * 8 + ar * 4.5, -22, 22);
    const k = 1 - Math.exp(-dt * 14);
    p.x = fld.x; p.y = fld.y; p.alt = f.z / 100; p.yaw = f.yaw;
    p.pitch += (tp - p.pitch) * k; p.roll += (tr - p.roll) * k;
    // ใบพัด: ดับก่อนขึ้นบิน เร่งหลังขึ้นบิน ดับหลังลงจอด
    // ช่วงสตาร์ทหลัง takeOff: รอบใบพัดไต่จากช้าไปเร็วตามที่ผู้เขียน delay ไว้ (ยกตัวเมื่อครบ 3000 ms)
    if (!c.airborne && (f.rpm ?? 0) > 0) c.spin = f.rpm ?? 0;
    else c.spin += ((c.airborne ? 1 : 0) - c.spin) * (1 - Math.exp(-dt * 3));
    p.spin = c.spin;
    c.speed += (clamp(sp / 1.2, 0, 1) - c.speed) * (1 - Math.exp(-dt * 4));
    audio.current?.motor(c.spin, c.speed);

    while (c.fired < r.events.length && r.events[c.fired].t <= c.t) {
      const e = r.events[c.fired++];
      if (e.kind !== 'info' || e.t > 0) fire(e, r);
    }
    if (ts - c.uiAt > 100) { c.uiAt = ts; setNow(c.t); }
    if (c.t >= r.duration) {
      setNow(c.t); setDone(true); setPlaying(false);
      audio.current?.motor(0, 0);
      return;
    }
    c.raf = requestAnimationFrame(tick);
  }, [fire]);

  const play = useCallback(() => {
    cancelAnimationFrame(run.current.raf);
    timers.current.forEach(clearTimeout); timers.current = [];
    const r = simulate(code, cfg);
    resultRef.current = r;
    onResult?.(r);
    const first = r.events.filter((e) => e.t === 0 && (e.kind === 'error'));
    shotSequence.current = 0;
    popSequence.current = 0;
    landingSequence.current = 0;
    setResult(r); setMarks(NO_MARKS); setHighlight(null); setShotCallout(null); setPopCallout(null); setLandingCallout(null); setLog(first); setDone(false);
    Object.assign(run.current, { t: 0, fired: 0, spin: 0, speed: 0, uiAt: 0, airborne: false });
    audio.current?.resetTing();
    poseRef.current = { ...IDLE };
    playheadRef.current = 0;
    const a = snd();
    a.setMuted(muted);
    a.start();
    // นับถอยหลัง 3-2-1 แล้วเริ่มบิน
    setPlaying(true);
    let n = 3;
    a.sfx('count');
    const iv = setInterval(() => {
      n--;
      if (n > 0) a.sfx('count');
      else { clearInterval(iv); a.sfx('go'); run.current.last = performance.now(); run.current.raf = requestAnimationFrame(tick); }
    }, 600);
    run.current.count = iv;
    if (r.frames.length < 2) { clearInterval(iv); setPlaying(false); setDone(true); }
  }, [cfg, code, muted, onResult, tick]);

  const togglePause = () => {
    if (!resultRef.current) return;
    if (playing) { cancelAnimationFrame(run.current.raf); audio.current?.motor(0, 0); setPlaying(false); }
    else { setPlaying(true); run.current.last = performance.now(); run.current.raf = requestAnimationFrame(tick); }
  };

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    audio.current?.setMuted(m);
    try { localStorage.setItem('flight-muted', m ? '1' : '0'); } catch { /* ไม่มี storage ก็ไม่เป็นไร */ }
  };

  // 2D: ตำแหน่งโดรนบนแผนผังตามเวลา (ใช้เมื่อเครื่องไม่ไหวหรือผู้ใช้เลือก)
  useEffect(() => {
    if (mode !== '2d' || !resultRef.current) return;
    const f = frameAt(resultRef.current.frames, now);
    const p = toField(f.x, f.y);
    setPose2d({ x: p.x, y: p.y, yaw: f.yaw, alt: f.z / 100 });
  }, [now, mode]);

  // วัตถุบนสนาม: 3 มิติเปลี่ยนสีตามเวลาเล่นเอง (อ่าน playheadRef) · 2 มิติใช้เฉพาะที่ผ่านแล้วตามเวลา now
  const visitMap = useMemo(() => Object.fromEntries((result?.visits ?? []).map((v) => [v.id, v.t])), [result]);
  const spec3d = useMemo(() => (scene ? { ...scene, visits: visitMap } : undefined), [scene, visitMap]);
  const spec2d = scene ? { ...scene, visits: Object.fromEntries(Object.entries(visitMap).filter(([, t]) => t <= now)) } : undefined;
  const cap = maxPoints === undefined ? event.maxPoints : maxPoints;
  const started = !!result;
  const live = started;
  const events = log.filter((e) => e.kind !== 'info' || e.line);

  return (
    <div className="grid gap-4">
      <div className="relative aspect-[4/3] w-full overflow-hidden squircle-2xl border border-line bg-[#0b0d12] sm:aspect-video">
        {mode === '3d' ? (
          <Field3D event={event} drone={{ ...pose2d }} onDrone={() => { }} view={view} shot={null} low={low} live={live} simPlaying={playing} poseRef={poseRef} playheadRef={playheadRef} marks={marks} highlight={highlight} dartInventory={{ front: Math.max(0, 2 - marks.darts.filter((item) => item.mount === 'front').length), back: Math.max(0, 2 - marks.darts.filter((item) => item.mount === 'back').length) }} holdKey={holdKey} loaded={loaded} actRef={actRef} scene={spec3d} />
        ) : (
          <FieldPlan2D event={event} drone={pose2d} interactive={false} className="size-full p-2" scene={spec2d} />
        )}

        {/* HUD เวลา/คะแนน */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2 text-white">
          <span className="squircle-sm bg-black/65 px-2.5 py-1 font-mono text-sm">{fmtTime(now)} / {fmtTime(event.durationSec * 1000)}</span>
          {done && result && <span className="squircle-sm bg-brand-blue px-2.5 py-1 text-sm font-semibold">คะแนน {result.score}</span>}
          {holding && <span className="squircle-sm bg-brand-red px-2.5 py-1 text-sm font-semibold motion-safe:animate-pulse">◎ POSHOLD · หยุดนิ่ง</span>}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-[12%] z-10 flex justify-center px-4" aria-live="polite">
          {shotCallout && (
            <div key={shotCallout.id} className={`flight-shot-pop min-w-48 border px-6 py-3 text-center shadow-[0_18px_60px_rgba(0,0,0,.65)] squircle-2xl backdrop-blur-xl ${shotCallout.ok ? 'border-amber-300/70 bg-[#171e22]/90 text-amber-100 shadow-amber-500/20' : 'border-rose-400/60 bg-[#25191d]/90 text-rose-100 shadow-rose-500/20'}`}>
              <div className="text-[10px] font-black tracking-[0.35em] opacity-75">{shotCallout.ok ? 'TARGET HIT' : 'SHOT MISSED'}</div>
              <div className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">{shotCallout.ok ? `+${shotCallout.points} คะแนน` : 'พลาดเป้า'}</div>
              {shotCallout.ok && shotCallout.target && <div className="mt-1 text-xs font-semibold opacity-80">{shotCallout.target}</div>}
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-[25%] z-10 flex justify-center px-4" aria-live="polite">
          {popCallout && (
            <div key={popCallout.id} className="flight-shot-pop border border-rose-300/70 bg-[#29151c]/90 px-5 py-2 text-center text-white squircle-2xl shadow-[0_14px_50px_rgba(244,63,94,.35)] backdrop-blur-xl">
              <div className="text-[10px] font-black  text-rose-200">BALLOON POP!</div>
              <div className="text-2xl font-black text-amber-200 sm:text-3xl">+{popCallout.points} คะแนน</div>
              <div className="text-xs font-semibold text-rose-100">{popCallout.target}</div>
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-[25%] z-10 flex justify-center px-4" aria-live="polite">
          {dropCallout && (
            <div key={dropCallout.id} className="flight-shot-pop border border-emerald-300/70 bg-[#10261d]/90 px-5 py-2 text-center text-white squircle-2xl shadow-[0_14px_50px_rgba(52,211,153,.35)] backdrop-blur-xl">
              <div className="text-[10px] font-black text-emerald-200">BALL IN!</div>
              <div className="text-2xl font-black text-amber-200 sm:text-3xl">{dropCallout.points > 0 ? `+${dropCallout.points} คะแนน` : dropCallout.points < 0 ? `${dropCallout.points} คะแนน` : 'ไม่ได้คะแนน'}</div>
              <div className="text-xs font-semibold text-emerald-100">บอล {dropCallout.balls} ลูก · {dropCallout.target}</div>
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-[25%] z-10 flex justify-center px-4" aria-live="polite">
          {landingCallout && (
            <div key={landingCallout.id} className="flight-shot-pop border border-sky-300/70 bg-[#102338]/90 px-5 py-2 text-center text-white squircle-2xl shadow-[0_14px_50px_rgba(56,189,248,.35)] backdrop-blur-xl">
              <div className="text-[10px] font-black  text-sky-200">CHECKPOINT LANDED</div>
              <div className="text-2xl font-black text-amber-200 sm:text-3xl">+{landingCallout.points} คะแนน</div>
              <div className="text-xs font-semibold text-sky-100">{landingCallout.target}</div>
            </div>
          )}
        </div>

        {/* ปุ่มเล่นใหญ่กลางสนาม: สิ่งเดียวที่ต้องกดตอนเริ่ม */}
        {bigPlay && !started && (
          <div className="absolute inset-0 grid place-items-center bg-black/30">
            <Button size="lg" className="h-14 gap-2 bg-brand-blue px-8 text-lg text-white shadow-lg hover:bg-brand-blue/90" onClick={play}><Play className="size-6 fill-current" /> {playLabel}</Button>
          </div>
        )}
      </div>

      {/* แถบควบคุม: ซ้าย = เล่น/หยุด/เริ่มใหม่ · ขวา = มุมมอง เสียง 2D/3D (ทุกปุ่มมีข้อความ) */}
      <div className="flex flex-wrap items-center gap-2">
        {bigPlay && !started ? null : !playing && !(started && !done) ? (
          <Button className="h-11 px-5 text-base" onClick={play}>{done ? <RotateCcw className="size-4" /> : <Play className="size-4 fill-current" />} {done ? 'เล่นอีกครั้ง' : playLabel}</Button>
        ) : (
          <Button variant="outline" className="h-11 px-5 text-base" onClick={togglePause}>{playing ? <><Pause className="size-4" /> หยุดชั่วคราว</> : <><Play className="size-4 fill-current" /> เล่นต่อ</>}</Button>
        )}
        {started && <Button variant="ghost" className="h-11 px-4 text-base" onClick={reset}>เริ่มใหม่</Button>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {mode === '3d' && (
            <div role="group" aria-label="เลือกมุมมอง" className="flex gap-1 squircle-xl border border-line bg-surface p-1">
              {VIEWS.map(({ id, label, Icon }) => (
                <Button key={id} variant={view === id ? 'default' : 'ghost'} className="h-9 px-3 text-base" aria-pressed={view === id} onClick={() => setView(id)}><Icon className="size-4" /> <span className="max-sm:hidden">{label}</span><span className="sm:hidden sr-only">{label}</span></Button>
              ))}
            </div>
          )}
          <Button variant="outline" className="h-10 px-3 text-base" onClick={toggleMute} aria-pressed={muted}>{muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />} <span className="max-sm:hidden">{muted ? 'เสียงปิดอยู่' : 'เสียงเปิด'}</span></Button>
          <Button variant="outline" className="h-10 px-3 text-base" onClick={() => setMode(mode === '3d' ? '2d' : '3d')} disabled={mode === 'pending'}>{mode === '3d' ? 'ดูแบบ 2 มิติ' : 'ดูแบบ 3 มิติ'}</Button>
        </div>
      </div>

      {/* สถานะการบิน: ตก/ชน/พัง หรือบินสำเร็จ */}
      {done && result && (() => {
        const crash = result.events.find((e) => e.kind === 'error' && e.t > 0);
        const crashed = !!crash && /ตก|ชน|นอกสนาม|ยังไม่ได้ขึ้นบิน/.test(crash.text);
        const grounded = !!crash && /บินไม่ขึ้น/.test(crash.text);
        const first = result.events.find((e) => e.kind === 'error');
        const warns = result.events.filter((e) => e.kind === 'warn').length;
        const tone = first ? 'border-brand-red/50 bg-brand-red/10 text-brand-red' : warns ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
        return (
          <div role="status" className={`flex items-start gap-3 squircle-xl border px-4 py-3 ${tone}`}>
            <span aria-hidden className="text-2xl leading-none">{first ? (crashed ? '💥' : grounded ? '🛑' : '⚠️') : warns ? '⚠️' : '✅'}</span>
            <div className="min-w-0 text-base">
              <p className="font-bold">{first ? (crashed ? 'โดรนตก / ชน / พัง' : grounded ? 'โดรนบินไม่ขึ้น' : 'โค้ดมีข้อผิดพลาด') : warns ? 'บินจบ แต่มีคำเตือน' : 'บินสำเร็จ ไม่ตก ไม่ชน'}</p>
              {first && <p className="mt-0.5 text-sm">{first.text}</p>}
              {!first && warns > 0 && <p className="mt-0.5 text-sm">ดูรายละเอียดในบันทึกการบินด้านล่าง</p>}
            </div>
          </div>
        );
      })()}

      {/* บันทึกการบิน + สรุปคะแนน */}
      {(events.length > 0 || (done && result)) && (
        <div className="grid gap-3 lg:grid-cols-2">
          <ul className="grid max-h-56 content-start gap-1 overflow-auto squircle-xl border border-line bg-surface p-3 text-sm" role="log" aria-label="บันทึกการบิน">
            {events.slice(-30).map((e, i) => (
              <li key={i} className={e.kind === 'error' ? 'text-brand-red' : e.kind === 'warn' || e.ok === false ? 'text-brand-red/80' : e.ok ? 'text-brand-blue' : 'text-muted-foreground'}>
                {e.kind === 'error' ? '✕' : e.kind === 'warn' || e.ok === false ? '⚠' : e.ok ? '●' : '·'} {e.text}
              </li>
            ))}
          </ul>
          {done && result && (
            <div className="grid content-start gap-2 squircle-xl border border-line bg-surface p-4" role="status">
              <div className="flex items-baseline justify-between"><span className="font-display text-lg font-semibold">สรุปคะแนน</span><Badge>{result.score}{cap !== null ? ` / ${cap}` : ' คะแนน'}</Badge></div>
              <ul className="grid gap-1 text-sm">
                {result.breakdown.map((b) => <li key={b.label} className="flex justify-between gap-3"><span className="text-muted-foreground">{b.label}</span><span className="font-medium">{b.points > 0 ? '+' : ''}{b.points}</span></li>)}
                {result.breakdown.length === 0 && <li className="text-muted-foreground">ยังไม่ได้คะแนน</li>}
              </ul>
              <p className="text-xs text-muted-foreground">
                {result.stopTime !== null ? `หยุดเวลาที่ ${fmtTime(result.stopTime)}` : 'ยังไม่ได้หยุดเวลา (ต้องลงจอดบนแท่น Takeoff)'}
                {result.timedOut ? ' · หมดเวลา' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
