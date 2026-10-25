import { FIELD, balloonId } from './layout';
import type { RuleEvent } from '@/rules/types';

/** ตำแหน่งโดรนบนสนามจริง: x,y เป็นเมตร, yaw องศา (0 = หันเหนือ, + = หมุนขวา/ตามเข็ม), alt เมตร */
export type DroneState = { x: number; y: number; yaw: number; alt: number };

export type Aimable = { id: string; label: string; x: number; y: number; z: number; kind: 'platform' | 'balloon' | 'target' };

const PLATFORM_NAMES = ['แท่นซ้ายบน', 'แท่นขวาบน', 'แท่นซ้ายล่าง', 'แท่นขวาล่าง'];
const TARGET_NAMES = ['เป้าซ้ายบน', 'เป้าขวาบน', 'เป้าซ้ายล่าง', 'เป้าขวาล่าง'];
const SIDE_NAMES = ['ด้านบน', 'ด้านล่าง', 'ด้านซ้าย', 'ด้านขวา'];

export function aimables(ev: Pick<RuleEvent, 'field'>): Aimable[] {
  const out: Aimable[] = [];
  if (ev.field.platforms) FIELD.platform.positions.forEach(([x, y], i) => out.push({ id: `p${i}`, label: PLATFORM_NAMES[i], x, y, z: FIELD.platform.height, kind: 'platform' }));
  if (ev.field.balloons) {
    FIELD.balloons.groups.forEach((g, gi) => {
      for (let k = -1; k <= 1; k++) {
        const x = g.center[0] + (g.along === 'x' ? k * FIELD.balloons.spacing : 0);
        const y = g.center[1] + (g.along === 'y' ? k * FIELD.balloons.spacing : 0);
        out.push({ id: balloonId(gi, k), label: `ลูกโป่ง${SIDE_NAMES[gi]} ลูกที่ ${k + 2}`, x, y, z: FIELD.balloons.totalHeight - 0.15, kind: 'balloon' });
      }
    });
  }
  if (ev.field.targets) FIELD.target.positions.forEach(([x, y], i) => out.push({ id: `t${i}`, label: TARGET_NAMES[i], x, y, z: FIELD.target.centerHeight, kind: 'target' }));
  return out;
}

const rad = (d: number) => (d * Math.PI) / 180;
const norm180 = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/** เวกเตอร์หัวโดรนบนพื้น (x ขวา, y เหนือ) */
export const heading = (yaw: number) => ({ x: Math.sin(rad(yaw)), y: Math.cos(rad(yaw)) });

export type Readout = {
  target: Aimable;
  dist: number; // ระยะแนวราบ (ม.)
  dist3d: number;
  bearing: number; // องศาที่ต้องหมุนขวา(+)/ซ้าย(−) จึงหันเข้าหาเป้า
  dx: number; // เป้าอยู่ขวา(+)/ซ้าย(−) ของโดรน (ม.) ในกรอบสนาม
  dy: number; // เป้าอยู่ข้างหน้า(+)/หลัง(−) ในกรอบสนาม
  dz: number; // เป้าสูงกว่า(+)/ต่ำกว่า(−)
};

export function nearest(d: DroneState, list: Aimable[]): Readout | null {
  let best: Readout | null = null;
  for (const t of list) {
    const dx = t.x - d.x, dy = t.y - d.y, dz = t.z - d.alt;
    const dist = Math.hypot(dx, dy);
    if (!best || dist < best.dist) {
      best = { target: t, dist, dist3d: Math.hypot(dist, dz), bearing: norm180((Math.atan2(dx, dy) * 180) / Math.PI - d.yaw), dx, dy, dz };
    }
  }
  return best;
}

const cm = (m: number) => Math.round(m * 100);

/** คำสั่งแนะนำเป็นภาษาคน + รูปแบบโค้ดของชมรม (fw/bw/ml/mr วัดตามกรอบสนามเมื่อหัวโดรนหันเหนือ) */
export function suggest(r: Readout): { plain: string; code: string } {
  const fwd = cm(r.dy), side = cm(r.dx);
  const parts: string[] = [];
  const code: string[] = [];
  if (Math.abs(fwd) >= 1) { parts.push(`${fwd > 0 ? 'ไปข้างหน้า' : 'ถอยหลัง'} ${Math.abs(fwd)} ซม.`); code.push(`${fwd > 0 ? 'fw' : 'bw'}(${Math.abs(fwd)});`); }
  if (Math.abs(side) >= 1) { parts.push(`${side > 0 ? 'เลื่อนขวา' : 'เลื่อนซ้าย'} ${Math.abs(side)} ซม.`); code.push(`${side > 0 ? 'mr' : 'ml'}(${Math.abs(side)});`); }
  if (!parts.length) return { plain: 'อยู่เหนือเป้าพอดีแล้ว', code: '// ไม่ต้องขยับ' };
  return { plain: parts.join(' แล้ว '), code: code.join(' ') };
}

/** ทดสอบทิ้งสัมภาระ: ตกตรงลงมาจากตำแหน่งปัจจุบัน */
export function dropTest(d: DroneState, list: Aimable[]) {
  for (const t of list) {
    if (t.kind !== 'platform') continue;
    const off = Math.hypot(t.x - d.x, t.y - d.y);
    if (off <= FIELD.platform.radius) return { hit: true as const, target: t, offset: off, text: `ลงแท่น "${t.label}" ห่างจากกลางแท่น ${cm(off)} ซม.` };
  }
  return { hit: false as const, text: 'ตกนอกแท่น ลองเลื่อนให้อยู่เหนือวงสีน้ำเงิน (รัศมี 50 ซม.)' };
}

type Hit = { ring: number | null; dist: number; label: string; ox: number; oz: number; hitX: number; hitY: number };
const TARGET_LABELS = ['เป้าซ้ายบน', 'เป้าขวาบน', 'เป้าซ้ายล่าง', 'เป้าขวาล่าง'];

/** ทดสอบยิงลูกดอกตรงไปข้างหน้า (แนวราบ) ใส่เป้าที่ตั้งตรงขนานแกน x (แผ่นเป้าหันเข้าหาโดรนทั้งสองด้านได้) */
export function shootTest(d: DroneState) {
  const h = heading(d.yaw);
  const R = FIELD.target.diameter / 2;
  const hits: Hit[] = [];
  FIELD.target.positions.forEach(([tx, ty], i) => {
    if (Math.abs(h.y) < 1e-6) return;
    const t = (ty - d.y) / h.y; // ระยะตามทิศหัวจนถึงระนาบเป้า
    if (t <= 0) return;
    const hitX = d.x + h.x * t;
    const ox = hitX - tx, oz = d.alt - FIELD.target.centerHeight;
    const r = Math.hypot(ox, oz);
    if (r > R) return; // อยู่นอกแผ่นเป้า
    const ring = FIELD.target.rings[Math.min(5, Math.floor(r / (R / 6)))];
    hits.push({ ring, dist: t, label: TARGET_LABELS[i], ox, oz, hitX, hitY: ty });
  });
  hits.sort((a, b) => a.dist - b.dist);
  const best = hits[0];
  if (!best) return { ok: false as const, text: 'ลูกดอกไม่ถูกเป้าไหนเลย หันหัวโดรนให้ตรงเป้า และปรับความสูงให้ใกล้ 140 ซม.' };
  const off = cm(Math.hypot(best.ox, best.oz));
  if (best.dist < FIELD.target.minShootDistance) {
    return { ok: false as const, ...best, text: `ใกล้เป้าเกินไป (${cm(best.dist)} ซม.) กติกากำหนดห่างอย่างน้อย 100 ซม. ก่อนยิง` };
  }
  return { ok: true as const, ...best, text: `ถูก "${best.label}" วงคะแนน ${best.ring} (ห่างกลางเป้า ${off} ซม. · ยิงจากระยะ ${cm(best.dist)} ซม.)` };
}

/** ทดสอบแตะลูกโป่งด้วยเข็มที่หัวโดรน (ยื่นไปข้างหน้า ~12 ซม.) */
export function popTest(d: DroneState, list: Aimable[], popped: string[] = []) {
  const h = heading(d.yaw);
  const tip = { x: d.x + h.x * 0.12, y: d.y + h.y * 0.12, z: d.alt };
  let best: { t: Aimable; dist: number } | null = null;
  for (const t of list) {
    if (t.kind !== 'balloon' || popped.includes(t.id)) continue;
    const dist = Math.hypot(t.x - tip.x, t.y - tip.y, t.z - tip.z);
    if (!best || dist < best.dist) best = { t, dist };
  }
  if (!best) return { ok: false as const, text: 'ไม่มีลูกโป่งในประเภทนี้' };
  const b = best as { t: Aimable; dist: number };
  return b.dist <= 0.15
    ? { ok: true as const, id: b.t.id, text: `เข็มแตะ "${b.t.label}" ได้ (ห่าง ${cm(b.dist)} ซม. จากกลางลูกโป่ง) +5 คะแนน` }
    : { ok: false as const, text: `ยังไม่ถึง "${b.t.label}" ห่างอีก ${cm(b.dist)} ซม. (ต้องไม่เกิน 15 ซม.)` };
}
