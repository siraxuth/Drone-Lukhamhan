'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Aperture, ArrowRight, Camera, Gamepad2, ImagePlus, Keyboard, Monitor, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import styles from './phone-controller.module.css';

export const PAIR_CODE = /^[2-9A-HJ-NP-Z]{8}$/;

function readPairing(value: string) {
  const code = value.trim().toUpperCase();
  if (PAIR_CODE.test(code)) return { code, url: null };
  try {
    const url = new URL(value);
    const code = url.hash.slice(1).toUpperCase();
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password &&
      url.pathname === '/simulator/controller' && PAIR_CODE.test(code)) return { code, url };
  } catch { /* A different type of QR code. */ }
  return null;
}

type ConnectProps = {
  code: string;
  busy: boolean;
  error: string;
  onCode: (code: string) => void;
  onJoin: (event: FormEvent<HTMLFormElement>) => void;
  onPreview: () => void;
};

export function ControllerConnect({ code, busy, error, onCode, onJoin, onPreview }: ConnectProps) {
  const [method, setMethod] = useState<'code' | 'scan'>('code');
  const [camera, setCamera] = useState(false);
  const [liveCameraAvailable, setLiveCameraAvailable] = useState(true);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const pendingCamera = useRef<Promise<MediaStream> | null>(null);
  const [scanHint, setScanHint] = useState('');
  const [scannedUrl, setScannedUrl] = useState<URL | null>(null);
  const [reading, setReading] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLiveCameraAvailable(window.isSecureContext && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  function openCamera() {
    if (!liveCameraAvailable || !navigator.mediaDevices?.getUserMedia) {
      photoInput.current?.click();
      return;
    }
    // Ask inside the tap handler so the request still belongs to the user's gesture.
    const request = navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } }, audio: false,
    });
    pendingCamera.current = request;
    void request.catch(() => {});
    setCamera(true);
  }

  function accept(value: string) {
    const pairing = readPairing(value);
    if (!pairing) {
      setScanHint('QR นี้ไม่ใช่รหัสของสนาม ลองสแกน QR ที่อยู่บนคอม');
      return false;
    }
    setCamera(false);
    const url = pairing.url;
    if (url && url.origin !== location.origin) {
      setScannedUrl(url);
      setScanHint('');
      return true;
    }
    setScannedUrl(null);
    onCode(pairing.code);
    setMethod('code');
    return true;
  }
  const acceptRef = useRef(accept);
  acceptRef.current = accept;

  useEffect(() => {
    const request = pendingCamera.current;
    if (!camera || !request) return;
    let stopped = false;
    let stream: MediaStream | undefined;
    let frame = 0;

    async function start(request: Promise<MediaStream>) {
      const element = video.current;
      if (!element) return;
      try {
        const media = await request;
        if (stopped) { media.getTracks().forEach(track => track.stop()); return; }
        stream = media;
        element.srcObject = media;
        await element.play();
        const { default: decode } = await import('jsqr');
        if (stopped) return;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Cannot read camera');
        setScanHint('เล็ง QR ให้อยู่กลางกรอบ');
        let previous = 0;
        function scan(now: number) {
          if (stopped || !element) return;
          if (element.videoWidth && now - previous > 135) {
            previous = now;
            const scale = Math.min(1, 600 / Math.max(element.videoWidth, element.videoHeight));
            canvas.width = Math.round(element.videoWidth * scale);
            canvas.height = Math.round(element.videoHeight * scale);
            context!.drawImage(element, 0, 0, canvas.width, canvas.height);
            const image = context!.getImageData(0, 0, canvas.width, canvas.height);
            const result = decode(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
            if (result && acceptRef.current(result.data)) return;
          }
          frame = requestAnimationFrame(scan);
        }
        frame = requestAnimationFrame(scan);
      } catch (cause) {
        if (stopped) return;
        setCameraBlocked(true);
        setScanHint(cause instanceof DOMException && cause.name === 'NotAllowedError'
          ? 'กล้องถูกปิดไว้ในสิทธิ์ของเว็บ เปิดสิทธิ์แล้วลองสแกนอีกครั้ง หรือถ่ายรูป QR แทน'
          : 'เปิดกล้องในเว็บไม่ได้ ลองถ่ายรูป QR หรือเลือกภาพจากเครื่อง');
        setCamera(false);
      }
    }

    void start(request);
    const stopWhenHidden = () => { if (document.hidden) setCamera(false); };
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', stopWhenHidden);
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach(track => track.stop());
      if (pendingCamera.current === request) pendingCamera.current = null;
    };
  }, [camera]);

  async function readImage(image: File) {
    setCamera(false);
    setReading(true);
    setScannedUrl(null);
    setScanHint('กำลังอ่าน QR จากภาพ');
    const url = URL.createObjectURL(image);
    try {
      const photo = new Image();
      photo.src = url;
      const [{ default: decode }] = await Promise.all([import('jsqr'), photo.decode()]);
      const scale = Math.min(1, 1300 / Math.max(photo.naturalWidth, photo.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(photo.naturalWidth * scale);
      canvas.height = Math.round(photo.naturalHeight * scale);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Cannot read image');
      context.drawImage(photo, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = decode(pixels.data, pixels.width, pixels.height);
      if (result) accept(result.data);
      else setScanHint('อ่าน QR จากภาพนี้ไม่ได้ ลองใช้ภาพที่เห็น QR ครบทั้งกรอบ');
    } catch {
      setScanHint('เปิดภาพนี้ไม่ได้ ลองเลือกภาพอื่น');
    } finally {
      URL.revokeObjectURL(url);
      setReading(false);
    }
  }

  return <div className={styles.connectionPage}>
    <div className={styles.connectionStage}>
      <section className={styles.connectionIntro}>
        <div className={styles.connectionBrand}><Gamepad2 aria-hidden className="size-5" /> สนามโดรนจำลอง</div>
        <h1>เชื่อมรีโมท<br className="hidden sm:block" /> เข้าสนาม</h1>
        <p>ให้คอมเปิดสนามไว้ แล้วใช้มือถือเป็นรีโมท จะสแกน QR หรือกรอกรหัสก็ได้</p>
        <div className={styles.connectionDiagram} aria-hidden>
          <div><Monitor size={24} /><b>คอม</b><small>เปิดสนาม</small></div>
          <span />
          <div><Gamepad2 size={24} /><b>รีโมท</b><small>กดปุ่มและขยับก้าน</small></div>
        </div>
      </section>
      <section aria-label="เลือกวิธีเชื่อมต่อ" className={styles.connectionCard}>
        <div className="grid grid-cols-2 gap-1 squircle-xl border border-line bg-surface-2 p-1">
          <Button type="button" variant={method === 'code' ? 'default' : 'ghost'} aria-pressed={method === 'code'} disabled={busy} onClick={() => { setCamera(false); setMethod('code'); }}>
            <Keyboard aria-hidden /> กรอกรหัส
          </Button>
          <Button type="button" variant={method === 'scan' ? 'default' : 'ghost'} aria-pressed={method === 'scan'} disabled={busy} onClick={() => setMethod('scan')}>
            <ScanLine aria-hidden /> สแกน QR
          </Button>
        </div>
        {method === 'code' ? <form className="grid gap-4" onSubmit={onJoin}>
          <label className="grid gap-2 text-sm font-semibold">รหัสบนคอม
            <input autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={10}
              value={code} onChange={event => onCode(event.target.value.toUpperCase())} placeholder="กรอกรหัส 8 ตัว"
              className="h-12 w-full squircle-xl border border-line bg-surface-2 px-3 font-mono text-base focus-visible:outline-2 focus-visible:outline-brand-blue" />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={busy}>{busy ? 'กำลังเชื่อม' : 'เชื่อมแล้วเปิดรีโมท'} <ArrowRight aria-hidden /></Button>
        </form> : <div className="grid gap-3">
          {camera ? <div className={styles.cameraFrame}><video ref={video} playsInline muted /><span aria-hidden /></div>
            : <div className={styles.scanEmpty}><Aperture size={28} aria-hidden /><span>สแกน QR ที่คอมแสดงไว้</span></div>}
          {scanHint && <p role="status" className="text-sm text-muted-foreground">{scanHint}</p>}
          {scannedUrl && <a href={scannedUrl.href} className="block break-all text-sm font-semibold underline">เปิดหน้าที่สแกนได้ · {scannedUrl.host}</a>}
          <div className="grid gap-2 min-[420px]:grid-cols-2">
            <Button type="button" variant={camera ? 'outline' : 'default'} disabled={reading} onClick={() => {
              setScannedUrl(null);
              if (!liveCameraAvailable || cameraBlocked) {
                photoInput.current?.click();
                return;
              }
              setScanHint(camera ? '' : 'กำลังขอเปิดกล้อง');
              if (camera) setCamera(false);
              else openCamera();
            }}><Camera aria-hidden /> {camera ? 'ปิดกล้อง' : !liveCameraAvailable || cameraBlocked ? 'ถ่ายรูป QR' : 'เปิดกล้องสแกน'}</Button>
            <Button type="button" variant="outline" disabled={reading} onClick={() => file.current?.click()}><ImagePlus aria-hidden /> เลือกภาพ QR</Button>
            <input ref={file} type="file" accept="image/*" hidden onChange={event => {
              const image = event.currentTarget.files?.[0];
              if (image) void readImage(image);
              event.currentTarget.value = '';
            }} />
            <input ref={photoInput} type="file" accept="image/*" capture="environment" hidden onChange={event => {
              const image = event.currentTarget.files?.[0];
              if (image) void readImage(image);
              event.currentTarget.value = '';
            }} />
          </div>
          {!liveCameraAvailable && <p className="text-sm text-muted-foreground">ลิงก์นี้เปิดกล้องในเว็บไม่ได้ กดถ่ายรูป QR แล้วเว็บจะอ่านจากรูปให้</p>}
          {liveCameraAvailable && cameraBlocked && <Button type="button" variant="ghost" disabled={reading} onClick={() => {
            setCameraBlocked(false);
            setScanHint('กำลังขอเปิดกล้อง');
            openCamera();
          }}>ลองเปิดกล้องในเว็บอีกครั้ง</Button>}
        </div>}
        <div className="grid gap-2 border-t border-line pt-4">
          <Button type="button" variant="outline" disabled={busy || reading} onClick={onPreview}><Gamepad2 aria-hidden /> ทดลองก้านและปุ่มบนเครื่องนี้</Button>
          <p className="text-center text-xs text-muted-foreground">ดูหน้าตารีโมทได้ทันที โดยไม่ต้องกรอกรหัส</p>
        </div>
      </section>
    </div>
  </div>;
}
