'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NO_MARKS, type LivePose, type Marks, type ShotHighlight, type ViewPreset, type WalkInput, type WalkPose } from '@/field/Field3D';
import { FieldPlan2D } from '@/field/FieldPlan2D';
import type { RuleEvent } from '@/rules/types';
import { detectQuality } from '@/scene/quality';
import { CircleHelp, Footprints, Layers, Maximize2, Minimize2, Pause, Play, RotateCcw, Ruler, Video, Volume2, VolumeX } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildConfig, toField } from './config';
import { baseAt, startOf } from '@/lib/scenarios';
import type { FlightConfig } from './engine';
import type { SceneSpec } from '@/field/SceneObjects';
import { frameAt, parse, simulate, TIME_LIMIT_MS, type Frame, type Result, type SimEvent } from './engine';
import { inLaunchZone, LIGHTS_OFF, LIGHTS_ON, type FieldLights, type FlightAction, type FlightDifficulty, type FlightEnvironment, type ManualStick } from './environment';
import { TouchStick, TouchWalkControls } from './TouchControls';
import { WalkGuide } from './WalkGuide';
import { FlightAudio } from './sound';
import { FieldMeasure } from './FieldMeasure';
import type { Measurement } from './measurements';
import { dimensionTargets } from '@/field/dimension-targets';

const Field3D = dynamic(() => import('@/field/Field3D'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted-foreground">กำลังโหลดสนาม 3 มิติ…</div>,
});

/** ขาโดรนอยู่ต่ำกว่าจุดกึ่งกลางโมเดล 7.0 ซม. · แท่น Takeoff สูง 20 ซม. → โดรนจอดอยู่บนแท่น ไม่จมพื้น */
const LEG = 0.0702;
const PAD = 0.2;
const REST = PAD + LEG;
const VIEWS: Array<{ id: ViewPreset; label: string; Icon: typeof Video }> = [
  { id: 'chase', label: 'ตามโดรน', Icon: Video },
  { id: 'top', label: 'มองจากบน', Icon: Layers },
  { id: 'walk', label: 'เดินในสนาม', Icon: Footprints },
];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const fmtTime = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`;

type Props = {
  event: RuleEvent;
  code: string;
  /** ปุ่มเล่นใหญ่ตรงกลางสนามเมื่อยังไม่เคยเล่น */
  bigPlay?: boolean;
  onResult?: (r: Result | null) => void;
  /** Active source command while the flight animation is playing. */
  onCommandProgress?: (focus: { key: number; line: number } | null) => void;
  /** เรียกเมื่อโดรนบินเริ่ม/จบ */
  onStart?: () => void;
  onFinish?: (r: Result) => void;
  /** คำที่ใช้บนปุ่ม */
  playLabel?: string;
  previewKey?: number;
  remoteKeys?: number[];
  initialView?: ViewPreset;
  focusPlay?: boolean;
  /** โจทย์ฝึก: ตั้งค่าเอนจินและวัตถุบนสนามเอง (ไม่ใส่ = สนามแข่งจริงตามประเภท) */
  config?: FlightConfig;
  scene?: Pick<SceneSpec, 'pattern' | 'objects' | 'start' | 'base'>;
  /** คะแนนเต็มที่โชว์ (undefined = ตามกติกาของประเภท, null = ไม่โชว์คะแนนเต็ม) */
  maxPoints?: number | null;
  /** ขยายสนามจริงให้สูงประมาณครึ่งจอในหน้า Simulator */
  fullHeightField?: boolean;
};

/**
 * เครื่องเล่นการบินจำลอง: รันโค้ดผ่าน engine แล้วเล่นบนสนาม 3 มิติ พร้อมเสียง
 * ใช้ทั้งหน้า /field (เดโมโค้ดตัวอย่าง) และ /simulator (โค้ดที่ผู้ใช้เขียนเอง)
 */
export function FlightRunner({ event, code, bigPlay = true, onResult, onCommandProgress, onStart, onFinish, playLabel = 'เริ่มจำลองการบิน', config, scene, maxPoints, previewKey, remoteKeys, initialView, focusPlay, fullHeightField = false }: Props) {
  const cfg = useMemo(() => config ?? buildConfig(event.id), [config, event.id]);
  const initialPayload = cfg.initialPayload;
  const payloadL = initialPayload?.L ?? 0;
  const payloadR = initialPayload?.R ?? 0;
  const payloadRef = useRef(initialPayload);
  payloadRef.current = initialPayload;
  // จุดวางโดรนตอนเริ่ม (ตามโจทย์) · สูงเท่าแท่น 20 ซม. ถ้าเริ่มบนฐาน ไม่งั้นเริ่มบนพื้น
  const { HOME, IDLE } = useMemo(() => {
    const st = scene ? startOf(scene) : { x: 0, y: 0, yaw: 0 };
    const pb = scene ? baseAt(scene) : { x: 0, y: 0 };
    const onBase = !!pb && Math.abs(pb.x - st.x) <= 0.75 && Math.abs(pb.y - st.y) <= 0.75;
    const alt = onBase ? REST : LEG;
    return { HOME: { x: st.x, y: st.y, yaw: st.yaw, alt }, IDLE: { x: st.x, y: st.y, alt, yaw: st.yaw, pitch: 0, roll: 0, spin: 0 } as LivePose };
  }, [scene]);
  const [result, setResult] = useState<Result | null>(null);
  const [plannedResult, setPlannedResult] = useState<Result | null>(null);
  const [flightSeed, setFlightSeed] = useState(0);
  const [difficulty, setDifficulty] = useState<FlightDifficulty>('medium');
  const [lights, setLights] = useState<FieldLights>(LIGHTS_OFF);
  const [launch, setLaunch] = useState<{ x: number; y: number; yaw: number } | null>(null);
  const [walkPosition, setWalkPosition] = useState({ x: 0, y: -4.45 });
  const [remoteManual, setRemoteManual] = useState(false);
  const [remoteOpen, setRemoteOpen] = useState(false);
  const [rescued, setRescued] = useState(false);
  const [rescueStatus, setRescueStatus] = useState('');
  const [hazard, setHazard] = useState('');
  const [scoreCarry, setScoreCarry] = useState(0);
  const [timeCarry, setTimeCarry] = useState(0);
  const [standby, setStandby] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [done, setDone] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [measureOpen, setMeasureOpen] = useState(false);
  const [showDimensions, setShowDimensions] = useState(false);
  const [dimensionFromId, setDimensionFromId] = useState('start');
  const [dimensionToId, setDimensionToId] = useState('');
  const [measurements, setMeasurements] = useState<Measurement[]>([{ id: 1, kind: 'distance', points: [] }]);
  const [activeMeasureId, setActiveMeasureId] = useState(1);
  const [view, setView] = useState<ViewPreset>(initialView ?? (bigPlay && !previewKey ? 'top' : 'chase'));
  const [marks, setMarks] = useState<Marks>(NO_MARKS);
  const [highlight, setHighlight] = useState<ShotHighlight>(null);
  const [shotCallout, setShotCallout] = useState<{ id: number; ok: boolean; points: number; target?: string } | null>(null);
  const [popCallout, setPopCallout] = useState<{ id: number; points: number; target: string } | null>(null);
  const [dropCallout, setDropCallout] = useState<{ id: number; points: number; balls: number; target: string } | null>(null);
  const dropSequence = useRef(0);
  const [landingCallout, setLandingCallout] = useState<{ id: number; points: number; target: string } | null>(null);
  const [log, setLog] = useState<SimEvent[]>([]);
  const [muted, setMuted] = useState(false);
  const [supports3d, setSupports3d] = useState(false);
  const [mode, setMode] = useState<'pending' | '2d' | '3d'>('pending');
  const [expanded, setExpanded] = useState(false);
  const [walkGuideOpen, setWalkGuideOpen] = useState(false);
  const walkGuideSeenRef = useRef(false);
  const [low, setLow] = useState(true);
  const [pose2d, setPose2d] = useState(HOME);
  const [holdKey, setHoldKey] = useState(0);
  const [loaded, setLoaded] = useState({ L: 0, R: 0 });
  const [holding, setHolding] = useState(false);
  const [manualActive, setManualActive] = useState(true);
  const [activeKey, setActiveKey] = useState<number | null>(null);
  const activeKeyRef = useRef<number | null>(null);
  const commandFocusRef = useRef<{ key: number; line: number } | null>(null);

  const poseRef = useRef<LivePose>({ ...IDLE });
  const walkPoseRef = useRef<WalkPose>({ x: 0, y: -4.45, yaw: 0, pitch: -14 });
  const walkInputRef = useRef<WalkInput>({ forward: 0, right: 0, lookX: 0, lookY: 0 });
  const lastWalkRef = useRef({ x: 0, y: -4.45 });
  const stickRef = useRef<ManualStick>({ forward: 0, right: 0, up: 0, yaw: 0 });
  const actionsRef = useRef<FlightAction[]>([]);
  const completedRef = useRef<NonNullable<FlightEnvironment['completed']>>({ balls: [], balloons: [], platforms: [], boards: [], visits: [] });
  const actionHistoryRef = useRef<FlightAction[][]>([]);
  const carryMarksRef = useRef<Marks>(NO_MARKS);
  const lastRecomputeRef = useRef(0);
  const replayRef = useRef(false);
  const rescueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playheadRef = useRef(0);
  const shotSequence = useRef(0);
  const popSequence = useRef(0);
  const landingSequence = useRef(0);
  const audio = useRef<FlightAudio | null>(null);
  const run = useRef<{ t: number; last: number; raf: number; fired: number; count: ReturnType<typeof setInterval> | undefined; spin: number; prev: { x: number; y: number }; speed: number; uiAt: number; airborne: boolean }>({ t: 0, last: 0, raf: 0, fired: 0, count: undefined, spin: 0, prev: { x: 0, y: 0 }, speed: 0, uiAt: 0, airborne: false });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  const resultRef = useRef<Result | null>(null);
  const finishedResultRef = useRef<Result | null>(null);
  const seedRef = useRef(0);
  const replayPayloadRef = useRef<{ L: number; R: number } | null>(null);
  const remainingPayloadRef = useRef<{ L: number; R: number } | null>(null);
  const speedRef = useRef(1);
  speedRef.current = speed;
  const { keyBindings, errors: codeErrors } = useMemo(() => parse(code, cfg.style ?? 'any'), [code, cfg.style]);
  const environmentOf = useCallback((actions: FlightAction[] = actionsRef.current): FlightEnvironment => ({ difficulty, lights, actions, launch: launch ?? undefined, timeLimitMs: TIME_LIMIT_MS - timeCarry, completed: completedRef.current }), [difficulty, lights, launch, timeCarry]);
  const openWalkGuide = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    walkInputRef.current = { forward: 0, right: 0, lookX: 0, lookY: 0 };
    setWalkGuideOpen(true);
  }, []);
  const closeWalkGuide = useCallback(() => {
    setWalkGuideOpen(false);
    walkGuideSeenRef.current = true;
    try { localStorage.setItem('sim-walk-guide-v1', '1'); } catch { /* storage may be disabled */ }
  }, []);
  const chooseView = useCallback((next: ViewPreset) => {
    if (document.pointerLockElement) document.exitPointerLock();
    setView(next);
    if (next !== 'walk' || !fullHeightField) return;
    setExpanded(true);
    let seen = walkGuideSeenRef.current;
    try { seen ||= localStorage.getItem('sim-walk-guide-v1') === '1'; } catch { /* storage may be disabled */ }
    if (!seen) openWalkGuide();
  }, [fullHeightField, openWalkGuide]);

  useEffect(() => {
    const q = detectQuality();
    setLow(q !== 'high');
    setSupports3d(q !== 'off');
    setMode(q === 'off' ? '2d' : '3d');
    try { setMuted(localStorage.getItem('flight-muted') === '1'); } catch { /* ไม่มี storage ก็ไม่เป็นไร */ }
    return () => {
      cancelAnimationFrame(run.current.raf);
      clearInterval(run.current.count);
      timers.current.forEach(clearTimeout);
      audio.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (previewKey !== undefined) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (walkGuideOpen) { closeWalkGuide(); return; }
        if (document.pointerLockElement) { document.exitPointerLock(); return; }
        setExpanded(false);
        return;
      }
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,[contenteditable="true"]')) return;
      if (event.code === 'KeyH' && !event.ctrlKey && !event.metaKey && fullHeightField && mode === '3d') {
        event.preventDefault(); openWalkGuide(); return;
      }
      if (event.code === 'KeyX' && event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        if (document.pointerLockElement) document.exitPointerLock();
        setExpanded((current) => !current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewKey, walkGuideOpen, closeWalkGuide, fullHeightField, mode, openWalkGuide]);

  const snd = () => (audio.current ??= new FlightAudio());

  const reset = useCallback(() => {
    cancelAnimationFrame(run.current.raf);
    clearInterval(run.current.count);
    timers.current.forEach(clearTimeout); timers.current = [];
    if (rescueTimer.current) clearTimeout(rescueTimer.current);
    audio.current?.stopMotor();
    resultRef.current = null;
    finishedResultRef.current = null;
    Object.assign(run.current, { t: 0, fired: 0, count: undefined, spin: 0, speed: 0, airborne: false });
    poseRef.current = { ...IDLE };
    playheadRef.current = 0;
    shotSequence.current = 0;
    popSequence.current = 0;
    landingSequence.current = 0;
    setPose2d(HOME); setResult(null); setPlannedResult(null); setPlaying(false); setDone(false); setNow(0); setMarks(NO_MARKS); setHighlight(null); setShotCallout(null); setPopCallout(null); setDropCallout(null); setLandingCallout(null); setLog([]); setHolding(false); setLoaded(payloadRef.current ?? { L: 0, R: 0 }); setManualActive(true); setActiveKey(null);
    activeKeyRef.current = null;
    commandFocusRef.current = null;
    onCommandProgress?.(null);
    onResult?.(null);
    actionsRef.current = [];
    completedRef.current = { balls: [], balloons: [], platforms: [], boards: [], visits: [] };
    actionHistoryRef.current = [];
    carryMarksRef.current = NO_MARKS;
    stickRef.current = { forward: 0, right: 0, up: 0, yaw: 0 };
    walkPoseRef.current = { x: 0, y: -4.45, yaw: 0, pitch: -14 };
    walkInputRef.current = { forward: 0, right: 0, lookX: 0, lookY: 0 };
    lastWalkRef.current = { x: 0, y: -4.45 };
    setWalkPosition(lastWalkRef.current);
    replayRef.current = false;
    setLaunch(null); setRemoteManual(false); setRemoteOpen(false); setRescued(false); setRescueStatus(''); setHazard(''); setScoreCarry(0); setTimeCarry(0); setStandby(false); setReplaying(false);
  }, [onCommandProgress, onResult]);

  // เปลี่ยนประเภทหรือโค้ดแล้วผลเก่าไม่ใช้ต่อ
  useEffect(() => {
    reset();
    seedRef.current = 0;
    replayPayloadRef.current = null;
    remainingPayloadRef.current = null;
  }, [event.id, code, scene, reset]);

  // สะท้อนจำนวนสัมภาระที่เตรียมจากแผงด้านข้าง โดยไม่ล้างผลเที่ยวบินที่เพิ่งจบ
  useEffect(() => { setLoaded({ L: payloadL, R: payloadR }); }, [payloadL, payloadR]);

  useEffect(() => {
    if (!standby) return;
    const interval = setInterval(() => setTimeCarry(value => Math.min(TIME_LIMIT_MS, value + 100)), 100);
    return () => clearInterval(interval);
  }, [standby]);

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
      // แสดงจำนวนบอลเพิ่มทีละลูกตลอดช่วงบรรจุ
      a?.sfx('load');
      const dur = (e.dur ?? 4000) / sp;
      setLoaded({ L: 0, R: 0 });
      const total = 40;
      for (let i = 1; i <= total; i++) later(() => setLoaded({ L: Math.min(20, i), R: Math.max(0, i - 20) }), (dur * 0.12) + ((dur * 0.8) * i) / total);
      for (let i = 0; i < 8; i++) later(() => a?.ting(i, true), dur * 0.15 + (dur * 0.75 * i) / 8);
    }
    else if (e.kind === 'info' && e.id === 'turn') {
      // โดรนหมุนตามเฟรมจากเอนจิน
      a?.sfx('load');
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

  useEffect(() => {
    if (done && result && finishedResultRef.current !== result) {
      finishedResultRef.current = result;
      remainingPayloadRef.current = result.payloadRemaining;
      onFinish?.(result);
      if (fullHeightField) {
        try { localStorage.setItem('sim-last-flight-v1', JSON.stringify({ seed: flightSeed, difficulty, lights, launch, actions: [...actionHistoryRef.current.flat(), ...actionsRef.current], score: result.score, duration: timeCarry + result.duration })); } catch { /* storage may be disabled */ }
      }
    }
  }, [done, result, onFinish, fullHeightField, flightSeed, difficulty, lights, launch, timeCarry]);

  const recompute = useCallback(() => {
    if (!resultRef.current || !activeKeyRef.current) return;
    const next = simulate(code, { ...cfg, initialPayload: replayPayloadRef.current ?? cfg.initialPayload }, seedRef.current, activeKeyRef.current, environmentOf());
    resultRef.current = next;
    run.current.fired = next.events.filter(event => event.t <= run.current.t).length;
    setResult(next);
  }, [code, cfg, environmentOf]);

  const recordAction = useCallback((action: FlightAction, refresh = true) => {
    if (!resultRef.current || done || replayRef.current) return;
    actionsRef.current.push({ ...action, t: run.current.t });
    if (refresh) recompute();
  }, [done, recompute]);

  const onWalk = useCallback((pose: WalkPose) => {
    if (replayRef.current) return;
    if (Math.hypot(pose.x - lastWalkRef.current.x, pose.y - lastWalkRef.current.y) < 0.02) return;
    lastWalkRef.current = { x: pose.x, y: pose.y };
    setWalkPosition({ x: pose.x, y: pose.y });
    if (!resultRef.current || done) return;
    actionsRef.current.push({ t: run.current.t, type: 'walk', position: { x: pose.x, y: pose.y } });
    if (difficulty === 'hard' && performance.now() - lastRecomputeRef.current > 450) {
      lastRecomputeRef.current = performance.now();
      recompute();
    }
  }, [difficulty, done, recompute]);

  const placeDrone = () => {
    if (resultRef.current) return;
    const p = walkPoseRef.current;
    const x = 500 + p.x * 100, y = 500 - p.y * 100;
    if (!inLaunchZone(x, y, cfg.start.x, cfg.start.y)) { setRescueStatus('เดินเข้าเขตเริ่มก่อนวางโดรน'); return; }
    const next = { x, y, yaw: ((p.yaw % 360) + 360) % 360 };
    setLaunch(next);
    const position = toField(x, y);
    poseRef.current = { ...IDLE, x: position.x, y: position.y, yaw: next.yaw };
    setPose2d({ x: position.x, y: position.y, yaw: next.yaw, alt: IDLE.alt });
    setRescueStatus(`วางโดรนแล้ว · หันหัว ${Math.round(next.yaw)}°`);
  };

  const updateStick = (patch: Partial<ManualStick>) => {
    stickRef.current = { ...stickRef.current, ...patch };
    recordAction({ t: 0, type: 'stick', value: { ...stickRef.current } });
  };

  useEffect(() => {
    if (!remoteManual || !fullHeightField || walkGuideOpen) return;
    const held = new Set<string>();
    const update = () => updateStick({
      forward: Number(held.has('ArrowUp')) - Number(held.has('ArrowDown')),
      right: Number(held.has('ArrowRight')) - Number(held.has('ArrowLeft')),
      up: Number(held.has('KeyI')) - Number(held.has('KeyK')),
      yaw: Number(held.has('KeyL')) - Number(held.has('KeyJ')),
    });
    const down = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,[contenteditable="true"]')) return;
      if (!['ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft', 'KeyI', 'KeyK', 'KeyJ', 'KeyL'].includes(event.code)) return;
      event.preventDefault(); if (!held.has(event.code)) { held.add(event.code); update(); }
    };
    const up = (event: KeyboardEvent) => { if (held.delete(event.code)) update(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [remoteManual, fullHeightField, walkGuideOpen, recordAction]);

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
    if (rescued || (f.rpm ?? 0) === 0 && c.airborne && c.t > 0) c.airborne = false;
    if (!c.airborne && (f.rpm ?? 0) > 0) c.spin = f.rpm ?? 0;
    else c.spin += ((c.airborne ? 1 : 0) - c.spin) * (1 - Math.exp(-dt * 3));
    p.spin = c.spin;
    c.speed += (clamp(sp / 1.2, 0, 1) - c.speed) * (1 - Math.exp(-dt * 4));
    audio.current?.motor(c.spin, c.speed);

    while (c.fired < r.events.length && r.events[c.fired].t <= c.t) {
      const e = r.events[c.fired++];
      if (e.kind !== 'info' || e.t > 0) fire(e, r);
    }
    if (ts - c.uiAt > 100) {
      c.uiAt = ts;
      setNow(c.t);
      if (replayRef.current) {
        const walk = actionsRef.current.filter(action => action.type === 'walk' && action.t <= c.t).at(-1);
        if (walk?.type === 'walk') { walkPoseRef.current.x = walk.position.x; walkPoseRef.current.y = walk.position.y; setWalkPosition(walk.position); }
      }
      if (fullHeightField && difficulty !== 'easy' && c.airborne) {
        const edge = Math.min(f.x, f.y, 1000 - f.x, 1000 - f.y);
        const nearHoop = cfg.hoops?.some(hoop => Math.hypot(f.x - hoop.x, f.y - hoop.y) < hoop.size / 2 + 65 && f.z <= hoop.zMax + 35);
        const nearPillar = cfg.balloons.some(balloon => Math.hypot(f.x - balloon.x, f.y - balloon.y) < 55 && f.z < balloon.z - 10);
        const nearPlatform = cfg.platforms.some(platform => Math.hypot(f.x - platform.x, f.y - platform.y) < platform.r + 35 && f.z < 65 && sp > 0.3);
        setHazard(edge < 75 && sp > 0.3 ? 'ใกล้ขอบสนาม · กู้โดรนได้' : nearHoop || nearPillar || nearPlatform ? 'ใกล้สิ่งกีดขวาง · สลับ manual หรือลงฉุกเฉิน' : '');
      } else setHazard('');
      const command = r.commandTimeline.find((item) => item.start <= c.t && item.end > c.t);
      const focus = command && activeKeyRef.current ? { key: activeKeyRef.current, line: command.line } : null;
      if (focus?.key !== commandFocusRef.current?.key || focus?.line !== commandFocusRef.current?.line) {
        commandFocusRef.current = focus;
        onCommandProgress?.(focus);
      }
    }
    if (c.t >= r.duration) {
      setNow(c.t); setDone(true); setPlaying(false);
      setRescueStatus(status => status.startsWith('KEY ') ? '' : status);
      audio.current?.motor(0, 0);
      return;
    }
    c.raf = requestAnimationFrame(tick);
  }, [fire, onCommandProgress, onFinish, rescued, fullHeightField, difficulty, cfg]);

  const play = useCallback((key?: number, replayActions?: FlightAction[], fresh = false) => {
    setRescueStatus('');
    if (fresh) {
      completedRef.current = { balls: [], balloons: [], platforms: [], boards: [], visits: [] };
      actionHistoryRef.current = [];
      carryMarksRef.current = NO_MARKS;
      setScoreCarry(0); setTimeCarry(0); setLaunch(null); setRescued(false); setRemoteManual(false);
    }
    replayRef.current = !!replayActions;
    setReplaying(!!replayActions);
    if (replayActions) setView('top');
    setStandby(false);
    cancelAnimationFrame(run.current.raf);
    timers.current.forEach(clearTimeout); timers.current = [];
    if (!seedRef.current) seedRef.current = Math.max(1, Math.floor(Math.random() * 2_147_483_647));
    const available = cfg.initialPayload ?? { L: 0, R: 0 };
    const previousRemaining = remainingPayloadRef.current;
    const replaying = !!previousRemaining && previousRemaining.L === available.L && previousRemaining.R === available.R;
    const startPayload = replaying ? (replayPayloadRef.current ?? available) : available;
    replayPayloadRef.current = startPayload;
    remainingPayloadRef.current = null;
    const runConfig = { ...cfg, initialPayload: startPayload };
    actionsRef.current = replayActions ? replayActions.map(action => ({ ...action })) : [{ t: 0, type: 'walk', position: { x: walkPoseRef.current.x, y: walkPoseRef.current.y } }];
    const launchPose = fresh ? undefined : launch ?? undefined;
    const flightEnvironment = { ...environmentOf(), launch: launchPose, timeLimitMs: fresh ? TIME_LIMIT_MS : TIME_LIMIT_MS - timeCarry, completed: completedRef.current };
    const r = simulate(code, runConfig, seedRef.current, key, flightEnvironment);
    const planned = simulate(code, runConfig, 0, key, { difficulty: 'easy', lights: LIGHTS_OFF, launch: launchPose, timeLimitMs: flightEnvironment.timeLimitMs });
    setFlightSeed(seedRef.current);
    resultRef.current = r;
    finishedResultRef.current = null;
    onResult?.(r);
    const first = r.events.filter((e) => e.t === 0 && (e.kind === 'error'));
    shotSequence.current = 0;
    popSequence.current = 0;
    landingSequence.current = 0;
    setResult(r); setPlannedResult(planned); setMarks(carryMarksRef.current); setHighlight(null); setShotCallout(null); setPopCallout(null); setLandingCallout(null); setLog(first); setDone(false); setActiveKey(key ?? null);
    activeKeyRef.current = key ?? keyBindings[0]?.key ?? null;
    commandFocusRef.current = null;
    onCommandProgress?.(null);
    Object.assign(run.current, { t: 0, fired: 0, spin: 0, speed: 0, uiAt: 0, airborne: false });
    audio.current?.resetTing();
    const start = launchPose ? toField(launchPose.x, launchPose.y) : null;
    poseRef.current = { ...IDLE, ...(start ? { x: start.x, y: start.y, yaw: launchPose!.yaw } : {}) };
    playheadRef.current = 0;
    const a = snd();
    a.setMuted(muted);
    a.start();
    // นับถอยหลัง 3-2-1 แล้วเริ่มบิน
    setPlaying(true);
    setManualActive(false);
    onStart?.();
    setNow(0);
    setPose2d(start ? { x: start.x, y: start.y, yaw: launchPose!.yaw, alt: IDLE.alt } : HOME);
    setLoaded(startPayload);
    let n = 3;
    a.sfx('count');
    const iv = setInterval(() => {
      n--;
      if (n > 0) a.sfx('count');
      else { clearInterval(iv); a.sfx('go'); run.current.last = performance.now(); run.current.raf = requestAnimationFrame(tick); }
    }, 600);
    run.current.count = iv;
    if (r.frames.length < 2) { clearInterval(iv); setPlaying(false); setDone(true); }
  }, [cfg, code, HOME, IDLE, keyBindings, muted, onCommandProgress, onFinish, onResult, onStart, tick, environmentOf, launch, timeCarry]);

  const toggleManual = () => {
    const next = !remoteManual;
    setRemoteManual(next);
    recordAction({ t: 0, type: 'manual', enabled: next });
    if (!next) updateStick({ forward: 0, right: 0, up: 0, yaw: 0 });
    setRescueStatus(next ? 'รีโมทอยู่ในโหมด manual · คำสั่ง KEY เดิมยังรันอยู่' : 'กลับสู่โหมด coding');
  };

  const startRescue = () => {
    if (!resultRef.current || rescued || done) return;
    const person = walkPoseRef.current, drone = poseRef.current;
    if (Math.hypot(person.x - drone.x, person.y - drone.y) > 0.85 || drone.alt > 2) {
      setRescueStatus('เข้าใกล้โดรนในระยะเอื้อมถึงก่อน');
      return;
    }
    setRescueStatus('กำลังจับแบตและพลิกโดรน…');
    rescueTimer.current = setTimeout(() => {
      recordAction({ t: 0, type: 'flip' });
      setRescued(true);
      run.current.airborne = false;
      setRescueStatus('ใบพัดหยุดแล้ว · ปิดเปิดโดรนใหม่เพื่อรับ KEY ถัดไป');
      rescueTimer.current = null;
    }, 900);
  };
  const cancelRescue = () => {
    if (!rescueTimer.current) return;
    clearTimeout(rescueTimer.current); rescueTimer.current = null;
    setRescueStatus('ยกเลิกการจับโดรน');
  };

  const powerCycle = () => {
    if (!rescued) return;
    const current = resultRef.current;
    if (!current) return;
    const balls = new Map(completedRef.current.balls.map(item => [item.id, item.count]));
    const balloons = new Set(completedRef.current.balloons);
    const platforms = new Set(completedRef.current.platforms);
    const boards = new Map(completedRef.current.boards.map(item => [item.id, item.points]));
    const visits = new Set(completedRef.current.visits);
    for (const event of log) {
      if (event.kind === 'drop' && event.ok && event.id) balls.set(event.id, (balls.get(event.id) ?? 0) + (event.n ?? 0));
      if (event.kind === 'pop' && event.ok && event.id) balloons.add(event.id);
      if (event.kind === 'land' && event.ok && event.id && event.id !== 'pad' && event.id !== 'rest') platforms.add(event.id);
      if ((event.kind === 'shot' || event.kind === 'shot_b') && event.ok && event.id) boards.set(event.id, Math.min(boards.get(event.id) ?? Infinity, event.points ?? 0));
    }
    current.visits.filter(item => item.t <= run.current.t).forEach(item => visits.add(item.id));
    completedRef.current = { balls: [...balls].map(([id, count]) => ({ id, count })), balloons: [...balloons], platforms: [...platforms], boards: [...boards].map(([id, points]) => ({ id, points })), visits: [...visits] };
    const c = completedRef.current;
    const ballScore = c.balls.reduce((sum, item) => { const cap = cfg.platforms.find(platform => platform.id === item.id)?.requiredBalls ?? cfg.ballCap; return sum + (Math.min(item.count, cap) - Math.max(0, item.count - cap)) * cfg.points.ball; }, 0);
    const visitScore = c.visits.reduce((sum, id) => sum + (cfg.waypoints?.find(item => item.id === id)?.points ?? cfg.hoops?.find(item => item.id === id)?.points ?? 0), 0);
    setScoreCarry(ballScore + c.balloons.length * cfg.points.balloon + c.platforms.length * cfg.points.platformLanding + c.boards.reduce((sum, item) => sum + item.points, 0) + visitScore);
    actionHistoryRef.current.push([...actionsRef.current, { t: run.current.t, type: 'power' }]);
    carryMarksRef.current = marks;
    actionsRef.current = [];
    cancelAnimationFrame(run.current.raf); clearInterval(run.current.count); timers.current.forEach(clearTimeout); timers.current = [];
    audio.current?.stopMotor();
    const captured = poseRef.current;
    const capturedX = 500 + captured.x * 100, capturedY = 500 - captured.y * 100;
    const pad = cfg.padAt === undefined ? cfg.start : cfg.padAt;
    const onPad = !!pad && Math.abs(capturedX - pad.x) <= cfg.pad.half && Math.abs(capturedY - pad.y) <= cfg.pad.half;
    const onPlatform = cfg.platforms.some(platform => Math.hypot(capturedX - platform.x, capturedY - platform.y) <= platform.r);
    const groundedAlt = onPad || onPlatform ? REST : LEG;
    const pose = { ...captured, alt: groundedAlt, pitch: 0, roll: 0, spin: 0 };
    const field = { x: Math.max(0, Math.min(1000, 500 + pose.x * 100)), y: Math.max(0, Math.min(1000, 500 - pose.y * 100)), yaw: pose.yaw };
    setLaunch(field); poseRef.current = pose; setPose2d({ x: pose.x, y: pose.y, yaw: pose.yaw, alt: groundedAlt });
    setTimeCarry(value => Math.min(TIME_LIMIT_MS, value + run.current.t)); setStandby(true);
    resultRef.current = null; setResult(null); setPlannedResult(null); setPlaying(false); setDone(false); setNow(0); setRemoteManual(false); setRescued(false); setManualActive(true); setActiveKey(null); setHazard('');
    activeKeyRef.current = null; commandFocusRef.current = null; onCommandProgress?.(null);
    setRescueStatus('เปิดเครื่องใหม่แล้ว · เลือก KEY เพื่อทำภารกิจต่อ');
  };

  const pressKey = (key: number) => {
    if (timeCarry >= TIME_LIMIT_MS) { setRescueStatus('หมดเวลาภารกิจ · เริ่มเที่ยวบินใหม่'); return; }
    if (resultRef.current && !done) { setRescueStatus(`KEY ${activeKey} ยังรันอยู่ · รอให้จบหรือปิดเปิดโดรนใหม่`); return; }
    if (remoteManual) { setRescueStatus('สลับกลับโหมด coding ก่อนกด KEY'); return; }
    play(key);
  };

  const randomizeConditions = () => {
    seedRef.current = Math.max(1, Math.floor(Math.random() * 2_147_483_647));
    play(activeKey ?? undefined, undefined, true);
  };

  const togglePause = () => {
    if (!resultRef.current) return;
    if (playing) { clearInterval(run.current.count); cancelAnimationFrame(run.current.raf); audio.current?.motor(0, 0); setPlaying(false); }
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
  const dimensionOptions = useMemo(() => dimensionTargets(scene), [scene]);
  const dimensionFrom = dimensionOptions.find((target) => target.id === dimensionFromId) ?? dimensionOptions[0];
  const dimensionTo = dimensionOptions.find((target) => target.id === dimensionToId && target.id !== dimensionFrom.id)
    ?? dimensionOptions.find((target) => target.id !== dimensionFrom.id);
  const requiredWaypoints = scene?.objects.filter((object) => object.type === 'waypoint') ?? [];
  const visitedWaypointIds = new Set(result?.visits.filter((visit) => visit.kind === 'waypoint').map((visit) => visit.id) ?? []);
  useEffect(() => { setDimensionFromId('start'); setDimensionToId(''); }, [scene]);
  const cap = maxPoints === undefined ? event.maxPoints : maxPoints;
  const started = !!result;
  const flightError = result?.events.find((event) => event.kind === 'error');
  const flightInProgress = started && !done;
  const remoteStatus = flightInProgress
    ? playing ? `KEY ${activeKey} กำลังทำงาน · กด KEY อื่นได้เมื่อคำสั่งจบหรือปิดเปิดโดรนใหม่` : 'หยุดชั่วคราว กดเล่นต่อหรือรีเซ็ตเที่ยวบิน'
    : timeCarry >= TIME_LIMIT_MS ? 'หมดเวลา 2 นาที 30 วินาที · เริ่มเที่ยวบินใหม่'
    : codeErrors.length ? codeErrors[0].text
    : keyBindings.length ? 'กดปุ่มที่ขึ้นว่า “พร้อมกด” เพื่อเริ่มบิน'
    : 'ยังไม่มีปุ่มพร้อมใช้ ผูกฟังก์ชันใน setup() เช่น drone.onKey1(fly);';
  const readyKey = (done && activeKey) || keyBindings.map((entry) => entry.key).sort((a, b) => a - b)[0];
  const live = started || manualActive;
  const events = log.filter((e) => e.kind !== 'info' || e.line);

  return (
    <div className={previewKey ? "grid min-w-0 gap-2" : fullHeightField ? "grid min-w-0 gap-3" : "grid gap-3 xl:h-full xl:min-h-0 xl:grid-rows-[minmax(12rem,1fr)_auto_auto_auto] xl:gap-2"}>
      {fullHeightField && !previewKey && <section className="grid gap-3 squircle-2xl border border-line bg-surface p-3" aria-label="สภาพการบิน">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1"><h3 className="text-sm font-bold">สภาพการบิน</h3><p className="text-xs text-muted-foreground">เลือกระดับก่อนกด KEY · ใช้ร่วมกันทุกมุมมอง</p></div>
          <div role="group" aria-label="ระดับการบิน" className="flex gap-1 squircle-xl border border-line bg-surface-2 p-1">
            {([['easy', 'ง่าย'], ['medium', 'ปานกลาง'], ['hard', 'ยาก']] as const).map(([id, label]) => <Button key={id} type="button" size="sm" variant={difficulty === id ? 'default' : 'ghost'} aria-pressed={difficulty === id} disabled={flightInProgress} onClick={() => setDifficulty(id)}>{label}</Button>)}
          </div>
        </div>
        {difficulty === 'hard' && <details className="border-t border-line pt-2 text-sm">
          <summary className="cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-brand-blue">ตั้งไฟ LED สี่มุม</summary>
          <p className="mt-1 text-xs text-muted-foreground">แสงกระทบการอ่านลายพื้นของ optical flow · คนเดินบังแสงได้</p>
          <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={flightInProgress} onClick={() => setLights(LIGHTS_OFF.map(light => ({ ...light })) as FieldLights)}>รอบไม่เปิดไฟ</Button><Button size="sm" variant="outline" disabled={flightInProgress} onClick={() => setLights(LIGHTS_ON.map(light => ({ ...light })) as FieldLights)}>รอบเปิดไฟ</Button></div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {lights.map((light, index) => <div key={index} className="grid gap-2 squircle-xl border border-line bg-surface-2 p-2">
              <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={light.enabled} disabled={flightInProgress} onChange={event => setLights(previous => previous.map((item, i) => i === index ? { ...item, enabled: event.target.checked } : item) as FieldLights)} />{['ซ้ายบน', 'ขวาบน', 'ซ้ายล่าง', 'ขวาล่าง'][index]}</label>
              <div className="flex items-center gap-2"><label className="sr-only" htmlFor={`sim-led-${index}`}>สีไฟ{index + 1}</label><select id={`sim-led-${index}`} value={light.color} disabled={flightInProgress || !light.enabled} onChange={event => setLights(previous => previous.map((item, i) => i === index ? { ...item, color: event.target.value as typeof item.color } : item) as FieldLights)} className="min-h-9 flex-1 squircle-xl border border-line bg-surface px-2 text-sm"><option value="cyan">ฟ้า</option><option value="blue">น้ำเงิน</option><option value="ice">ฟ้าอ่อน</option></select>
                <label className="sr-only" htmlFor={`sim-led-strength-${index}`}>ความแรงไฟ{index + 1}</label><input id={`sim-led-strength-${index}`} type="range" min="0" max="1" step="0.1" value={light.intensity} disabled={flightInProgress || !light.enabled} onChange={event => setLights(previous => previous.map((item, i) => i === index ? { ...item, intensity: Number(event.target.value) } : item) as FieldLights)} className="w-24" /><span className="w-7 text-right font-mono text-xs">{Math.round(light.intensity * 10)}</span></div>
            </div>)}
          </div>
        </details>}
      </section>}
      <div className={expanded
        ? 'fixed inset-0 z-[70] h-dvh w-screen overflow-hidden bg-[#0b0d12]'
        : `relative w-full overflow-hidden squircle-2xl border border-line bg-[#0b0d12] ${previewKey ? "aspect-[4/3] max-h-[55dvh] sm:aspect-video" : fullHeightField ? "h-[min(50svh,36rem)] min-h-[18rem]" : "aspect-[4/3] sm:aspect-video xl:aspect-auto xl:h-full xl:min-h-0"}`}>
        {mode === '3d' ? (
          <Field3D event={event} drone={{ ...pose2d }} onDrone={() => { }} view={view} shot={null} low={low} live={live} poseRef={poseRef} playheadRef={playheadRef} marks={marks} highlight={highlight} dartInventory={{ front: Math.max(0, 2 - marks.darts.filter((item) => item.mount === 'front').length), back: Math.max(0, 2 - marks.darts.filter((item) => item.mount === 'back').length) }} holdKey={holdKey} loaded={loaded} scene={spec3d} measurements={measurements} showDimensions={!previewKey && showDimensions} dimensionFrom={dimensionFrom.id} dimensionTo={dimensionTo?.id} lights={fullHeightField ? lights : undefined} walkPoseRef={fullHeightField ? walkPoseRef : undefined} walkInputRef={fullHeightField ? walkInputRef : undefined} walkControlsEnabled={!walkGuideOpen} onWalk={fullHeightField ? onWalk : undefined} />
        ) : (
          <FieldPlan2D event={event} drone={pose2d} interactive={false} className="size-full p-2" scene={spec2d} measurements={measurements} />
        )}

        {fullHeightField && mode === '3d' && view === 'walk' && <>
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 squircle-xl border border-foreground bg-surface/60" />
          <TouchWalkControls inputRef={walkInputRef} />
          <Button type="button" size="sm" variant="outline" className={`absolute right-3 z-30 ${expanded ? 'top-28 sm:top-14' : 'top-14'}`} aria-expanded={remoteOpen} aria-controls="walk-remote" onClick={() => { if (document.pointerLockElement) document.exitPointerLock(); setRemoteOpen(value => !value); }}>{remoteOpen ? 'ปิดรีโมท' : 'เปิดรีโมท'}</Button>
          {remoteOpen && <div id="walk-remote" className={`absolute right-3 z-30 grid max-h-[calc(100%-7rem)] w-[min(20rem,calc(100%-1.5rem))] min-w-0 content-start gap-2 overflow-y-auto overscroll-contain squircle-2xl border border-line bg-surface/95 p-3 text-foreground shadow-xl backdrop-blur ${expanded ? 'top-40 max-sm:max-h-[calc(100%-11rem)] sm:top-24' : 'top-24'}`}>
            <h3 className="text-sm font-bold">รีโมท · {remoteManual ? 'manual' : 'coding'}</h3>
            <p role="status" className="text-xs text-muted-foreground">{remoteStatus}</p>
            <div className="grid grid-cols-3 gap-1">{keyBindings.map(binding => <Button key={binding.key} type="button" size="sm" variant="outline" disabled={rescued || !!codeErrors.length || timeCarry >= TIME_LIMIT_MS} onClick={() => pressKey(binding.key)}>KEY {binding.key}</Button>)}</div>
            <div className="flex flex-wrap gap-1"><Button type="button" size="sm" variant={remoteManual ? 'default' : 'outline'} disabled={!started || done || rescued} onClick={toggleManual}>{remoteManual ? 'กลับ coding' : 'เข้า manual'}</Button><Button type="button" size="sm" variant="outline" disabled={!flightInProgress || rescued} onClick={() => { recordAction({ t: 0, type: 'land' }); setRescueStatus('สั่งลงฉุกเฉินแล้ว'); }}>ลงฉุกเฉิน</Button>{rescued && <Button type="button" size="sm" onClick={powerCycle}>ปิดเปิดใหม่</Button>}</div>
            {remoteManual && <div className="flex flex-wrap gap-2"><TouchStick label="บังคับแนวราบ" onMove={(x, y) => updateStick({ right: x, forward: y })} /><TouchStick label="ขึ้นลงและหมุน" onMove={(x, y) => updateStick({ yaw: x, up: y })} /></div>}
          </div>}
          <div className="absolute bottom-16 right-3 z-20 flex flex-wrap justify-end gap-2 sm:inset-x-0 sm:bottom-3 sm:justify-center sm:px-3">
            {!started && !standby && <Button type="button" size="sm" onClick={placeDrone}>วางโดรนตรงนี้</Button>}
            {started && !done && !rescued && <Button type="button" size="sm" variant="outline" onPointerDown={startRescue} onPointerUp={cancelRescue} onPointerCancel={cancelRescue} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') startRescue(); }} onKeyUp={cancelRescue}>กดค้าง · จับแบตและพลิก</Button>}
            {rescued && <Button type="button" size="sm" onClick={powerCycle}>ปิดเปิดโดรนใหม่</Button>}
          </div>
          <p className="pointer-events-none absolute bottom-3 left-3 z-20 hidden squircle-xl border border-line bg-surface/90 px-3 py-1.5 text-xs text-foreground lg:block">WASD เดิน · คลิกสนามเพื่อหันมอง หรือคลิกลาก · Esc ปล่อยเมาส์</p>
        </>}

        {/* HUD เวลา/คะแนน */}
        <div className={`pointer-events-none absolute left-3 flex flex-wrap items-center gap-2 text-white ${expanded ? 'top-14 max-w-[calc(100%-8rem)] sm:top-3 sm:max-w-[calc(100%-17rem)] lg:max-w-[calc(100%-32rem)]' : 'top-3'}`}>
          <span className="squircle-sm bg-black/65 px-2.5 py-1 font-mono text-sm">{fmtTime(now + timeCarry)} / {fmtTime(event.durationSec * 1000)}</span>
          {(done && result || scoreCarry > 0) && <span className="squircle-sm bg-brand-blue px-2.5 py-1 text-sm font-semibold">คะแนน {done && result ? result.score : scoreCarry}</span>}
          {manualActive && <span className="squircle-sm bg-black/65 px-2.5 py-1 text-sm font-semibold">พร้อมรอคำสั่ง KEY</span>}
          {holding && <span className="squircle-sm bg-brand-red px-2.5 py-1 text-sm font-semibold motion-safe:animate-pulse">◎ POSHOLD · หยุดนิ่ง</span>}
          {view === 'walk' && <span className="squircle-sm bg-black/65 px-2.5 py-1 text-xs">{walkPosition.x.toFixed(1)}, {walkPosition.y.toFixed(1)} ม. · สายตา 1.70 ม.</span>}
          {hazard && <span role="alert" className="squircle-sm bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground">{hazard}</span>}
          {rescueStatus && <span role="status" className="squircle-sm bg-black/75 px-2.5 py-1 text-xs">{rescueStatus}</span>}
        </div>

        {!previewKey && mode === '3d' && <div className="absolute right-3 top-3 z-30 flex max-w-[calc(100%-1.5rem)] items-center gap-1 squircle-xl border border-line bg-surface/95 p-1 shadow-lg" aria-label="ควบคุมมุมสนาม">
          {expanded && <div role="group" aria-label="เลือกมุมมองในเต็มจอ" className="flex items-center gap-1 border-r border-line pr-1">
            {VIEWS.filter(item => fullHeightField || item.id !== 'walk').map(({ id, label, Icon }) => <Button key={id} type="button" size="sm" variant={view === id ? 'default' : 'ghost'} className="h-9 min-w-9 gap-1 px-2" aria-label={label} aria-pressed={view === id} disabled={replaying && id === 'walk'} onClick={() => chooseView(id)} title={label}><Icon className="size-4" aria-hidden /><span className="hidden lg:inline">{label}</span></Button>)}
          </div>}
          {fullHeightField && <Button type="button" size="sm" variant="ghost" className="h-9 min-w-9 gap-1 px-2" aria-label="วิธีเดินและบังคับ" title="วิธีเดินและบังคับ · H" onClick={openWalkGuide}><CircleHelp className="size-4" aria-hidden /><span className="hidden lg:inline">วิธีเดิน</span></Button>}
          <Button type="button" size="sm" variant="ghost" className="h-9 w-9 p-0" aria-label={expanded ? 'ย่อสนาม 3 มิติ' : 'ขยายสนาม 3 มิติ'} title="Ctrl+Shift+X · Esc เพื่อย่อ" onClick={() => { if (document.pointerLockElement) document.exitPointerLock(); setExpanded(current => !current); }}>
            {expanded ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
          </Button>
        </div>}
        {walkGuideOpen && mode === '3d' && fullHeightField && <WalkGuide onClose={closeWalkGuide} />}
        {!previewKey && mode === '3d' && showDimensions && dimensionOptions.length > 1 && <div className="absolute right-3 top-14 z-20 grid max-w-[min(19rem,calc(100%-1.5rem))] gap-1.5 squircle-xl border border-white/25 bg-black/80 p-2 text-xs font-semibold text-white shadow-lg">
          <span>วัดระหว่างจุดในสนาม</span>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="grid min-w-0 gap-0.5">จาก
              <Select value={dimensionFrom.id} onValueChange={(value) => { if (value) setDimensionFromId(value); }}>
                <SelectTrigger aria-label="วัดระยะจาก" className="w-full min-w-0 border-white/25 bg-[#202735] text-white"><SelectValue>{dimensionFrom.label}</SelectValue></SelectTrigger>
                <SelectContent>{dimensionOptions.map((target) => <SelectItem key={target.id} value={target.id}>{target.label}</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <label className="grid min-w-0 gap-0.5">ถึง
              <Select value={dimensionTo?.id ?? ''} onValueChange={(value) => { if (value) setDimensionToId(value); }}>
                <SelectTrigger aria-label="วัดระยะถึง" className="w-full min-w-0 border-white/25 bg-[#202735] text-white"><SelectValue>{dimensionTo?.label ?? 'เลือกปลายทาง'}</SelectValue></SelectTrigger>
                <SelectContent>{dimensionOptions.filter((target) => target.id !== dimensionFrom.id).map((target) => <SelectItem key={target.id} value={target.id}>{target.label}</SelectItem>)}</SelectContent>
              </Select>
            </label>
          </div>
          {dimensionTo && <span className="font-mono text-xs text-cyan-200">Δx {(dimensionTo.x - dimensionFrom.x).toFixed(2)} ม. · Δy {(dimensionTo.y - dimensionFrom.y).toFixed(2)} ม.</span>}
        </div>}

        <div className="pointer-events-none absolute inset-x-0 top-[12%] z-10 flex justify-center px-4" aria-live="polite">
          {shotCallout && (
            <div key={shotCallout.id} className={`flight-shot-pop min-w-48 border px-6 py-3 text-center shadow-[0_18px_60px_rgba(0,0,0,.65)] squircle-2xl backdrop-blur-xl ${shotCallout.ok ? 'border-amber-300/70 bg-[#171e22]/90 text-amber-100 shadow-amber-500/20' : 'border-rose-400/60 bg-[#25191d]/90 text-rose-100 shadow-rose-500/20'}`}>
              <div className="text-sm font-semibold opacity-80">{shotCallout.ok ? 'ยิงถูกเป้า' : 'ยิงพลาด'}</div>
              <div className="mt-1 text-2xl font-bold sm:text-3xl">{shotCallout.ok ? `+${shotCallout.points} คะแนน` : 'พลาดเป้า'}</div>
              {shotCallout.ok && shotCallout.target && <div className="mt-1 text-xs font-semibold opacity-80">{shotCallout.target}</div>}
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-[25%] z-10 flex justify-center px-4" aria-live="polite">
          {popCallout && (
            <div key={popCallout.id} className="flight-shot-pop border border-rose-300/70 bg-[#29151c]/90 px-5 py-2 text-center text-white squircle-2xl shadow-[0_14px_50px_rgba(244,63,94,.35)] backdrop-blur-xl">
              <div className="text-xs font-black text-rose-200">BALLOON POP!</div>
              <div className="text-2xl font-black text-amber-200 sm:text-3xl">+{popCallout.points} คะแนน</div>
              <div className="text-xs font-semibold text-rose-100">{popCallout.target}</div>
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-[25%] z-10 flex justify-center px-4" aria-live="polite">
          {dropCallout && (
            <div key={dropCallout.id} className="flight-shot-pop border border-emerald-300/70 bg-[#10261d]/90 px-5 py-2 text-center text-white squircle-2xl shadow-[0_14px_50px_rgba(52,211,153,.35)] backdrop-blur-xl">
              <div className="text-xs font-black text-emerald-200">BALL IN!</div>
              <div className="text-2xl font-black text-amber-200 sm:text-3xl">{dropCallout.points > 0 ? `+${dropCallout.points} คะแนน` : dropCallout.points < 0 ? `${dropCallout.points} คะแนน` : 'ไม่ได้คะแนน'}</div>
              <div className="text-xs font-semibold text-emerald-100">บอล {dropCallout.balls} ลูก · {dropCallout.target}</div>
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-[25%] z-10 flex justify-center px-4" aria-live="polite">
          {landingCallout && (
            <div key={landingCallout.id} className="flight-shot-pop border border-sky-300/70 bg-[#102338]/90 px-5 py-2 text-center text-white squircle-2xl shadow-[0_14px_50px_rgba(56,189,248,.35)] backdrop-blur-xl">
              <div className="text-xs font-black text-sky-200">CHECKPOINT LANDED</div>
              <div className="text-2xl font-black text-amber-200 sm:text-3xl">+{landingCallout.points} คะแนน</div>
              <div className="text-xs font-semibold text-sky-100">{landingCallout.target}</div>
            </div>
          )}
        </div>

        {/* ปุ่มเริ่มบินของตัวจำลองหลัก: อยู่ในสนามที่ตาจ้องอยู่ ไม่ต้องไปหาแผ่น KEY ใต้สนาม
            ถ้าโค้ดผิดหรือยังไม่ผูก KEY ก็บอกเหตุผลตรงนี้ */}
        {!previewKey && !bigPlay && !flightInProgress && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
            {codeErrors.length > 0 ? (
              <p role="status" className="pointer-events-auto max-w-full squircle-xl bg-black/80 px-3 py-2 text-sm font-semibold text-rose-200">แก้โค้ดก่อนบิน: {codeErrors[0].text}</p>
            ) : readyKey ? null : (
              <p role="status" className="pointer-events-auto max-w-full squircle-xl bg-black/80 px-3 py-2 text-sm text-white">{remoteStatus}</p>
            )}
          </div>
        )}

        {/* ปุ่มเล่นใหญ่กลางสนาม: สิ่งเดียวที่ต้องกดตอนเริ่ม */}
        {bigPlay && !started && (
          <div className="absolute inset-0 grid place-items-center bg-black/30">
          <Button autoFocus={focusPlay} size="lg" className="h-14 gap-2 bg-brand-blue px-8 text-lg text-white shadow-lg hover:bg-brand-blue/90" onClick={() => play(previewKey)}><Play className="size-6 fill-current" /> {playLabel}</Button>
          </div>
        )}
      </div>

      {!bigPlay && <section className="grid gap-2 squircle-2xl border border-line bg-surface p-3" data-tour={previewKey ? undefined : "sim-keys"} aria-label="ปุ่มรีโมต">
        <div>
          <h3 className="font-bold">รีโมตควบคุมการบิน</h3>
          <p aria-live="polite" className={`text-xs leading-5 ${codeErrors.length && !flightInProgress ? 'text-destructive' : 'text-muted-foreground'}`}>
            {remoteStatus}
          </p>
        </div>
        {(() => {
          const allKeys = remoteKeys ?? Array.from({ length: 11 }, (_, index) => index + 1);
          const renderKey = (key: number) => {
            const binding = keyBindings.find((entry) => entry.key === key);
            const disabled = !binding || codeErrors.length > 0 || rescued || timeCarry >= TIME_LIMIT_MS;
            const status = !binding ? 'ยังไม่ผูก' : rescued ? 'เปิดเครื่องก่อน' : timeCarry >= TIME_LIMIT_MS ? 'หมดเวลา' : flightInProgress ? 'งานเดิมยังรัน' : remoteManual ? 'โหมด manual' : codeErrors.length ? 'แก้โค้ดก่อน' : 'พร้อมกด';
            return (
              <Button key={key} type="button" variant={disabled || flightInProgress || remoteManual ? 'outline' : 'default'}
                className="h-auto min-h-11 min-w-0 flex-col items-start gap-0.5 px-1.5 py-1 text-left disabled:border-line disabled:bg-surface-2 disabled:text-muted-foreground disabled:opacity-100"
                disabled={disabled} onClick={() => pressKey(key)}>
                <span className="flex w-full flex-wrap items-center justify-between gap-x-1">
                  <span className="font-mono text-xs font-bold">KEY {key}</span>
                  <span className="text-xs">{status}</span>
                </span>
                {binding && <span className="w-full truncate font-mono text-xs font-normal">{binding.functionName}()</span>}
              </Button>
            );
          };
          const gridClass = remoteKeys ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-3 gap-1.5 sm:grid-cols-4 xl:grid-cols-6';
          // ตัวจำลองหลัก: แสดงเฉพาะ KEY ที่ผูกแล้ว ปุ่มที่ว่างพับไว้ ไม่ให้ 10 ช่อง "ยังไม่ผูก" บังตา
          if (remoteKeys) return <div className={gridClass}>{allKeys.map(renderKey)}</div>;
          const bound = allKeys.filter((key) => keyBindings.some((entry) => entry.key === key));
          const free = allKeys.filter((key) => !bound.includes(key));
          return <>
            {bound.length > 0 && <div className={gridClass}>{bound.map(renderKey)}</div>}
            {free.length > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none py-1 font-semibold hover:text-foreground">KEY ที่ยังไม่ผูก ({free.length} ปุ่ม) · ผูกเพิ่มได้ใน setup()</summary>
                <div className={gridClass + ' mt-1'}>{free.map(renderKey)}</div>
              </details>
            )}
          </>;
        })()}
        {fullHeightField && <div className="grid gap-2 border-t border-line pt-2">
          <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant={remoteManual ? 'default' : 'outline'} aria-pressed={remoteManual} disabled={!started || rescued || done} onClick={toggleManual}>{remoteManual ? 'กลับโหมด coding' : 'สลับเป็น manual'}</Button><Button type="button" size="sm" variant="outline" disabled={!flightInProgress || rescued} onClick={() => { recordAction({ t: 0, type: 'land' }); setRescueStatus('สั่งลงฉุกเฉินแล้ว · งาน KEY เดิมยังรันอยู่'); }}>ลงฉุกเฉิน</Button>{rescued && <Button type="button" size="sm" onClick={powerCycle}>ปิดเปิดโดรนใหม่</Button>}</div>
          {remoteManual && <div className="flex flex-wrap items-center gap-4"><TouchStick label="ก้านเดินหน้าและด้านข้าง" onMove={(x, y) => updateStick({ right: x, forward: y })} /><TouchStick label="ก้านขึ้นลงและหมุนหัว" onMove={(x, y) => updateStick({ yaw: x, up: y })} /><p className="max-w-56 text-xs leading-5 text-muted-foreground">คีย์บอร์ด: ลูกศรบังคับหน้า–หลัง–ซ้าย–ขวา · I/K ขึ้นลง · J/L หมุนหัว</p></div>}
        </div>}
      </section>}

      {/* แถบควบคุม: ซ้าย = เล่น/หยุด/เริ่มใหม่ · ขวา = มุมมอง เสียง 2D/3D (ทุกปุ่มมีข้อความ) */}
      <div className="flex flex-wrap items-center gap-2">
        {started && !done && (
          <Button variant="outline" className="h-11 px-5 text-base" onClick={togglePause}>{playing ? <><Pause className="size-4" /> หยุดชั่วคราว</> : <><Play className="size-4 fill-current" /> เล่นต่อ</>}</Button>
        )}
        {bigPlay && done && (
          <Button className="h-11 px-5 text-base" onClick={() => play(previewKey)}><RotateCcw className="size-4" /> เล่นซ้ำ</Button>
        )}
        {started && <Button variant="ghost" className="h-11 px-4 text-base" onClick={reset}>รีเซ็ตเที่ยวบิน</Button>}
        {!previewKey && done && <Button variant="outline" className="h-11 px-4 text-base" onClick={randomizeConditions}>บินใหม่ · สภาพใหม่</Button>}
        {!previewKey && mode === '3d' && <Button type="button" variant="outline" aria-pressed={showDimensions} className="h-11 px-3 text-base" onClick={() => setShowDimensions((current) => !current)}><Ruler className="size-4" /> {showDimensions ? 'ซ่อนเส้นระยะ' : 'แสดงเส้นระยะ'}</Button>}
        {!previewKey && <Button type="button" variant="outline" className="h-11 px-3 text-base" onClick={() => setMeasureOpen(true)}><Ruler className="size-4" /> เปิดแผนวัดใหญ่</Button>}
        <Select value={String(speed)} onValueChange={(value) => { if (value) setSpeed(Number(value)); }}>
          <SelectTrigger aria-label="ความเร็วการเล่นภาพจำลอง" className="h-11 squircle-xl border-line bg-surface px-3 text-sm hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand-blue">
            <span className="text-muted-foreground">ความเร็วภาพ</span>
            <SelectValue className="font-semibold">{speed}×</SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="1">1× · ปกติ</SelectItem>
            <SelectItem value="2">2× · เร็ว</SelectItem>
            <SelectItem value="4">4× · เร็วมาก</SelectItem>
          </SelectContent>
        </Select>
        <div data-tour={previewKey ? undefined : "sim-camera"} className="ml-auto flex flex-wrap items-center gap-2">
          {mode === '3d' && (
            <div role="group" aria-label="เลือกมุมมอง" className="flex gap-1 squircle-xl border border-line bg-surface p-1">
              {VIEWS.filter(item => fullHeightField || item.id !== 'walk').map(({ id, label, Icon }) => (
                <Button key={id} variant={view === id ? 'default' : 'ghost'} className="h-9 px-3 text-base" aria-pressed={view === id} disabled={replaying && id === 'walk'} onClick={() => chooseView(id)}><Icon className="size-4" /> <span className="max-sm:hidden">{label}</span><span className="sm:hidden sr-only">{label}</span></Button>
              ))}
            </div>
          )}
          <Button variant="outline" className="h-10 px-3 text-base" onClick={toggleMute} aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"}>{muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />} <span className="max-sm:hidden">{muted ? 'เปิดเสียง' : 'ปิดเสียง'}</span></Button>
          <Button variant="outline" className="h-10 px-3 text-base" onClick={() => setMode(mode === '3d' ? '2d' : '3d')} disabled={mode === 'pending' || !supports3d}>{mode === 'pending' ? 'กำลังเตรียมสนาม' : !supports3d ? 'สนาม 2D · เครื่องนี้ใช้ 3D ไม่ได้' : mode === '3d' ? 'สลับเป็น 2D' : 'สลับเป็น 3D'}</Button>
        </div>
      </div>

      {!previewKey && <Dialog open={measureOpen} onOpenChange={setMeasureOpen}>
        <DialogContent className="max-h-[96svh] w-[min(98vw,86rem)] max-w-[min(98vw,86rem)] gap-3 overflow-y-auto p-4 sm:max-w-[min(98vw,86rem)] sm:p-6">
          <DialogHeader><DialogTitle>วัดระยะและพื้นที่ในสนาม</DialogTitle><DialogDescription>สร้างเส้นวัดได้หลายชุด ลากจุดเพื่อปรับตำแหน่ง แล้วดูผลบนสนาม 3D ได้ทันที</DialogDescription></DialogHeader>
          <FieldMeasure event={event} scene={spec2d} measurements={measurements} onChange={setMeasurements} activeId={activeMeasureId} onActiveChange={setActiveMeasureId} />
        </DialogContent>
      </Dialog>}

      {previewKey && result?.events.some((event) => event.kind === 'error') && (
        <p role="status" className="squircle-xl border border-line p-2 text-sm text-destructive">
          {result.events.find((event) => event.kind === 'error')?.text}
        </p>
      )}

      {!previewKey && (done || events.length > 0) && (
        <details className="min-w-0 max-h-[min(48svh,32rem)] overflow-y-auto overscroll-contain squircle-xl border border-line bg-surface">
          <summary className="sticky top-0 z-10 cursor-pointer border-b border-line bg-surface px-3 py-2 text-sm font-semibold hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand-blue">
            {done && flightError ? 'ดูข้อผิดพลาดของเที่ยวบิน' : done && result ? `ดูผลเที่ยวบิน · ${result.score} คะแนน` : 'ดูบันทึกการบิน'}
          </summary>
          <div className="grid min-w-0 gap-3 border-t border-line p-3">
      {!previewKey && done && result && plannedResult && (() => {
        const sample = (frames: Frame[]) => {
          const stride = Math.max(1, Math.ceil(frames.length / 120));
          return frames.filter((_, i) => i % stride === 0 || i === frames.length - 1).map((frame) => {
            const p = toField(frame.x, frame.y);
            return `${200 + clamp(p.x, -4.7, 4.7) * 38},${120 - clamp(p.y, -4.7, 4.7) * 38}`;
          }).join(' ');
        };
        const actual = result.finalPosition;
        const planned = plannedResult.finalPosition;
        const drift = Math.hypot(actual.x - planned.x, actual.y - planned.y);
        const c = result.conditions;
        return <section className="grid gap-3 squircle-2xl border border-line bg-surface p-4" aria-label="ทบทวนสภาพการบิน">
          <div className="flex flex-wrap items-start gap-2"><div className="min-w-0 flex-1"><h3 className="font-bold">ทบทวนเที่ยวบิน {activeKey ? `· KEY ${activeKey}` : ''} · seed {flightSeed}</h3><p className="mt-1 text-sm text-muted-foreground">เส้นฟ้า = แผนตามคำสั่ง · เส้นแดง = เส้นทางที่โดรนบินจริง · บันทึกการกระทำ {actionsRef.current.length} ครั้ง</p></div><Button size="sm" variant="outline" onClick={() => play(activeKey ?? undefined, actionsRef.current)}>เล่นซ้ำสภาพเดิม</Button></div>
          <svg viewBox="0 0 400 240" role="img" aria-label={`เส้นทางวางแผนเทียบกับเส้นทางจริง ปลายทางต่างกัน ${drift.toFixed(1)} เซนติเมตร`} className="h-48 w-full squircle-xl border border-line bg-canvas">
            <defs><pattern id="flight-grid" width="38" height="38" patternUnits="userSpaceOnUse"><path d="M 38 0 L 0 0 0 38" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="1" /></pattern></defs>
            <rect width="400" height="240" fill="url(#flight-grid)" />
            <polyline className="text-brand-blue" points={sample(plannedResult.frames)} fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="7 5" strokeLinejoin="round" strokeLinecap="round" />
            <polyline className="text-destructive" points={sample(result.frames)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx="200" cy="120" r="5" fill="currentColor" /><text x="208" y="115" fontSize="11" fill="currentColor">ฐาน</text>
          </svg>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p className="squircle-xl border border-line bg-surface-2 p-2.5">{difficulty === 'hard' ? 'ระดับยาก: ความคลาดเปลี่ยนตามความสูง ความเร็ว แสง และเงาระหว่างรอบ' : difficulty === 'easy' ? 'ระดับง่าย: ระยะเคลื่อนที่หยุดตามคำสั่ง' : `ความคลาดพื้นฐาน ${Math.hypot(c.driftX, c.driftY).toFixed(1)} ซม. ต่อเที่ยว`}</p>
            <p className="squircle-xl border border-line bg-surface-2 p-2.5">แบตเตอรี่ {c.batteryPercent}% · ปลายทางต่างจากแผน {drift.toFixed(1)} ซม.</p>
            <p className="squircle-xl border border-line bg-surface-2 p-2.5">ถ้าโดรนชนหรือตก เส้นทางจริงจะหยุดก่อนแผนที่เขียนไว้</p>
            <p className="squircle-xl border border-line bg-surface-2 p-2.5">ลองแก้: ดูจุดที่เริ่มพลาดจากเส้นทาง แล้วปรับคำสั่งช่วงนั้นทีละอย่าง</p>
          </div>
        </section>;
      })()}

      {/* สถานะการบิน: ตก/ชน/พัง หรือบินสำเร็จ */}
      {!previewKey && done && result && (() => {
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
      {(!previewKey && (events.length > 0 || (done && result))) && (
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
              {requiredWaypoints.length > 0 && <p className={`text-sm font-semibold ${requiredWaypoints.every((point) => visitedWaypointIds.has(point.id)) ? 'text-emerald-500' : 'text-amber-500'}`}>
                จุดที่ต้องผ่าน {visitedWaypointIds.size}/{requiredWaypoints.length} · {requiredWaypoints.every((point) => visitedWaypointIds.has(point.id)) ? 'ผ่านครบแล้ว' : `ยังขาด ${requiredWaypoints.filter((point) => !visitedWaypointIds.has(point.id)).map((point) => point.order ? `จุด ${point.order}` : point.id).join(', ')}`}
              </p>}
              <ul className="grid gap-1 text-sm">
                {result.breakdown.map((b) => <li key={b.label} className="flex justify-between gap-3"><span className="text-muted-foreground">{b.label}</span><span className="font-medium">{b.points > 0 ? '+' : ''}{b.points}</span></li>)}
                {result.breakdown.length === 0 && <li className="text-muted-foreground">ยังไม่ได้คะแนน</li>}
              </ul>
              <p className="text-xs text-muted-foreground">
                {result.stopTime !== null ? `หยุดเวลาที่ ${fmtTime(timeCarry + result.stopTime)}` : 'ยังไม่ได้หยุดเวลา (ต้องลงจอดบนแท่น Takeoff)'}
                {result.timedOut ? ' · หมดเวลา' : ''}
              </p>
            </div>
          )}
        </div>
      )}
          </div>
        </details>
      )}
    </div>
  );
}
