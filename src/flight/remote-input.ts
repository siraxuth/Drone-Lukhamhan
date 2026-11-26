import type { ManualStick } from './environment';

const CP210X = { usbVendorId: 0x10c4, usbProductId: 0xea60 };
const REQUESTS = [
  Uint8Array.of(0xfd, 0xfd, 0x01, 0xe9), // identify
  Uint8Array.of(0xfd, 0xfd, 0x01, 0x0d), // version
  Uint8Array.of(0xfd, 0xfd, 0x01, 0x0e), // C05 ADC telemetry
];
const ADC_REQUEST = REQUESTS[2];
const ADC_CHANNELS = 6;
const ADC_MAX = 4095;
const ADC_REF_MIN = 3000;

type SerialPortLike = {
  connected?: boolean;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo?(): { usbVendorId?: number; usbProductId?: number };
  open(options: { baudRate: number; dataBits: 8; stopBits: 1; parity: 'none' }): Promise<void>;
  close(): Promise<void>;
};

type C05Serial = EventTarget & {
  requestPort(options: { filters: typeof CP210X[] }): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
};

type C05Navigator = Navigator & {
  serial?: C05Serial;
};

export type C05StickSample = {
  /** ADC order: right X, right Y, left X, left Y, references. */
  adc: [number, number, number, number, number, number];
  /** Firmware event byte observed in the 0E payload; 0 means no button event. */
  buttonCode: number;
};

export type StickReverse = Record<keyof ManualStick, boolean>;

export type C05RemoteTransport = {
  read(): Promise<Uint8Array | undefined>;
  close(): Promise<void>;
};

/** Legacy normalized-axis helper kept for existing flight-math consumers. */
export function axisValue(raw: number, center: number, inverted: boolean): number {
  const offset = raw - center;
  const span = Math.max(0.25, offset < 0 ? 1 + center : 1 - center);
  const amount = Math.max(0, (Math.min(1, Math.abs(offset) / span) - 0.07) / 0.93);
  const value = amount * (0.7 + 0.3 * amount ** 2);
  return Math.round(Math.sign(offset) * value * (inverted ? -1 : 1) * 100) / 100 || 0;
}

/** Legacy status-frame counter; the C05 page uses c05FrameReader instead. */
export function liteBeeStatusReader() {
  let pending = new Uint8Array();
  return (chunk: Uint8Array) => {
    const bytes = new Uint8Array(pending.length + chunk.length);
    bytes.set(pending);
    bytes.set(chunk, pending.length);
    let offset = 0;
    let replies = 0;
    let version: number | undefined;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xdc) { offset++; continue; }
      if (offset + 1 >= bytes.length) break;
      if (bytes[offset + 1] !== 0xba) { offset++; continue; }
      if (offset + 2 >= bytes.length) break;
      const length = bytes[offset + 2];
      if (length === 0) { offset += 3; continue; }
      const end = offset + 3 + length;
      if (end > bytes.length) break;
      const command = bytes[offset + 3];
      if (command === 0xe9 && length === 2 || command === 0x0d && length >= 3 || command === 0x0e && length >= 20) replies++;
      if (command === 0x0d && length >= 3) version = bytes[offset + 5];
      offset = end;
    }
    pending = bytes.slice(offset);
    return { replies, version };
  };
}

/** Parse FC FC LEN PAYLOAD replies and retain partial frames between USB reads. */
export function c05FrameReader() {
  let pending = new Uint8Array();

  return (chunk: Uint8Array): C05StickSample[] => {
    const bytes = new Uint8Array(pending.length + chunk.length);
    bytes.set(pending);
    bytes.set(chunk, pending.length);

    const samples: C05StickSample[] = [];
    let offset = 0;
    while (offset + 2 < bytes.length) {
      if (bytes[offset] !== 0xfc || bytes[offset + 1] !== 0xfc) {
        offset++;
        continue;
      }

      const length = bytes[offset + 2];
      if (length > 80) {
        offset++;
        continue;
      }
      const end = offset + 3 + length;
      if (end > bytes.length) break;

      const payload = bytes.slice(offset + 3, end);
      offset = end;
      if (payload.length !== 31 || payload[0] !== 0x0e) continue;

      const view = new DataView(payload.buffer, payload.byteOffset + 1, ADC_CHANNELS * 2);
      const adc = Array.from({ length: ADC_CHANNELS }, (_, index) => view.getUint16(index * 2, true)) as C05StickSample['adc'];
      // The experimental C05 patch puts the six ADC samples into 0E. The last
      // two reference channels distinguish it from stock zero-filled telemetry.
      if (adc.some(value => value > ADC_MAX) || adc[4] < ADC_REF_MIN || adc[5] < ADC_REF_MIN) continue;

      const event = payload[14];
      samples.push({ adc, buttonCode: event >= 1 && event <= 10 ? event : 0 });
    }

    pending = bytes.slice(offset);
    if (pending.length > 128) pending = pending.slice(-2);
    return samples;
  };
}

function isC05Port(port: SerialPortLike) {
  const info = port.getInfo?.();
  return info?.usbVendorId === CP210X.usbVendorId && info.usbProductId === CP210X.usbProductId;
}

let preferredPort: SerialPortLike | undefined;

/** Listen only for the supported CP210x bridge; the browser still needs one-time permission. */
export function watchC05Remote(onConnect: () => void) {
  const serial = (navigator as C05Navigator).serial;
  if (!serial) return () => {};
  const handleConnect = (event: Event) => {
    const port = (event as Event & { port?: SerialPortLike }).port ?? event.target as SerialPortLike | null;
    if (port && isC05Port(port)) { preferredPort = port; onConnect(); }
  };
  serial.addEventListener('connect', handleConnect);
  return () => serial.removeEventListener('connect', handleConnect);
}

/** Open a previously allowed C05 automatically, or ask once when the user clicks Connect. */
export async function openC05Remote(authorizedOnly = false): Promise<C05RemoteTransport | null> {
  const serial = (navigator as C05Navigator).serial;
  if (!serial) throw new Error('เบราว์เซอร์นี้อ่านรีโมทผ่าน USB ไม่ได้ · เปิดหน้านี้ด้วย Chrome หรือ Edge');

  const candidates = (await serial.getPorts()).filter(p => isC05Port(p) && p.connected !== false);
  if (!candidates.length) {
    if (authorizedOnly) return null;
    candidates.push(await serial.requestPort({ filters: [CP210X] }));
  }
  candidates.sort((a,b) => Number(b === preferredPort) - Number(a === preferredPort));
  let port: SerialPortLike | undefined;
  for (const candidate of candidates) {
    try {
      await candidate.open({ baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none' });
      port = candidate;
      preferredPort = candidate;
      break;
    } catch {
      // Another tab may own this port. Try any other granted CP210x ports.
    }
  }
  if (!port) throw new Error('พบรีโมทที่อนุญาตแล้ว แต่เปิดพอร์ตไม่ได้ · ปิดแท็บหรือโปรแกรมที่ใช้รีโมท แล้วรอสักครู่');
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
  let pollTimer: number | undefined;
  let writeQueue = Promise.resolve();

  try {
    if (!port.readable || !port.writable) throw new Error('พอร์ต USB ของรีโมทเปิดอ่านไม่ได้');
    reader = port.readable.getReader();
    writer = port.writable.getWriter();

    for (const request of REQUESTS) await writer.write(request);
    pollTimer = window.setInterval(() => {
      writeQueue = writeQueue.then(() => writer?.write(ADC_REQUEST)).then(() => undefined);
      void writeQueue.catch(() => {});
    }, 50);

    return {
      read: async () => {
        const result = await reader!.read();
        return result.done ? undefined : result.value;
      },
      close: async () => {
        if (pollTimer !== undefined) window.clearInterval(pollTimer);
        await writeQueue.catch(() => {});
        try { await reader?.cancel(); } catch { /* unplugged */ }
        try { reader?.releaseLock(); } catch { /* already released */ }
        try { writer?.releaseLock(); } catch { /* already released */ }
        try { await port.close(); } catch { /* already closed */ }
      },
    };
  } catch (error) {
    try { await reader?.cancel(); } catch { /* opening failed */ }
    try { reader?.releaseLock(); } catch { /* not acquired */ }
    try { writer?.releaseLock(); } catch { /* not acquired */ }
    try { await port.close(); } catch { /* opening failed */ }
    throw error;
  }
}

/** Convert the C05 ADC order to a Mode 2 flight-control stick with deadzone. */
export function c05ToStick(adc: C05StickSample['adc'], centers: number[], reverse: StickReverse): ManualStick {
  const convert = (index: number, inverted: boolean) => {
    const center = centers[index] ?? 2048;
    const delta = adc[index] - center;
    const span = Math.max(1, delta < 0 ? center : ADC_MAX - center);
    const normalized = Math.max(-1, Math.min(1, delta / span));
    const magnitude = Math.max(0, (Math.abs(normalized) - 0.04) / 0.96);
    const shaped = magnitude * (0.7 + 0.3 * magnitude ** 2);
    return Math.round(Math.sign(normalized) * shaped * (inverted ? -1 : 1) * 100) / 100 || 0;
  };

  return {
    yaw: convert(2, reverse.yaw),       // left stick X
    up: convert(3, reverse.up),         // left stick Y
    right: convert(0, reverse.right),   // right stick X
    forward: convert(1, reverse.forward), // right stick Y
  };
}

export const DEFAULT_STICK_REVERSE: StickReverse = {
  yaw: false,
  up: true,
  right: false,
  forward: false,
};
