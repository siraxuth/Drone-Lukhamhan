'use client';

import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { Gamepad2, Maximize2, Minimize2, RotateCw, Unplug, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { keyActions } from './rescue-sortie';
import { NEUTRAL_STICK } from './radio-physics';
import { REMOTE_TIMEOUT_MS, RemoteError, remoteRequest, type PhoneDisplay, type PhoneKey, type PhoneView } from './phone-remote';
import { PhoneLiveView, cameraLabels } from './PhoneLiveView';
import { ControllerConnect, PAIR_CODE } from './ControllerConnect';
import styles from './phone-controller.module.css';

type Pair = { code: string; secret: string };
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};
type FullscreenTarget = HTMLElement & { webkitRequestFullscreen?: () => void };

function fullscreenElement() {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

async function exitRemoteFullscreen() {
  if (!fullscreenElement()) return;
  const doc = document as FullscreenDocument;
  if (doc.exitFullscreen && doc.fullscreenElement) await doc.exitFullscreen();
  else doc.webkitExitFullscreen?.();
  try { screen.orientation?.unlock?.(); } catch { /* The browser may already have released the lock. */ }
}

type Position = { x: number; y: number };
const CENTER = { x: 0, y: 0 };
const KEYS = [1,2,3,4,5,6,7,8,9,10];

function Gimbal({ label, horizontal, vertical, onMove, stop, keyboard }: {
  label: string; horizontal: string; vertical: string; onMove: (point: Position) => void; stop: number; keyboard?: Position;
}) {
  const [point, setPoint] = useState(CENTER);
  const pointer = useRef<number | null>(null);

  useEffect(() => {
    pointer.current = null;
    setPoint(CENTER);
  }, [stop]);

  function move(event: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rotated = matchMedia('(orientation: portrait)').matches;
    const dx = (event.clientX - rect.left) / rect.width * 2 - 1;
    const dy = (event.clientY - rect.top) / rect.height * 2 - 1;
    // On a portrait display the whole remote is rotated 90 degrees clockwise.
    const x = (rotated ? dy : dx) / 0.76;
    const y = (rotated ? dx : -dy) / 0.76;
    const next = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
    setPoint(next);
    onMove(next);
  }

  function release(event: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    setPoint(CENTER);
    onMove(CENTER);
  }

  const position = keyboard ?? point;
  return <div className={styles.stick}>
    <div className={styles.stickTitle}><b>{label}</b><span>{vertical}</span></div>
    <div className={styles.ring} role="group" aria-label={`${label} ${vertical} ${horizontal}`}
      onPointerDown={event => {
        if (pointer.current !== null || event.button !== 0) return;
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
      <div className={styles.thumb} style={{ left: `${50 + position.x * 38}%`, top: `${50 - position.y * 38}%` }} />
    </div>
    <span className="text-xs text-muted-foreground">{horizontal}</span>
  </div>;
}

function keyLabel(key: number, mode: PhoneDisplay['mode']) {
  if (mode === 'rescue') return keyActions[key as keyof typeof keyActions] ?? 'ตามโจทย์';
  if (key === 1) return mode === 'manual' ? 'เข้าโหมดโค้ด' : 'กลับมาบังคับ';
  if (mode === 'code') return '';
  if (key === 2) return 'ตั้งศูนย์';
  if (key === 8) return 'ขึ้นบิน / ลงจอด';
  return '';
}

export function PhoneController() {
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState(false);
  const [lastKey, setLastKey] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<'manual' | 'code'>('manual');
  const [keyboardStick, setKeyboardStick] = useState<typeof NEUTRAL_STICK | null>(null);
  const [pair, setPair] = useState<Pair | null>(null);
  const [display, setDisplay] = useState<PhoneDisplay>({ mode: 'manual', hint: 'ดูสนามบนคอม' });
  const [network, setNetwork] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [stop, setStop] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [fullscreenHint, setFullscreenHint] = useState('');
  const [cameraView, setCameraView] = useState<PhoneView>('off');
  const cameraRequest = useRef(cameraView);
  cameraRequest.current = cameraView;
  const lastView = useRef<Exclude<PhoneView, 'off'>>('chase');
  function chooseCamera(view: PhoneView) {
    if (view !== 'off') lastView.current = view;
    cameraRequest.current = view;
    setCameraView(view);
  }
  const stick = useRef(NEUTRAL_STICK);
  const keys = useRef<PhoneKey[]>([]);
  const nextId = useRef(0);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    setPreview(new URLSearchParams(location.search).get('preview') === '1');
    const readCode = () => {
      const fromQr = location.hash.slice(1).toUpperCase();
      if (PAIR_CODE.test(fromQr)) setCode(fromQr);
    };
    readCode();
    window.addEventListener('hashchange', readCode);
    return () => window.removeEventListener('hashchange', readCode);
  }, []);

  useEffect(() => {
    const sync = () => setFullScreen(fullscreenElement() === root.current);
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  async function enterFullscreen() {
    if (fullscreenElement()) return;
    const target = root.current as FullscreenTarget | null;
    if (target?.requestFullscreen && document.fullscreenEnabled) await target.requestFullscreen();
    else if (target?.webkitRequestFullscreen) target.webkitRequestFullscreen();
    else throw new Error('Fullscreen unavailable');
    const orientation = screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> };
    // The landscape layout is also available when rotation lock is unavailable.
    void orientation?.lock?.('landscape').catch(() => {});
  }

  async function toggleFullscreen() {
    setFullscreenHint('');
    try {
      if (fullscreenElement()) await exitRemoteFullscreen();
      else await enterFullscreen();
    } catch {
      setFullscreenHint('เบราว์เซอร์นี้เปลี่ยนโหมดเต็มจอไม่ได้ รีโมทยังใช้ได้ตามปกติ');
    }
  }

  function resetInput() {
    stick.current = NEUTRAL_STICK;
    setKeyboardStick(null);
    keys.current = [];
    setStop(value => value + 1);
  }

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = code.toUpperCase().replace(/[\s-]/g, '');
    if (!PAIR_CODE.test(clean)) { setError('กรอกรหัส 8 ตัวตามที่เห็นบนคอม'); return; }
    setJoining(true);
    setError('');
    void enterFullscreen().catch(() => {});
    try {
      const data = await remoteRequest<{ secret: string; display: PhoneDisplay }>({ op: 'join', code: clean }, AbortSignal.timeout(4000));
      setDisplay(data.display);
      chooseCamera('off');
      setPair({ code: clean, secret: data.secret });
      nextId.current = 0;
      resetInput();
      if (location.hash) history.replaceState(null, '', location.pathname);
    } catch (cause) {
      setError(cause instanceof RemoteError ? cause.message : 'ติดต่อคอมไม่ได้ เช็กว่าอยู่ Wi-Fi วงเดียวกัน');
      void exitRemoteFullscreen().catch(() => {});
    } finally { setJoining(false); }
  }

  useEffect(() => {
    if (!pair) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let lastReply = performance.now();
    let live = false;
    const neutral = () => { resetInput(); };
    document.addEventListener('visibilitychange', neutral);
    window.addEventListener('blur', neutral);
    window.addEventListener('orientationchange', neutral);
    function beforeLeave() {
      const body = new Blob([JSON.stringify({ op: 'leave', ...pair })], { type: 'application/json' });
      navigator.sendBeacon('/api/simulator/phone', body);
    }
    window.addEventListener('pagehide', beforeLeave);

    async function send() {
      try {
        const data = await remoteRequest<{ display: PhoneDisplay; accepted: number }>({ op: 'input', ...pair,
          camera: document.hidden ? 'off' : cameraRequest.current,
          stick: document.hidden ? NEUTRAL_STICK : stick.current, keys: document.hidden ? [] : keys.current.slice(0, 16) }, AbortSignal.timeout(550));
        if (stopped) return;
        lastReply = performance.now();
        if (!live) { live = true; setNetwork(true); }
        keys.current = keys.current.filter(event => event.id > data.accepted);
        setDisplay(previous => previous.mode === data.display.mode && previous.hint === data.display.hint ? previous : data.display);
      } catch (cause) {
        if (stopped) return;
        if (cause instanceof RemoteError && [403,404].includes(cause.status)) {
          setError(cause.message);
          setPair(null);
          setNetwork(false);
          return;
        }
        if (live && performance.now() - lastReply >= REMOTE_TIMEOUT_MS) {
          live = false;
          setNetwork(false);
          neutral();
        }
      }
      if (!stopped) timer = setTimeout(send, document.hidden ? 300 : 35);
    }
    void send();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', neutral);
      window.removeEventListener('blur', neutral);
      window.removeEventListener('orientationchange', neutral);
      window.removeEventListener('pagehide', beforeLeave);
    };
  }, [pair]);

  function press(key: number) {
    if ((!network && !preview) || showHelp) return;
    if (preview) {
      setLastKey(key);
      if (key === 1) setPreviewMode(mode => mode === 'manual' ? 'code' : 'manual');
      return;
    }
    if (keys.current.length < 16) keys.current.push({ id: ++nextId.current, key });
    navigator.vibrate?.(12);
  }

  function leave() {
    chooseCamera('off');
    if (pair) void remoteRequest({ op: 'leave', ...pair }).catch(() => {});
    resetInput();
    setPair(null);
    setNetwork(false);
    setShowHelp(false);
    if (preview) {
      setPreview(false);
      setLastKey(null);
      if (location.search) history.replaceState(null, '', location.pathname);
    }
    void exitRemoteFullscreen().catch(() => {});
  }

  const pressKey = useRef(press);
  pressKey.current = press;
  const ready = network || preview;
  useEffect(() => {
    if (!ready || showHelp) return;
    const held = new Set<string>();
    const directions = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD']);
    const update = () => {
      const axis = (positive: string, negative: string) => Number(held.has(positive)) - Number(held.has(negative));
      const next = { up: axis('ArrowUp','ArrowDown'), yaw: axis('ArrowRight','ArrowLeft'), forward: axis('KeyW','KeyS'), right: axis('KeyD','KeyA') };
      stick.current = next;
      setKeyboardStick(held.size ? next : null);
    };
    const down = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || (event.target instanceof HTMLElement &&
        event.target.closest('input, textarea, select, [contenteditable="true"]'))) return;
      if (directions.has(event.code)) {
        event.preventDefault();
        held.add(event.code);
        update();
      } else if (!event.repeat && /^Digit[0-9]$/.test(event.code)) {
        event.preventDefault();
        pressKey.current(Number(event.code.slice(-1)) || 10);
      }
    };
    const up = (event: KeyboardEvent) => { if (held.delete(event.code)) update(); };
    const clear = () => { held.clear(); update(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, [ready, showHelp]);

  const hasPicture = !!pair && cameraView !== 'off';
  const kind = preview ? previewMode : display.mode;
  const mode = kind === 'rescue' ? 'ภารกิจกู้ภัย' : kind === 'manual' ? 'บังคับด้วยก้าน' : 'บินตามโค้ด';
  return <main ref={root} className={styles.screen}>
    {!pair && !preview ? <ControllerConnect code={code} busy={joining} error={error} onCode={setCode} onJoin={join}
      onPreview={() => { setPreview(true); setPreviewMode('manual'); resetInput(); }} />
      : <div className={styles.deck} data-picture={hasPicture}>
      {pair && cameraView !== 'off' && <PhoneLiveView key={cameraView} code={pair.code} secret={pair.secret} view={cameraView} />}
      <header className={styles.toolbar}>
        <div className="flex min-w-0 items-center gap-2">
          <Gamepad2 className="hidden size-5 shrink-0 text-brand-blue sm:block" aria-hidden />
          <div className="min-w-0"><h1 className="text-sm font-bold">{mode}</h1>
            <p className="text-xs text-muted-foreground" role="status">{preview ? 'ทดลองรีโมทบนเครื่องนี้' : network ? 'เชื่อมกับคอมแล้ว' : 'กำลังเชื่อมกับคอมใหม่'}</p></div>
        </div>
        <div className={styles.toolbarActions}>
          {pair && <>
            <Button size="sm" variant={hasPicture ? 'default' : 'outline'}
              aria-label={hasPicture ? 'ปิดภาพ' : 'เปิดภาพ'}
              aria-pressed={hasPicture} onClick={() => chooseCamera(hasPicture ? 'off' : lastView.current)}>
              {hasPicture ? <VideoOff aria-hidden /> : <Video aria-hidden />}
              <span className={styles.cameraButtonLabel}>{hasPicture ? 'ปิดภาพ' : 'เปิดภาพ'}</span>
            </Button>
            {hasPicture && <select aria-label="มุมกล้องบนมือถือ" value={cameraView} className={styles.cameraSelect}
              onChange={event => chooseCamera(event.target.value as PhoneView)}>
              {(['chase', 'top', 'side', 'fpv'] as const).map(view =>
                <option key={view} value={view}>{cameraLabels[view]}</option>)}
            </select>}
          </>}
          <Button size="sm" variant="ghost" onClick={() => { resetInput(); setShowHelp(value => !value); }} aria-expanded={showHelp}>วิธีใช้</Button>
          <Button size="icon-sm" variant="outline"
            aria-label={fullScreen ? 'ออกจากเต็มจอ' : 'เปิดเต็มจอ'}
            title={fullScreen ? 'ออกจากเต็มจอ' : 'เปิดเต็มจอ'}
            aria-pressed={fullScreen} onClick={() => void toggleFullscreen()}>
            {fullScreen ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
          </Button>
          <Button size="sm" variant="outline" onClick={leave}>
            <Unplug aria-hidden /> {preview ? 'กลับหน้าเชื่อมต่อ' : 'ตัดการเชื่อมต่อ'}
          </Button>
        </div>
      </header>
      <div className={styles.controls} inert={!ready || showHelp}>
        <Gimbal label="ก้านซ้าย" vertical="ขึ้น / ลง" horizontal="หมุนหัว ↔" stop={stop} keyboard={keyboardStick ? { x: keyboardStick.yaw, y: keyboardStick.up } : undefined}
          onMove={({ x, y }) => { stick.current = { ...stick.current, yaw: x, up: y }; }} />
        <section className={styles.keypad} aria-label="ปุ่มรีโมท">
          {KEYS.map(key => <button type="button" key={key} onPointerDown={event => {
            if (event.button === 0) { event.preventDefault(); press(key); }
          }} onClick={event => { if (event.detail === 0) press(key); }}
            className={styles.key} data-main={key === 1 || key === 2 || key === 8} data-preview-pressed={preview && lastKey === key}
            aria-label={`K${key} ${keyLabel(key, kind)}`}>
            <strong>K{key}</strong>{keyLabel(key, kind) && <small>{keyLabel(key, kind)}</small>}
          </button>)}
        </section>
        <Gimbal label="ก้านขวา" vertical="หน้า / ถอย" horizontal="เลื่อนซ้าย / ขวา" stop={stop} keyboard={keyboardStick ? { x: keyboardStick.right, y: keyboardStick.forward } : undefined}
          onMove={({ x, y }) => { stick.current = { ...stick.current, right: x, forward: y }; }} />
      </div>
      <p className={styles.hint}>{fullscreenHint || (preview ? (lastKey ? `ปุ่มล่าสุด K${lastKey} · ${mode}` : 'ลองลากก้าน หรือใช้ลูกศรและ WASD ส่วนปุ่ม K ใช้เลข 1–0') : network ? display.hint : 'ปล่อยก้านไว้กลาง แล้วรอเชื่อมต่อ')}</p>
      {showHelp && <section className={styles.help} aria-label="วิธีบังคับ">
        <h2 className="font-bold">มองสนามบนคอม ใช้สองนิ้วบังคับ</h2>
        <p>ก้านซ้ายขึ้นลงและหมุนหัว ก้านขวาเดินหน้า ถอย และเลื่อนไปด้านข้าง</p>
        <p>{kind === 'rescue' ? 'ขึ้นบินโดยดึงก้านซ้าย ↘ กับก้านขวา ↙ พร้อมกัน ปุ่ม K ใช้ตามที่โจทย์บอก'
          : 'กด K2 ตั้งศูนย์ กด K8 ขึ้นหรือลงจอด แล้วใช้ K1 สลับไปโหมดโค้ด'}</p>
        <Button size="sm" onClick={() => setShowHelp(false)}>กลับไปบังคับ</Button>
      </section>}
      <span className={styles.rotate}><RotateCw aria-hidden size={13} /> ถือมือถือแนวนอน</span>
    </div>}
  </main>;
}
