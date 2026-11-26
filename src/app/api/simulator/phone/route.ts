import { networkInterfaces } from 'node:os';
import { randomBytes, randomInt } from 'node:crypto';
import { z } from 'zod';
import QRCode from 'qrcode';
import { NEUTRAL_STICK } from '@/flight/radio-physics';
import { REMOTE_TIMEOUT_MS, STICK_TIMEOUT_MS, PHONE_VIEWS, type PhoneView, type PhoneDisplay, type PhoneKey } from '@/flight/phone-remote';
import type { ManualStick } from '@/flight/environment';

export const runtime = 'nodejs';

type Pairing = {
  secret: string;
  hostSeen: number;
  phoneSeen: number;
  phone?: string;
  stick: ManualStick;
  keys: Array<PhoneKey & { received: number }>;
  keyId: number;
  eventId: number;
  display: PhoneDisplay;
  camera: PhoneView;
  frame?: { id: number; bytes: ArrayBuffer };
};

const HOST_TIMEOUT = 60_000;
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_SESSIONS = 128;
// Keep pairing on the Next process serving the simulator.
const sessions = new Map<string, Pairing>();
const codeSchema = z.string().regex(/^[2-9A-HJ-NP-Z]{8}$/);
const secretSchema = z.string().length(48);
const credentials = { code: codeSchema, secret: secretSchema };
const cameraSchema = z.enum(PHONE_VIEWS);
const axis = z.number().min(-1).max(1);
const stickSchema = z.object({ yaw: axis, up: axis, right: axis, forward: axis });
const display = z.object({ mode: z.enum(['manual','code','rescue']), hint: z.string().max(180) });
const packet = z.discriminatedUnion('op', [
  z.object({ op: z.literal('create') }),
  z.object({ op: z.literal('join'), code: codeSchema }),
  z.object({ op: z.literal('poll'), ...credentials, received: z.int().nonnegative(), display }),
  z.object({ op: z.literal('input'), ...credentials, camera: cameraSchema.default('off'), stick: stickSchema, keys: z.array(z.object({
    id: z.int().positive(), key: z.int().min(1).max(10),
  })).max(16) }),
  z.object({ op: z.literal('close'), ...credentials }),
  z.object({ op: z.literal('leave'), ...credentials }),
]);

function phoneAddresses(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get('host');
  if (host) {
    try { const incoming = new URL(`${url.protocol}//${host}`); url.host = incoming.host; } catch { /* use request origin */ }
  }
  if (!['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(url.hostname)) return [url.origin];
  const interfaces = Object.entries(networkInterfaces()).sort(([a], [b]) =>
    Number(/^wl/i.test(b)) - Number(/^wl/i.test(a)));
  const local = interfaces.flatMap(([, addresses]) => (addresses ?? []).filter(address =>
    address.family === 'IPv4' && !address.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address.address) &&
    address.netmask !== '255.255.255.255').map(address => `${url.protocol}//${address.address}${url.port ? ':' + url.port : ''}`));
  return Array.from(new Set(local));
}

function json(body: object, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const type = request.headers.get('content-type') ?? '';
  if (!type.startsWith('application/json') || Number(request.headers.get('content-length')) > 4096) return json({ error: 'คำขอไม่ถูกต้อง' }, 400);
  const raw = await request.json().catch(() => null);
  const parsed = packet.safeParse(raw);
  if (!parsed.success) return json({ error: 'ตรวจรหัสเชื่อมต่ออีกครั้ง' }, 400);
  const msg = parsed.data;
  const now = Date.now();
  if (msg.op === 'create') {
    for (const [code, entry] of sessions) if (now - entry.hostSeen > HOST_TIMEOUT) sessions.delete(code);
    if (sessions.size >= MAX_SESSIONS) return json({ error: 'ตอนนี้มีคนใช้เยอะ ลองใหม่อีกครั้ง' }, 503);
    const addresses = phoneAddresses(request);
    if (!addresses.length) return json({ error: 'คอมยังไม่มีที่อยู่บนเครือข่าย ลองต่อ Wi-Fi หรือสาย LAN ก่อน' }, 409);
    let code: string;
    do { code = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(''); }
    while (sessions.has(code));
    const secret = randomBytes(24).toString('hex');
    sessions.set(code, { secret, hostSeen: now, phoneSeen: 0, stick: NEUTRAL_STICK, keys: [], keyId: 0, eventId: 0, camera: 'off',
      display: { mode: 'manual', hint: 'รอเชื่อมต่อ' } });
    const paths = addresses.map(origin => `${origin}/simulator/controller`);
    const url = `${paths[0]}#${code}`;
    return json({ code, secret, addresses: paths, url, qr: await QRCode.toDataURL(url, { margin: 3, width: 280 }) });
  }

  const session = sessions.get(msg.code);
  if (!session || now - session.hostSeen > HOST_TIMEOUT) return json({ error: 'รหัสหมดอายุ เปิดรหัสใหม่บนคอม' }, 404);
  const connected = !!session.phone && now - session.phoneSeen < REMOTE_TIMEOUT_MS;
  if (msg.op === 'join') {
    if (connected || session.phone && now - session.phoneSeen < 4000) return json({ error: 'รหัสนี้มีมือถือใช้อยู่แล้ว' }, 409);
    session.phone = randomBytes(24).toString('hex');
    session.phoneSeen = now;
    session.stick = NEUTRAL_STICK;
    session.keys = [];
    session.keyId = 0;
    session.camera = 'off';
    session.frame = undefined;
    return json({ secret: session.phone, display: session.display });
  }
  if (msg.op === 'poll' || msg.op === 'close') {
    if (msg.secret !== session.secret) return json({ error: 'เปิดรหัสเชื่อมต่อใหม่บนคอม' }, 403);
    if (msg.op === 'close') { sessions.delete(msg.code); return json({ ok: true }); }
    session.hostSeen = now;
    session.display = msg.display;
    session.keys = session.keys.filter(event => event.id > msg.received && now - event.received < STICK_TIMEOUT_MS);
    return json({ connected, stick: connected && now - session.phoneSeen < STICK_TIMEOUT_MS ? session.stick : NEUTRAL_STICK, keys: connected ? session.keys : [], camera: connected ? session.camera : 'off' });
  }
  if (msg.secret !== session.phone) return json({ error: 'มือถืออีกเครื่องเชื่อมต่อแล้ว' }, 403);
  if (msg.op === 'leave') {
    session.phone = undefined;
    session.frame = undefined;
    session.camera = 'off';
    session.phoneSeen = 0;
    session.stick = NEUTRAL_STICK;
    session.keys = [];
    return json({ ok: true });
  }
  if (msg.op !== 'input') return json({ error: 'คำขอไม่ถูกต้อง' }, 400);
  session.phoneSeen = now;
  session.stick = msg.stick;
  if (session.camera !== msg.camera) {
    session.camera = msg.camera;
    session.frame = undefined;
  }
  for (const event of msg.keys) {
    if (event.id <= session.keyId) continue;
    session.keys.push({ key: event.key, id: ++session.eventId, received: now });
    session.keyId = event.id;
  }
  session.keys = session.keys.slice(-32);
  return json({ display: session.display, accepted: session.keyId });
}

const FRAME_BYTES_MAX = 180_000;
const NO_STORE = { 'Cache-Control': 'no-store' };

function frameSession(request: Request) {
  const code = request.headers.get('X-Pair-Code');
  const session = code ? sessions.get(code) : undefined;
  if (!session || Date.now() - session.hostSeen > HOST_TIMEOUT ||
    !session.phone || Date.now() - session.phoneSeen > REMOTE_TIMEOUT_MS) return null;
  return session;
}

export async function PUT(request: Request) {
  const session = frameSession(request);
  if (!session || request.headers.get('Authorization') !== `Bearer ${session.secret}`)
    return new Response(null, { status: 403 });
  const view = request.headers.get('X-Camera-View');
  if (session.camera === 'off' || session.camera !== view) return new Response(null, { status: 204 });
  if (request.headers.get('Content-Type') !== 'image/jpeg' ||
      Number(request.headers.get('Content-Length')) > FRAME_BYTES_MAX) return new Response(null, { status: 400 });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > FRAME_BYTES_MAX) { await reader.cancel(); return new Response(null, { status: 413 }); }
      chunks.push(value);
    }
  } catch { return new Response(null, { status: 400 }); }
  if (session.camera !== view || frameSession(request) !== session) return new Response(null, { status: 204 });
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return new Response(null, { status: 400 });
  session.frame = { id: Date.now(), bytes: bytes.buffer };
  return new Response(null, { status: 204, headers: NO_STORE });
}

export function GET(request: Request) {
  const session = frameSession(request);
  if (!session || request.headers.get('Authorization') !== `Bearer ${session.phone}`)
    return new Response(null, { status: 403, headers: NO_STORE });
  const frame = session.frame;
  if (session.camera !== request.headers.get('X-Camera-View') || !frame ||
      Date.now() - frame.id > 1300 || request.headers.get('X-Last-Frame') === String(frame.id))
    return new Response(null, { status: 204, headers: NO_STORE });
  return new Response(frame.bytes, { headers: { ...NO_STORE, 'Content-Type': 'image/jpeg', 'X-Frame-Id': String(frame.id) } });
}
