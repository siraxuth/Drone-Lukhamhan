import { buildScenarioConfig } from '@/flight/config';
import { simulate } from '@/flight/engine';
import { cellName, maxScore, type ScenarioConfig, type SceneObject } from '@/lib/scenarios';
import type { SkillId } from './types';

/**
 * ตัวสร้างภารกิจรายวัน: ได้ด่านเดิมเสมอสำหรับ (วัน, ระดับ) เดียวกัน (สุ่มจากเมล็ดที่มาจากวันที่ ไม่เก็บลงฐานข้อมูล)
 * สร้าง "เส้นทาง" บนกริด 5×5 ก่อน แล้วสร้างโค้ดเฉลยจากเส้นทางเดียวกัน แล้วรันในเอนจินจริง
 * ผ่านเมื่อเฉลยได้คะแนนเต็มและจบในเวลา จึงรับประกันว่าทุกด่านแก้ได้ ถ้าไม่ผ่านจะสุ่มใหม่ (salt) จนได้
 * ฟังก์ชันล้วน ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์ตัดสินและหน้าแอดมินตรวจ
 */
export type Tier = 'easy' | 'medium' | 'hard';
export const TIER_IDS: Tier[] = ['easy', 'medium', 'hard'];
export const isTier = (s: string): s is Tier => s === 'easy' || s === 'medium' || s === 'hard';

export const TIERS: Record<Tier, { label: string; xp: number; level: 2 | 3 | 4; legs: number; hoops: number; tall: boolean; blurb: string }> = {
  easy: { label: 'ง่าย', xp: 20, level: 2, legs: 3, hoops: 0, tall: false, blurb: 'บินผ่านจุด 3 จุดตามลำดับ แล้วกลับลงฐาน' },
  medium: { label: 'กลาง', xp: 35, level: 3, legs: 4, hoops: 1, tall: false, blurb: 'ผ่าน 4 จุด มีห่วง 1 ใบขวางทาง' },
  hard: { label: 'ยาก', xp: 60, level: 4, legs: 6, hoops: 2, tall: true, blurb: 'ผ่าน 6 จุด ห่วง 2 ใบ และมี 1 จุดที่ต้องบินสูง' },
};

export type Mission = {
  day: string;
  tier: Tier;
  title: string;
  config: ScenarioConfig;
  /** รายการสั่งงานทีละข้อ (แสดงให้ผู้เรียน) */
  steps: string[];
  max: number;
  xp: number;
  skills: SkillId[];
  starter: string;
  /** โค้ดเฉลย: ห้ามส่งไปไคลเอนต์ (ใช้ตรวจแก้ได้และหน้าแอดมินเท่านั้น) */
  solution: string;
  /** เวลาบินของเฉลย (มิลลิวินาที) ใช้อ้างอิงว่าทำเวลาได้ดีแค่ไหน */
  solutionTimeMs: number;
};

// ---------- สุ่มแบบกำหนดผลล่วงหน้า ----------
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
function mulberry32(a: number) {
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rngFor = (seed: string) => mulberry32(xmur3(seed)());

type Dir = 'N' | 'S' | 'E' | 'W';
const VEC: Record<Dir, [number, number]> = { N: [0, 1], S: [0, -1], E: [1, 0], W: [-1, 0] };
/** yaw ของห่วงให้ระนาบตั้งฉากกับทิศบิน (ตรงกับตัวอย่างในโจทย์ grid-hoops) */
const HOOP_YAW: Record<Dir, number> = { N: 0, E: 90, S: 180, W: 270 };
/** คำสั่งเคลื่อนที่ (หัวโดรนหันเหนือเสมอ ไม่ต้องหมุน) */
const MOVE: Record<Dir, string> = { N: 'move_forward', S: 'move_backward', E: 'move_right', W: 'move_left' };

type Leg = { dir: Dir; cells: number; to: [number, number]; height?: number };

const TITLES_A = ['ลาดตระเวน', 'ส่งของด่วน', 'ตามรอย', 'สำรวจแปลง', 'ผ่านด่านลม', 'ซ้อมสนาม', 'เก็บจุดพิกัด', 'เส้นทางลับ'];
const TITLES_B = ['ยามเช้า', 'ยามบ่าย', 'ฟ้าใส', 'ลมแรง', 'ใต้แสงแดด', 'หลังฝน', 'ไม่มีเมฆ', 'ลมสงบ'];

function buildLegs(rng: () => number, tier: Tier): Leg[] | null {
  const t = TIERS[tier];
  const legs: Leg[] = [];
  const seen = new Set(['0,0']);
  let [x, y] = [0, 0];
  let prev: Dir | null = null;
  for (let k = 0; k < t.legs; k++) {
    let done = false;
    for (let tries = 0; tries < 40 && !done; tries++) {
      const dirs = (['N', 'S', 'E', 'W'] as Dir[]).filter((d) => !prev || (d !== prev && VEC[d][0] + VEC[prev][0] !== 0 || VEC[d][1] + VEC[prev][1] !== 0 ? true : false));
      const dir = dirs[Math.floor(rng() * dirs.length)];
      const cells = 1 + Math.floor(rng() * 2);
      const nx = x + VEC[dir][0] * cells, ny = y + VEC[dir][1] * cells;
      if (Math.abs(nx) > 2 || Math.abs(ny) > 2 || seen.has(`${nx},${ny}`)) continue;
      // ห้ามเดินผ่านฐานตรงกลางทางข้ามจุด (กันสับสนว่าลงจอด)
      legs.push({ dir, cells, to: [nx, ny] }); seen.add(`${nx},${ny}`); [x, y] = [nx, ny]; prev = dir; done = true;
    }
    if (!done) return null;
  }
  return legs;
}

function compose(day: string, tier: Tier, salt: number): Mission | null {
  const t = TIERS[tier];
  const rng = rngFor(`${day}:${tier}:${salt}`);
  const legs = buildLegs(rng, tier);
  if (!legs) return null;

  // จุดที่ต้องบินสูง (ยาก): เลือกจุดกลางๆ ที่ขานั้นไม่มีห่วง
  const tallIdx = t.tall ? 1 + Math.floor(rng() * (legs.length - 2)) : -1;
  if (tallIdx >= 0) legs[tallIdx].height = 150;
  // ห่วง: วางกึ่งกลางระยะแรก (0.5 ม.) ของขาที่ไม่ใช่ขาแรก ไม่ใช่ขาจุดสูง และไม่ใช่ขาถัดจากจุดสูง (ยังต้องปรับความสูงกลับ)
  const hoopLegs = legs.map((_, i) => i).filter((i) => i > 0 && i !== tallIdx && i !== tallIdx + 1);
  const hoops: SceneObject[] = [];
  for (let h = 0; h < t.hoops && hoopLegs.length; h++) {
    const li = hoopLegs.splice(Math.floor(rng() * hoopLegs.length), 1)[0];
    const from = li === 0 ? [0, 0] : legs[li - 1].to;
    const [dx, dy] = VEC[legs[li].dir];
    hoops.push({ type: 'hoop', id: `ห่วง ${h + 1}`, x: from[0] + dx * 0.5, y: from[1] + dy * 0.5, yaw: HOOP_YAW[legs[li].dir], size: 1, zMin: 55, zMax: 150, points: 15 });
  }
  const wps: SceneObject[] = legs.map((l, i) => ({ type: 'waypoint', id: cellName(l.to[0], l.to[1]), x: l.to[0], y: l.to[1], order: i + 1, points: l.height ? 20 : 10, ...(l.height ? { zMin: 130, zMax: 170 } : {}) }) as SceneObject);
  const config: ScenarioConfig = { pattern: 'grid5', event: 'mission', objects: [...wps, ...hoops] };

  // ----- โค้ดเฉลยจากเส้นทางเดียวกัน -----
  const body: string[] = [];
  legs.forEach((l, i) => {
    if (l.height) body.push(`  set_height(${l.height});`);
    body.push(`  ${MOVE[l.dir]}(${l.cells * 100});`, '  poshold();');
    if (l.height) body.push('  set_height(100);');
    void i;
  });
  // กลับฐาน: ถอยทีละแกนจากจุดสุดท้าย (แกน x ก่อน แล้ว y)
  const [lx, ly] = legs[legs.length - 1].to;
  if (lx !== 0) body.push(`  ${lx > 0 ? 'move_left' : 'move_right'}(${Math.abs(lx) * 100});`, '  poshold();');
  if (ly !== 0) body.push(`  ${ly > 0 ? 'move_backward' : 'move_forward'}(${Math.abs(ly) * 100});`, '  poshold();');
  body.push('  auto_land();');
  const head = ['  calibration();', '  delay(3000);', '  take_off();', '  delay(3000);', '  set_height(100);'];
  const solution = `void setup() {\n${[...head, ...body].join('\n')}\n}\n\nvoid loop() {\n}\n`;

  const steps = [
    `ออกจากฐาน (ช่อง ${cellName(0, 0)}) ผ่านจุดตามลำดับ: ${wps.map((w) => w.id).join(' → ')}`,
    'ชื่อช่อง: คอลัมน์ A–E เรียงจากซ้ายไปขวา แถว 1–5 เรียงจากล่างขึ้นบน (แถวเพิ่ม = ไปข้างหน้า) ช่องละ 1 เมตร (100 ซม.) หัวโดรนหันขึ้นบนตลอด ไม่ต้องหมุน ใช้ move_forward / move_backward / move_left / move_right',
    ...(hoops.length ? [`ห่วง ${hoops.length} ใบอยู่กึ่งกลางระหว่างช่องบนเส้นทาง ต้องบินลอดช่อง (สูง 55–150 ซม.) ถ้าชนโดรนตก`] : []),
    ...(tallIdx >= 0 ? [`จุด ${wps[tallIdx].id} ต้องบินผ่านที่ความสูง 130–170 ซม. (ตั้ง set_height(150) ก่อนไปถึง) แล้วลดกลับที่ 100 ซม. หลังผ่านจุด`] : []),
    `จบด้วยการกลับมาลงจอดบนฐาน (${cellName(0, 0)}) จึงจะได้คะแนนลงจอด 10 คะแนน`,
  ];
  const starter = `void setup() {\n${head.join('\n')}\n  // เขียนเส้นทางต่อจากตรงนี้ แล้วกลับมาลงจอดที่ฐาน\n}\n\nvoid loop() {\n}\n`;
  const title = `${TITLES_A[Math.floor(rng() * TITLES_A.length)]}${TITLES_B[Math.floor(rng() * TITLES_B.length)]}`;

  const max = maxScore(config) as number;
  const r = simulate(solution, { ...buildScenarioConfig(config), style: 'full' });
  if (!r.ok || r.score !== max || r.timedOut || (r.stopTime ?? r.duration) > 140_000) return null;
  const skills: SkillId[] = ['api', 'direction', 'timing', 'structure', ...(tallIdx >= 0 ? (['height'] as SkillId[]) : [])];
  return { day, tier, title, config, steps, max, xp: t.xp, skills, starter, solution, solutionTimeMs: Math.round(r.stopTime ?? r.duration) };
}

const cache = new Map<string, Mission>();

/** ภารกิจของวัน/ระดับที่ระบุ (วันเป็น YYYY-MM-DD เวลาไทย) ผลคงที่เสมอและแก้ได้จริงเสมอ */
export function getMission(day: string, tier: Tier): Mission {
  const key = `${day}:${tier}`;
  const hit = cache.get(key);
  if (hit) return hit;
  for (let salt = 0; salt < 60; salt++) {
    const m = compose(day, tier, salt);
    if (m) { if (cache.size > 200) cache.clear(); cache.set(key, m); return m; }
  }
  throw new Error(`สร้างภารกิจรายวันไม่สำเร็จ ${key}`);
}

