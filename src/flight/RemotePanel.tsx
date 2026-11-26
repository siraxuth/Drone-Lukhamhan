'use client';

import { Gamepad2, RotateCcw, Smartphone, Usb } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Button } from '@/components/ui/button';
import type { ManualStick } from './environment';
import { c05FrameReader, c05ToStick, DEFAULT_STICK_REVERSE, openC05Remote, watchC05Remote, type C05RemoteTransport, type C05StickSample, type StickReverse } from './remote-input';
import { NEUTRAL_STICK } from './radio-physics';

type LinkState = 'idle' | 'opening' | 'waiting' | 'connected';
type CalibrationState = 'idle' | 'running' | 'ready';

const STICK_AXES = [
  { key: 'yaw', label: 'หมุนหัว', stick: 'ก้านซ้าย · โยกซ้ายขวา', directions: ['ซ้าย', 'ขวา'] },
  { key: 'up', label: 'ปรับความสูง', stick: 'ก้านซ้าย · ดันขึ้นหรือดึงลง', directions: ['ลง', 'ขึ้น'] },
  { key: 'right', label: 'เลื่อนไปด้านข้าง', stick: 'ก้านขวา · โยกซ้ายขวา', directions: ['ซ้าย', 'ขวา'] },
  { key: 'forward', label: 'เดินหน้าหรือถอยหลัง', stick: 'ก้านขวา · ดันขึ้นหรือดึงลง', directions: ['ถอยหลัง', 'เดินหน้า'] },
] as const;

export type PhoneRemoteReadout = { axes: ManualStick; lastKey: number | null };
export const EMPTY_PHONE_READOUT: PhoneRemoteReadout = { axes: NEUTRAL_STICK, lastKey: null };

export function RemotePanel({ active, locked, calibration, calibrated, onStick, onLost, onKey, onConnectionChange, onCalibrationComplete, rescueMode = false, autoConnect = false, phoneReadout }: {
  active: boolean;
  locked: boolean;
  calibration: CalibrationState;
  calibrated: boolean;
  onStick: (stick: ManualStick) => void;
  onLost: () => void;
  onKey: (key: number) => void;
  onConnectionChange: (connected: boolean) => void;
  onCalibrationComplete: (calibrated: boolean) => void;
  rescueMode?: boolean;
  autoConnect?: boolean;
  phoneReadout?: RefObject<PhoneRemoteReadout>;
}) {
  const [connection, setConnection] = useState<LinkState>('idle');
  const [message, setMessage] = useState('');
  const [axes, setAxes] = useState(NEUTRAL_STICK);
  const [reverse, setReverse] = useState<StickReverse>(DEFAULT_STICK_REVERSE);
  const [lastKey, setLastKey] = useState<number | null>(null);
  const [phone, setPhone] = useState(EMPTY_PHONE_READOUT);
  useEffect(() => {
    if (!phoneReadout) { setPhone(EMPTY_PHONE_READOUT); return; }
    const refresh = () => {
      const next = phoneReadout.current;
      setPhone(previous => previous.lastKey === next.lastKey &&
        STICK_AXES.every(({ key }) => previous.axes[key] === next.axes[key]) ? previous : next);
    };
    refresh();
    const timer = setInterval(refresh, 50);
    return () => clearInterval(timer);
  }, [phoneReadout]);

  const transport = useRef<C05RemoteTransport | null>(null);
  const mounted = useRef(false);
  const watchdog = useRef<number | null>(null);
  const lastSampleAt = useRef(0);
  const openedAt = useRef(0);
  const hasSignal = useRef(false);
  const previousButtonCode = useRef(0);
  const calibrationSamples = useRef<number[][]>([]);
  const previousCalibration = useRef<CalibrationState>('idle');
  const paused = useRef(false);
  const opening = useRef(false);
  const connectRef = useRef<(authorizedOnly?: boolean) => Promise<void>>(async () => {});
  const calibrationRef = useRef(calibration);
  const centersRef = useRef([2048, 2048, 2048, 2048]);
  const activeRef = useRef(active);
  const reverseRef = useRef(reverse);
  const callbacks = useRef({ onStick, onLost, onKey, onConnectionChange, onCalibrationComplete });
  callbacks.current = { onStick, onLost, onKey, onConnectionChange, onCalibrationComplete };
  activeRef.current = active;
  reverseRef.current = reverse;
  calibrationRef.current = calibration;

  const setSignal = (connected: boolean) => {
    if (hasSignal.current === connected) return;
    hasSignal.current = connected;
    callbacks.current.onConnectionChange(connected);
    if (connected) setConnection('connected');
    else if (transport.current) setConnection('waiting');
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (watchdog.current) clearInterval(watchdog.current);
      const current = transport.current;
      transport.current = null;
      void current?.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (calibration === 'running' && previousCalibration.current !== 'running') {
      calibrationSamples.current = [];
      setMessage('ปล่อยก้านไว้ตรงกลาง 3 วินาที');
    }
    if (calibration === 'ready' && previousCalibration.current === 'running') {
      const samples = calibrationSamples.current;
      if (samples.length >= 10) {
        const next = [0, 1, 2, 3].map(index => Math.round(samples.reduce((sum, sample) => sum + sample[index], 0) / samples.length));
        centersRef.current = next;
        setMessage('จำตำแหน่งก้านแล้ว');
        callbacks.current.onCalibrationComplete(true);
      } else {
        setMessage('อ่านก้านได้ไม่ครบ ลองเช็กสายแล้วกด K2 อีกครั้ง');
        callbacks.current.onCalibrationComplete(false);
      }
    }
    previousCalibration.current = calibration;
  }, [calibration]);

  const handleSample = (sample: C05StickSample) => {
    lastSampleAt.current = Date.now();
    setSignal(true);
    setAxes(c05ToStick(sample.adc, centersRef.current, reverseRef.current));
    if (calibrationRef.current === 'running') calibrationSamples.current.push(sample.adc.slice(0, 4));

    // C05 keeps the button event in the 0E telemetry payload. Trigger on the
    // edge only so the 20 Hz stream does not repeat a held key continuously.
    if (!document.hidden && document.hasFocus()) {
      if (sample.buttonCode === 0) previousButtonCode.current = 0;
      else if (sample.buttonCode !== previousButtonCode.current) {
        previousButtonCode.current = sample.buttonCode;
        setLastKey(sample.buttonCode);
        callbacks.current.onKey(sample.buttonCode);
      }
    }

    const focused = document.hasFocus() && !document.hidden;
    if (activeRef.current) callbacks.current.onStick(focused && calibrationRef.current !== 'running'
      ? c05ToStick(sample.adc, centersRef.current, reverseRef.current)
      : NEUTRAL_STICK);
  };

  const connect = async (authorizedOnly = false) => {
    if (opening.current || transport.current) return;
    opening.current = true;
    if (!authorizedOnly) setConnection('opening');
    if (!authorizedOnly) setMessage('กำลังเชื่อมรีโมท USB…');
    let link: C05RemoteTransport | undefined;
    try {
      link = await openC05Remote(authorizedOnly) ?? undefined;
      if (!link) {
        setMessage('เสียบสายแล้วรอเชื่อม ถ้าใช้ครั้งแรกให้กดเลือกรีโมท USB');
        return;
      }
      if (!mounted.current) { await link.close(); return; }
      transport.current = link;
      lastSampleAt.current = 0;
      openedAt.current = Date.now();
      previousButtonCode.current = 0;
      setConnection('waiting');
      setMessage('ลองขยับก้านเพื่อดูว่าเว็บอ่านได้หรือยัง');
      watchdog.current = window.setInterval(() => {
        const now = Date.now();
        if (lastSampleAt.current && now - lastSampleAt.current > 750) {
          if (hasSignal.current) {
            setSignal(false);
            callbacks.current.onLost();
            setAxes(NEUTRAL_STICK);
          }
        } else if (!lastSampleAt.current && now - openedAt.current > 3000) {
          setMessage('ยังอ่านก้านไม่ได้ เช็กว่าสายส่งข้อมูลได้และรีโมทรองรับการส่งค่าก้านผ่าน USB');
        }
      }, 150);

      const readFrames = c05FrameReader();
      while (transport.current === link) {
        const chunk = await link.read();
        if (!chunk) throw new Error('การเชื่อมต่อ USB ถูกตัด');
        for (const sample of readFrames(chunk)) handleSample(sample);
      }
    } catch (error) {
      if (mounted.current && (!link || transport.current === link)) {
        if (error instanceof DOMException && error.name === 'NotFoundError') setMessage('ยกเลิกการเลือกอุปกรณ์ USB');
        else setMessage(error instanceof Error ? error.message : 'เชื่อมรีโมท USB ไม่สำเร็จ');
      }
    } finally {
      if (!link || transport.current === link) {
        if (watchdog.current) clearInterval(watchdog.current);
        watchdog.current = null;
        transport.current = null;
        await link?.close().catch(() => {});
        if (mounted.current) {
          setSignal(false);
          if (link) callbacks.current.onLost();
          setAxes(NEUTRAL_STICK);
          setConnection('idle');
        }
      }
      opening.current = false;
    }
  };

  connectRef.current = connect;

  useEffect(() => {
    if (!autoConnect) return;
    const reconnect = () => {
      if (!paused.current && !document.hidden && !transport.current && !opening.current)
        void connectRef.current(true);
    };
    const stopWatching = watchC05Remote(() => { paused.current = false; reconnect(); });
    reconnect();
    const retry = window.setInterval(reconnect, 2500);
    document.addEventListener('visibilitychange', reconnect);
    return () => {
      clearInterval(retry);
      stopWatching();
      document.removeEventListener('visibilitychange', reconnect);
    };
  }, [autoConnect]);

  const disconnect = async () => {
    paused.current = true;
    const current = transport.current;
    transport.current = null;
    if (watchdog.current) clearInterval(watchdog.current);
    watchdog.current = null;
    await current?.close().catch(() => {});
    setSignal(false);
    callbacks.current.onLost();
    setAxes(NEUTRAL_STICK);
    setConnection('idle');
    setMessage('ตัดการเชื่อมต่อแล้ว');
  };

  const fromPhone = !!phoneReadout;
  const input = fromPhone ? phone.axes : axes;
  const recentKey = fromPhone ? phone.lastKey : lastKey;
  const status = fromPhone ? 'เชื่อมกับมือถือแล้ว'
    : connection === 'connected' ? 'อ่านก้านได้แล้ว'
    : connection === 'waiting' ? 'เสียบสายแล้ว กำลังรอค่าก้าน'
    : connection === 'opening' ? 'กำลังเชื่อมรีโมท'
    : 'ยังไม่ได้เชื่อมรีโมท';
  const SourceIcon = fromPhone ? Smartphone : Gamepad2;

  return <section className="grid min-w-0 gap-3 squircle-2xl border border-line bg-surface-2 p-3" aria-label="ก้านและปุ่มรีโมท">
    <div className="flex flex-wrap items-center gap-2">
      <SourceIcon className="size-4" aria-hidden />
      <h3 className="text-sm font-bold">{fromPhone ? 'รีโมทมือถือ' : 'รีโมท LiteBee Ghost C05'}</h3>
      <span className="ml-auto squircle-xl border border-line bg-surface px-2 py-1 text-xs" role="status">{status}</span>
    </div>
    {(!fromPhone || recentKey !== null) && <div className="flex flex-wrap items-center gap-2">
      {!fromPhone && (connection === 'idle'
        ? <Button type="button" size="sm" onClick={() => { paused.current = false; void connect(); }}><Usb className="size-4" /> เลือกรีโมท USB</Button>
        : <Button type="button" size="sm" variant="outline" disabled={connection === 'opening'} onClick={() => void disconnect()}>
          {connection === 'opening' ? 'กำลังเชื่อม…' : 'ตัดการเชื่อมต่อ'}
        </Button>)}
      {recentKey !== null && <span className="squircle-xl border border-line bg-surface px-2 py-1 text-xs">ปุ่มล่าสุด K{recentKey}</span>}
    </div>}

    <div className="grid min-w-0 grid-cols-2 gap-2" aria-label="ตำแหน่งก้าน">
      {[
        { label: 'ก้านซ้าย', hint: 'หมุนหัวและปรับความสูง', x: input.yaw, y: input.up },
        { label: 'ก้านขวา', hint: 'เลื่อนโดรนไปตามทิศที่โยก', x: input.right, y: input.forward },
      ].map(stick => <div key={stick.label} className="flex min-w-0 items-center gap-2 squircle-xl border border-line bg-surface p-2">
        <div className="relative size-14 shrink-0 squircle-xl border border-line bg-surface-2" aria-hidden>
          <span className="absolute inset-y-1 left-1/2 w-px bg-line" />
          <span className="absolute inset-x-1 top-1/2 h-px bg-line" />
          <span className="absolute size-3 -translate-x-1/2 -translate-y-1/2 squircle-xl border-2 border-surface bg-brand-blue" style={{ left: `${50 + stick.x * 38}%`, top: `${50 - stick.y * 38}%` }} />
        </div>
        <div className="min-w-0"><p className="text-xs font-semibold">{stick.label}</p><p className="text-[11px] leading-4 text-muted-foreground">{stick.hint}</p></div>
      </div>)}
    </div>

      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        {STICK_AXES.map(axis => {
          const value = input[axis.key];
          const percent = Math.round(Math.abs(value) * 100);
          const reversed = reverse[axis.key];
          return <div key={axis.key} className="grid min-w-0 gap-2 squircle-xl border border-line bg-surface p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold">{axis.label}</p>
                <p className="text-[11px] text-muted-foreground">{axis.stick}</p>
              </div>
              <span className="font-mono text-xs tabular-nums">{percent ? `${axis.directions[value < 0 ? 0 : 1]} ${percent}%` : 'กลาง'}</span>
            </div>
            <div className="relative h-2 overflow-hidden squircle-lg bg-surface-2" aria-hidden>
              <span className="absolute left-1/2 top-0 h-full w-px bg-foreground/35" />
              <span className="absolute top-0 h-full bg-brand-blue" style={{ left: `${50 + Math.min(0, value * 50)}%`, width: `${Math.abs(value) * 50}%` }} />
            </div>
            {!fromPhone && <label className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" disabled={locked} checked={reversed} onChange={event => setReverse(current => ({ ...current, [axis.key]: event.target.checked }))} />
              กลับทิศก้าน
            </label>}
          </div>;
        })}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-2 border-t border-line pt-2">
        <div className="min-w-0 text-xs leading-5 text-muted-foreground">
          {rescueMode ? <>
            <p>ขึ้นบินโดยดึงก้านซ้าย ↘ และก้านขวา ↙ ค้างพร้อมกันประมาณ 1 วินาที แล้วปล่อยกลับกลาง</p>
            <p>ก้านซ้ายหมุนหัวและปรับความสูง ก้านขวาบินไปข้างหน้า ถอยหลัง หรือเลื่อนไปด้านข้าง</p>
          </> : <>
            <p>กด K2 แล้วปล่อยก้านไว้กลาง 3 วินาที จากนั้นกด K8 เพื่อขึ้นบิน</p>
            <p>ตอนบิน กด K8 อีกครั้งหรือดึงก้านซ้ายลงสุดเพื่อให้โดรนลงจอดเอง กด K1 เพื่อสลับระหว่างบังคับก้านกับใช้โค้ด</p>
          </>}
          {calibration === 'running' && <p className="font-medium text-foreground" role="status">{rescueMode ? 'กำลังจำตำแหน่งกึ่งกลางของก้าน…' : 'กำลังตั้งศูนย์จากค่าก้าน…'}</p>}
          {!fromPhone && message && <p role="status">{message}</p>}
        </div>
        {calibration === 'ready' && calibrated && <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-foreground"><RotateCcw className="size-3.5" /> {rescueMode ? 'จำก้านแล้ว' : 'ตั้งศูนย์แล้ว'}</span>}
      </div>
    </section>;
}
