import { SKILLS, type SkillId } from './types';

/** ฟังก์ชันล้วน (ไม่แตะฐานข้อมูล) สำหรับโมเดลความชำนาญ การจัดระดับ และการเลือกโจทย์ทบทวน */

export const SKILL_IDS = Object.keys(SKILLS) as SkillId[];
export const isSkill = (s: string): s is SkillId => s in SKILLS;

export type Stat = { skill: SkillId; mastery: number; answered: number; correct: number; lastAt: Date | null };

/** ความชำนาญเริ่มต้นของทักษะที่ยังไม่เคยวัด */
export const PRIOR = 0.5;

/** ชื่อสั้นของทักษะ (ใช้ในแผนภาพ) */
export const SHORT: Record<SkillId, string> = { syntax: 'รูปแบบโค้ด', api: 'ชื่อคำสั่ง', timing: 'เวลา', direction: 'ทิศทาง', height: 'ความสูง', structure: 'โครงโปรแกรม', debug: 'หาบัค', drone: 'ความรู้โดรน', physics: 'ฟิสิกส์', blender: 'Blender', show: 'ตั้งค่าโชว์' };

/**
 * อัปเดตความชำนาญหลังตอบ 1 ครั้ง (ค่า 0–1) · ตอบถูกข้อยากได้เพิ่มมาก ตอบผิดข้อง่ายลดมาก
 * อัตราเรียนรู้เริ่มสูงแล้วลดเมื่อมีข้อมูลมากขึ้น (ขั้นต่ำ 0.12) เพื่อให้ค่านิ่งแต่ยังขยับตามพัฒนาการ
 */
export function updateMastery(m: number, answered: number, correct: boolean, level: 1 | 2 | 3 | 4 | 5): number {
  const lr = Math.max(0.12, 1 / (answered + 2));
  const w = correct ? 0.6 + 0.2 * level : 1.6 - 0.2 * level;
  const next = m + lr * w * ((correct ? 1 : 0) - m);
  return Math.min(1, Math.max(0, next));
}

/** ค่าที่ใช้แสดง/จัดโจทย์: ความชำนาญที่ไม่ได้ฝึกนานๆ ค่อยๆ ถอยเข้าหา 0.5 (ครึ่งชีวิต 30 วัน) */
export function effective(m: number, lastAt: Date | null, now: Date = new Date()): number {
  if (!lastAt) return PRIOR;
  const days = Math.max(0, (now.getTime() - lastAt.getTime()) / 86_400_000);
  return PRIOR + (m - PRIOR) * Math.pow(0.5, days / 30);
}

export type Band = 'unknown' | 'weak' | 'ok' | 'strong';
/** ยังตอบไม่ถึง 2 ครั้ง = ยังไม่รู้ · < 0.45 = ควรเสริม · ≥ 0.7 = ถนัด */
export function bandOf(eff: number, answered: number): Band {
  if (answered < 2) return 'unknown';
  return eff < 0.45 ? 'weak' : eff >= 0.7 ? 'strong' : 'ok';
}

export const BAND_LABEL: Record<Band, string> = { unknown: 'ยังไม่พอวัด', weak: 'ควรเสริม', ok: 'พอใช้', strong: 'ถนัด' };

/** คำแนะนำภาษาคนของแต่ละทักษะ และหน่วยเรียนที่ช่วยเสริม */
export const ADVICE: Record<SkillId, { weak: string; strong: string; unit?: string }> = {
  syntax: { weak: 'เขียนให้ถูกรูปแบบ: ทุกคำสั่งจบด้วย ; มีวงเล็บ () และปีกกาครบคู่ ลองอ่านข้อความ error ทีละบรรทัด', strong: 'เขียนโค้ดได้ถูกรูปแบบดี คอมไพเลอร์แทบไม่ต้องเตือน', unit: 'code-first-sketch' },
  api: { weak: 'ชื่อและความหมายของคำสั่งยังสลับกัน ลองท่องเป็นประโยค เช่น set_height = ตั้งความสูง move_left = เลื่อนซ้าย', strong: 'จำชื่อและหน้าที่ของคำสั่งได้แม่น', unit: 'code-api' },
  timing: { weak: 'เรื่องเวลายังพลาดบ่อย: calibration และ take_off ต้อง delay อย่างน้อย 3000 และคำนวณเวลาจากระยะ × มิลลิวินาทีต่อซม.', strong: 'จัดการเวลาและ delay ได้ดี', unit: 'code-api' },
  direction: { weak: 'ทิศทางยังสับสน โดยเฉพาะหลังหมุนหัวโดรน จำว่า “ข้างหน้า” คือทิศที่หัวหันอยู่ ลองวาดแผนที่กริดบนกระดาษ', strong: 'เข้าใจทิศทางและการหมุนหัวได้ดี', unit: 'code-first-flight' },
  height: { weak: 'เรื่องความสูงยังพลาด ตรวจช่วงสูงของห่วง ลูกโป่ง และเป้า (ห่วง 55–150 ซม. ลูกโป่ง 145 ซม.) ก่อนตั้ง set_height', strong: 'ตั้งความสูงให้พอดีกับภารกิจได้ดี', unit: 'code-first-flight' },
  structure: { weak: 'โครงโปรแกรม (setup/loop ฟังก์ชัน for) ยังไม่คล่อง ลองแตกภารกิจเป็นฟังก์ชันเล็กๆ ทีละท่อน', strong: 'แบ่งโปรแกรมเป็นฟังก์ชันและใช้ลูปได้คล่อง', unit: 'code-mission' },
  debug: { weak: 'การหาบัคยังช้า ลองอ่านข้อความแจ้งใต้สนามจำลอง แก้ทีละจุดแล้วรันใหม่ จุดแรกมักเป็นต้นเหตุของจุดอื่น', strong: 'หาและแก้บัคได้เร็ว', unit: 'code-first-flight' },
  drone: { weak: 'ความรู้พื้นฐานเรื่องโดรนยังต้องเสริม ลองทบทวนส่วนประกอบและหลักการบินของโดรน', strong: 'เข้าใจส่วนประกอบและการทำงานของโดรนดี', unit: 'basics-parts' },
  blender: { weak: 'การใช้ Blender ยังไม่คล่อง ลองฝึกเปลี่ยนมุมมองด้วย Numpad และคีย์ลัด G R S Shift + D ให้เป็นนิสัยก่อนวางโดรนจริง', strong: 'ใช้ Blender และคีย์ลัดได้คล่อง', unit: 'lt-viewport' },
  show: { weak: 'การตั้งค่าโชว์ยังพลาด ตรวจ FPS 10, Color Management เป็น Standard, Material แยกรายลำ และ Safety Check ทุกครั้งก่อนส่งงาน', strong: 'ตั้งค่าและตรวจความปลอดภัยของโชว์ได้ครบ', unit: 'lt-material' },
  physics: { weak: 'หลักฟิสิกส์ยังต้องเสริม เริ่มจากแรง น้ำหนัก และสมดุล แล้วค่อยไปกฎข้อที่ 3 และพลังงาน', strong: 'ใช้หลักฟิสิกส์อธิบายการบินของโดรนได้ดี', unit: 'phy-force' },
};

/** สายเรียนกับทักษะที่เกี่ยวข้อง ใช้สรุประดับต่อสาย */
export const TRACK_SKILLS = {
  code: ['syntax', 'api', 'timing', 'direction', 'height', 'structure', 'debug'],
  basics: ['drone'],
  physics: ['physics'],
  lettering: ['blender', 'show'],
} satisfies Record<string, SkillId[]>;
export type TrackKey = keyof typeof TRACK_SKILLS;

/** ทักษะของสายโดรนแปรอักษร ไม่อยู่ในแบบทดสอบก่อนเรียน */
export const LETTERING_SKILLS: SkillId[] = TRACK_SKILLS.lettering;

export type Level = 'เริ่มต้น' | 'กลาง' | 'สูง';
/** ระดับของสายจากความชำนาญเฉลี่ยของทักษะที่วัดแล้ว (ไม่มีข้อมูล = null) */
export function levelOfTrack(track: TrackKey, stats: Stat[]): Level | null {
  const rows = stats.filter((s) => (TRACK_SKILLS[track] as SkillId[]).includes(s.skill) && s.answered >= 1);
  if (!rows.length) return null;
  const avg = rows.reduce((n, s) => n + s.mastery, 0) / rows.length;
  return avg < 0.4 ? 'เริ่มต้น' : avg < 0.7 ? 'กลาง' : 'สูง';
}

// ---------- แบบทดสอบก่อนเรียน (adaptive) ----------
export const PLACEMENT_LENGTH = 12;
export type PBank = { id: string; skill: SkillId; level: 1 | 2 | 3 | 4 | 5 };

/**
 * เลือกข้อถัดไปของแบบทดสอบก่อนเรียนจากผลที่ตอบมาแล้ว (ต้องไม่ซ้ำข้อเดิม)
 * ระดับเป้าหมายเริ่มที่ 2: ตอบถูกขึ้น 1 ระดับ ตอบผิดลง 1 ระดับ (1–5) · ในระดับเดียวกันเลือกทักษะที่ถูกถามน้อยที่สุดก่อน
 * คืน null เมื่อครบจำนวนข้อ
 */
export function pickPlacement<T extends PBank>(bank: T[], history: Array<{ id: string; correct: boolean }>): T | null {
  if (history.length >= PLACEMENT_LENGTH) return null;
  let target = 2;
  for (const h of history) target = Math.min(5, Math.max(1, target + (h.correct ? 1 : -1)));
  const asked = new Set(history.map((h) => h.id));
  const count = new Map<SkillId, number>();
  for (const h of history) { const q = bank.find((b) => b.id === h.id); if (q) count.set(q.skill, (count.get(q.skill) ?? 0) + 1); }
  const pool = bank.filter((b) => !asked.has(b.id));
  if (!pool.length) return null;
  const dist = (b: T) => Math.abs(b.level - target);
  const best = Math.min(...pool.map(dist));
  const near = pool.filter((b) => dist(b) === best);
  return near.sort((a, b) => (count.get(a.skill) ?? 0) - (count.get(b.skill) ?? 0))[0];
}

// ---------- โจทย์ทบทวน ----------
export type Candidate = { unitId: string; index: number; skills: SkillId[]; level: number };
export type CandidateHistory = { lastAt: Date | null; everWrong: boolean };
export const REVIEW_SIZE = 5;

/**
 * เลือกข้อทบทวน 5 ข้อ: ~60% จากทักษะที่อ่อนที่สุด · ~30% ข้อที่เคยตอบผิดหรือไม่ได้ทำนานแล้ว (ทบทวนเว้นระยะ) · ~10% ข้อที่ยังไม่เคยตอบ
 * ได้ผลคงที่สำหรับข้อมูลชุดเดียวกัน (ไม่สุ่ม) และไม่ซ้ำข้อ
 */
export function pickReview(cands: Candidate[], hist: Map<string, CandidateHistory>, effBySkill: Map<SkillId, number>, now: Date = new Date(), size = REVIEW_SIZE): Candidate[] {
  const ref = (c: Candidate) => `${c.unitId}#${c.index}`;
  const weak = (c: Candidate) => Math.min(...c.skills.map((s) => effBySkill.get(s) ?? PRIOR));
  const age = (c: Candidate) => { const h = hist.get(ref(c)); return h?.lastAt ? (now.getTime() - h.lastAt.getTime()) / 86_400_000 : Infinity; };
  const taken = new Set<string>();
  const out: Candidate[] = [];
  const take = (list: Candidate[], n: number) => { for (const c of list) { if (out.length >= size || n <= 0) break; if (taken.has(ref(c))) continue; taken.add(ref(c)); out.push(c); n--; } };

  const nWeak = Math.round(size * 0.6), nSpaced = Math.round(size * 0.3);
  take([...cands].sort((a, b) => weak(a) - weak(b) || a.level - b.level), nWeak);
  take([...cands].filter((c) => hist.get(ref(c))?.everWrong || age(c) >= 3).sort((a, b) => Number(hist.get(ref(b))?.everWrong ?? false) - Number(hist.get(ref(a))?.everWrong ?? false) || age(b) - age(a)), nSpaced);
  take(cands.filter((c) => !hist.get(ref(c))?.lastAt), size - out.length);
  take([...cands].sort((a, b) => age(b) - age(a)), size - out.length); // เติมให้ครบถ้าหมวดอื่นไม่พอ
  return out;
}
