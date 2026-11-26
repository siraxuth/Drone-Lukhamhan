'use client';

import { useEffect, useRef, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { REMOTE_TIMEOUT_MS, STICK_TIMEOUT_MS, RemoteError, remoteRequest, type PhoneDisplay, type PhoneInput, type PhonePair } from './phone-remote';
import { NEUTRAL_STICK } from './radio-physics';
import type { ManualStick } from './environment';

type Props = {
  display: PhoneDisplay;
  locked?: boolean;
  onConnection: (connected: boolean) => void;
  onStick: (stick: ManualStick) => void;
  onKey: (key: number) => void;
};

export function PhoneRemoteHost({ display, locked, onConnection, onStick, onKey }: Props) {
  const [open, setOpen] = useState(false);
  const [pair, setPair] = useState<PhonePair | null>(null);
  const [connected, setConnected] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const props = useRef({ display, onConnection, onStick, onKey });
  props.current = { display, onConnection, onStick, onKey };

  async function create() {
    if (pair || creating) return;
    setCreating(true);
    setError('');
    try { setPair(await remoteRequest<PhonePair>({ op: 'create' })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'เปิดรหัสไม่ได้'); }
    finally { setCreating(false); }
  }

  useEffect(() => {
    if (!pair) return;
    let stopped = false;
    let linked = false;
    let lastResponse = performance.now();
    let received = 0;
    let timer: ReturnType<typeof setTimeout>;
    const { code, secret } = pair;
    const setLink = (live: boolean) => {
      if (live === linked) return;
      linked = live;
      setConnected(live);
      props.current.onConnection(live);
    };

    async function poll() {
      try {
        const state = await remoteRequest<PhoneInput>({ op: 'poll', code, secret, received, display: props.current.display }, AbortSignal.timeout(600));
        if (stopped) return;
        lastResponse = performance.now();
        setLink(state.connected);
        if (state.connected) {
          if (document.hidden) {
            props.current.onStick(NEUTRAL_STICK);
          } else {
            props.current.onStick(state.stick);
            for (const event of state.keys) {
              if (event.id > received) props.current.onKey(event.key);
            }
          }
          received = state.keys.at(-1)?.id ?? received;
        }
      } catch (cause) {
        if (stopped) return;
        if (cause instanceof RemoteError && [403, 404].includes(cause.status)) {
          setError(cause.message);
          setPair(null);
          return;
        }
      }
      if (!stopped) timer = setTimeout(poll, linked ? 35 : 240);
    }

    void poll();
    const watchdog = setInterval(() => {
      if (!linked) return;
      const age = performance.now() - lastResponse;
      if (age >= STICK_TIMEOUT_MS) props.current.onStick(NEUTRAL_STICK);
      if (age >= REMOTE_TIMEOUT_MS) setLink(false);
    }, 150);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(watchdog);
      setLink(false);
      void fetch(PHONE_REMOTE_API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'close', code, secret }), keepalive: true }).catch(() => {});
    };
  }, [capture, pair]);

  return <Dialog open={open} onOpenChange={setOpen}>
    <Button type="button" variant={connected ? 'default' : 'outline'} size="sm" disabled={locked && !pair} onClick={() => {
      if (document.pointerLockElement) document.exitPointerLock();
      setOpen(true);
      void create();
    }}>
      <Smartphone aria-hidden /> {connected ? 'มือถือเชื่อมแล้ว' : 'ใช้มือถือเป็นรีโมท'}
    </Button>
    <DialogContent className="z-[150] max-h-[calc(100dvh-2rem)] overflow-y-auto squircle-3xl sm:max-w-md" overlayClassName="z-[149]" showCloseButton={false}>
      <div className="grid gap-1">
        <DialogTitle>ใช้มือถือเป็นรีโมท</DialogTitle>
        <DialogDescription>เปิด QR บนมือถือ หรือเปิดรีโมทอีกหน้าต่างเพื่อลองบนคอม</DialogDescription>
      </div>
      {pair && <>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 squircle-2xl border border-line bg-surface-2 p-3">
          <img src={pair.qr} alt="QR สำหรับเปิดรีโมทบนมือถือ" width={124} height={124} className="size-[124px] squircle-xl" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">รหัสสำหรับกรอกเอง</p>
            <p className="select-all font-mono text-xl font-bold">{pair.code.slice(0,4)} {pair.code.slice(4)}</p>
            <p className="mt-2 text-sm font-semibold" role="status">{connected ? 'มือถือเชื่อมแล้ว เปิดเต็มจอบนมือถือได้เลย' : 'รอมือถือเชื่อม'}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => {
          window.open(`/simulator/controller#${pair.code}`, 'simulator-controller', 'popup,width=940,height=460,noopener,noreferrer');
          setOpen(false);
        }}><Monitor aria-hidden /> เปิดรีโมทบนคอมเครื่องนี้</Button>
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">เปิดด้วยลิงก์และรหัส</summary>
          <p className="my-2 text-muted-foreground">เปิดลิงก์นี้บนมือถือแล้วกรอกรหัสด้านบน ถ้าเปิดลิงก์แรกไม่ได้ ให้ลองลิงก์ถัดไป หรือต่อ Wi-Fi วงเดียวกับคอม</p>
          {pair.addresses.map(address => <a key={address} className="block break-all py-1 underline" href={address} target="_blank" rel="noreferrer">{address}</a>)}
        </details>
      </>}
      {creating && <p role="status">กำลังเตรียมรหัส</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <div className="flex flex-wrap justify-between gap-2">
        {pair ? <Button variant="outline" onClick={() => setPair(null)}>ตัดการเชื่อมต่อ</Button>
          : <Button variant="outline" disabled={creating} onClick={() => void create()}>เปิดรหัสเชื่อมต่อ</Button>}
        <DialogClose render={<Button />}>กลับไปที่สนาม</DialogClose>
      </div>
    </DialogContent>
  </Dialog>;
}
