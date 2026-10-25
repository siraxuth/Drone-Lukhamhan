import { z } from 'zod';
import type { EventId } from '@/rules/types';

/**
 * โจทย์ฝึกของตัวจำลอง (เก็บในตาราง Challenge ฟิลด์ config เป็น JSON)
 * พิกัดเป็น "เมตร" ตามสนามจริง: x ขวา, y เหนือ (ห่างจากโต๊ะผู้แข่ง), (0,0) = กึ่งกลางแท่น Takeoff
 * โดรนเริ่มที่แท่น Takeoff เสมอ ความสูงเป็นไปตามที่โค้ดสั่งเท่านั้น
 */
export type ScenarioPattern = 'standard' | 'grid5' | 'blank';
export const PATTERNS: Array<{ id: ScenarioPattern; label: string; text: string }> = [
  { id: 'standard', label: 'สนามแข่งจริง', text: 'สนามและสิ่งกีดขวางตามกติกา (แท่น ลูกโป่ง เป้า)' },
  { id: 'grid5', label: 'กริด 5×5 เมตร', text: 'ช่องละ 1 เมตร ตั้งชื่อช่อง A1–E5 ใช้เป็นตัวนำทาง' },
  { id: 'blank', label: 'พื้นว่าง', text: 'พื้นเรียบ มีแค่เส้นบอกระยะทุก 1 เมตร' },
];

type Base = { id: string; x: number; y: number };
export type SceneObject =
  | (Base & { type: 'waypoint'; r?: number; zMin?: number; zMax?: number; points?: number; order?: number })
  | (Base & { type: 'hoop'; size?: number; yaw?: number; zMin?: number; zMax?: number; points?: number })
  | (Base & { type: 'platform'; r?: number })
  | (Base & { type: 'balloon'; z?: number })
  | (Base & { type: 'target'; cz?: number; r?: number });

/** จุดวางโดรนตอนเริ่ม (เมตร) และทิศหัว: 0 = เหนือ, 90 = ตะวันออก (หมุนขวา) */
export type StartPoint = { x: number; y: number; yaw: number };
/** ฐาน = แท่นที่ลงจอดแล้วหยุดเวลา: start = อยู่ที่จุดเริ่ม · custom = อยู่ตำแหน่งอื่น · none = ไม่มีฐาน (ลงตรงไหนก็จบภารกิจ) */
export type BaseSpec = { mode: 'start' | 'custom' | 'none'; x?: number; y?: number };
export type ScenarioConfig = { pattern: ScenarioPattern; event: EventId; objects: SceneObject[]; start?: StartPoint; base?: BaseSpec };

export const DEFAULT_START: StartPoint = { x: 0, y: 0, yaw: 0 };
export const DEFAULT_BASE: BaseSpec = { mode: 'start' };
/** ตำแหน่งฐานจริงบนสนาม (เมตร) หรือ null ถ้าไม่มีฐาน · สนามแข่งจริงมีฐานกลางสนามเสมอ */
export type StartBase = Pick<ScenarioConfig, 'pattern' | 'start' | 'base'>;
export function baseAt(c: StartBase): { x: number; y: number } | null {
  if (c.pattern === 'standard') return { x: 0, y: 0 };
  const st = c.start ?? DEFAULT_START;
  const b = c.base ?? DEFAULT_BASE;
  if (b.mode === 'none') return null;
  if (b.mode === 'custom') return { x: b.x ?? st.x, y: b.y ?? st.y };
  return { x: st.x, y: st.y };
}
export const startOf = (c: StartBase): StartPoint => (c.pattern === 'standard' ? DEFAULT_START : c.start ?? DEFAULT_START);

export const OBJECT_LABEL: Record<SceneObject['type'], string> = {
  waypoint: 'จุดผ่าน', hoop: 'ห่วง', platform: 'แท่นทิ้งบอล', balloon: 'ลูกโป่ง', target: 'เป้ายิง',
};

const num = (min: number, max: number) => z.number().min(min).max(max);
const base = { id: z.string().min(1).max(40), x: num(-5, 5), y: num(-5, 5) };
const objectSchema = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('waypoint'), r: num(10, 200).optional(), zMin: num(0, 300).optional(), zMax: num(0, 300).optional(), points: num(0, 100).optional(), order: num(1, 99).optional() }),
  z.object({ ...base, type: z.literal('hoop'), size: num(0.3, 3).optional(), yaw: num(-360, 360).optional(), zMin: num(0, 300).optional(), zMax: num(0, 300).optional(), points: num(0, 100).optional() }),
  z.object({ ...base, type: z.literal('platform'), r: num(0.2, 2).optional() }),
  z.object({ ...base, type: z.literal('balloon'), z: num(30, 250).optional() }),
  z.object({ ...base, type: z.literal('target'), cz: num(30, 250).optional(), r: num(10, 100).optional() }),
]);
const configSchema = z.object({
  pattern: z.enum(['standard', 'grid5', 'blank']),
  event: z.enum(['mission', 'aviation', 'innovation']),
  objects: z.array(objectSchema).max(60),
  start: z.object({ x: num(-4.8, 4.8), y: num(-4.8, 4.8), yaw: num(0, 359) }).optional(),
  base: z.object({ mode: z.enum(['start', 'custom', 'none']), x: num(-4.8, 4.8).optional(), y: num(-4.8, 4.8).optional() }).optional(),
});

export const DEFAULT_CONFIG: ScenarioConfig = { pattern: 'grid5', event: 'mission', objects: [] };

/** ตรวจ JSON ที่มาจากฐานข้อมูลหรือฟอร์ม ถ้าผิดรูปแบบคืนค่าเริ่มต้น (ไม่ให้หน้าพัง) */
export function parseConfig(raw: unknown): ScenarioConfig {
  let v = raw;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { return DEFAULT_CONFIG; } }
  const r = configSchema.safeParse(v);
  return r.success ? (r.data as ScenarioConfig) : DEFAULT_CONFIG;
}
export function parseConfigStrict(raw: unknown): { ok: true; config: ScenarioConfig } | { ok: false; error: string } {
  let v = raw;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { return { ok: false, error: 'การตั้งค่าสนามไม่ใช่ JSON' }; } }
  const r = configSchema.safeParse(v);
  return r.success ? { ok: true, config: r.data as ScenarioConfig } : { ok: false, error: `การตั้งค่าสนามไม่ถูกต้อง: ${r.error.issues[0]?.path.join('.')} ${r.error.issues[0]?.message}` };
}

/** ข้อมูลโจทย์ที่ส่งไปให้หน้าตัวจำลอง */
export type ScenarioView = {
  id: string; slug: string; title: string; briefHtml: string; starter: string; level: string; order: number; config: ScenarioConfig;
};

export const LEVELS = ['เริ่มต้น', 'กลาง', 'ยาก'] as const;

/** ชื่อช่องกริด: คอลัมน์ A–E (ซ้าย→ขวา) แถว 1–5 (ล่าง→บน) เช่น กึ่งกลาง = C3 */
export const cellName = (x: number, y: number) => `${'ABCDE'[Math.round(x) + 2] ?? '?'}${Math.round(y) + 3}`;

/** คะแนนเต็มโดยประมาณของโจทย์ฝึกบนสนามอิสระ (ใช้โชว์ "x / เต็ม") */
export function maxScore(c: ScenarioConfig): number | null {
  if (c.pattern === 'standard') return null;
  let s = 10; // ลงจอด (บนฐาน หรือที่ไหนก็ได้ถ้าไม่มีฐาน)
  for (const o of c.objects) {
    if (o.type === 'waypoint') s += o.points ?? 10;
    else if (o.type === 'hoop') s += o.points ?? 15;
    else if (o.type === 'platform') s += 20;
    else if (o.type === 'balloon') s += 5;
    else if (o.type === 'target') s += 20;
  }
  return s;
}
