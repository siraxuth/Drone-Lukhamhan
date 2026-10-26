import type { ScenarioConfig } from '@/lib/scenarios';

/** โครงเนื้อหาของแพลตฟอร์มเรียน (/learn) เขียนเป็นโค้ดเพื่อให้ตรวจชนิดได้และรีวิวผ่าน git */
export type TrackId = 'code' | 'basics' | 'physics';

/** ทักษะที่ระบบวิเคราะห์ (ใช้ติดป้ายให้แบบฝึกทุกข้อ) */
export const SKILLS = {
  syntax: 'เขียนให้ถูกรูปแบบ (; วงเล็บ ปีกกา)',
  api: 'ชื่อและความหมายของคำสั่ง',
  timing: 'เวลาและ delay',
  direction: 'ทิศทางและพิกัด',
  height: 'ความสูง',
  structure: 'ฟังก์ชัน ลูป และโครงโปรแกรม',
  debug: 'หาและแก้บัค',
  drone: 'ความรู้เรื่องโดรน',
  physics: 'หลักฟิสิกส์',
} as const;
export type SkillId = keyof typeof SKILLS;

type Exercise = { /** ทักษะที่แบบฝึกนี้วัด */ skills: SkillId[]; /** ความยาก 1–5 */ level: 1 | 2 | 3 | 4 | 5; /** อธิบายเฉลยหลังตอบ */ explain: string };

/** การ์ดอ่าน 1 ใบ: ข้อความ (ย่อหน้าละรายการ ใช้ `โค้ด` ในเครื่องหมายคำพูดกลับได้) + โค้ดตัวอย่าง/เคล็ดลับไม่บังคับ */
export type ReadStep = { kind: 'read'; title: string; body: string[]; code?: string; tip?: string };
/** เลือกคำตอบข้อเดียว (answer = ลำดับตัวเลือกที่ถูก เริ่ม 0 อยู่ฝั่งเซิร์ฟเวอร์เท่านั้น) */
export type QuizStep = Exercise & { kind: 'quiz'; title: string; question: string; code?: string; options: string[]; answer: number };
/** เติมช่องว่างในโค้ด: ใน code ใช้ ___ เป็นช่อง เรียงตามลำดับ · blanks[i] = ตัวเลือกและคำตอบของช่องที่ i */
export type FillStep = Exercise & { kind: 'fill'; title: string; question: string; code: string; blanks: Array<{ options: string[]; answer: number }> };
/** ลากบล็อกคำสั่งมาเรียงให้ถูก แล้วดูโดรนบิน · blocks = บล็อกทั้งหมดรวมตัวหลอก */
export type ArrangeStep = Exercise & { kind: 'arrange'; title: string; question: string; scenario: ScenarioConfig; blocks: string[]; minScore: number; mustInclude: string[] };
/** เขียนโค้ดเองในตัวแก้โค้ดและสนามจำลอง ตัดสินด้วยคะแนนจากเอนจิน */
export type WriteStep = Exercise & { kind: 'write'; title: string; question: string; scenario: ScenarioConfig; starter: string; minScore: number; mustInclude: string[]; hint?: string };
export type Step = ReadStep | QuizStep | FillStep | ArrangeStep | WriteStep;
export type InteractiveStep = Exclude<Step, ReadStep>;

/** ส่วนที่ส่งให้ไคลเอนต์ได้ (ตัดเฉลยออก) */
export type PublicStep =
  | ReadStep
  | (Omit<QuizStep, 'answer'>)
  | (Omit<FillStep, 'blanks'> & { blanks: Array<{ options: string[] }> })
  | ArrangeStep
  | WriteStep;

export const isInteractive = (s: Step): s is InteractiveStep => s.kind !== 'read';

export function toPublic(s: Step): PublicStep {
  if (s.kind === 'quiz') { const { answer: _a, ...rest } = s; return rest; }
  if (s.kind === 'fill') return { ...s, blanks: s.blanks.map((b) => ({ options: b.options })) };
  return s;
}

export type Unit = {
  /** รหัสถาวร ห้ามเปลี่ยนหลังเปิดใช้ (ใช้เก็บความคืบหน้า) */
  id: string;
  title: string;
  summary: string;
  minutes: number;
  xp: number;
  steps: Step[];
  /** ลิงก์ "อ่านเพิ่ม" ไปหน้า docs / ตัวจำลอง */
  docs?: Array<{ label: string; href: string }>;
  /** หน่วยที่ต้องจบก่อน (ไม่ใส่ = ต้องจบหน่วยก่อนหน้าในสายเดียวกัน หน่วยแรกของสายเปิดเสมอ) */
  requires?: string[];
};

export type Track = {
  id: TrackId;
  title: string;
  tagline: string;
  /** สายเสริม ไม่บังคับเรียน */
  optional?: boolean;
  accent: 'blue' | 'red' | 'emerald';
  units: Unit[];
};

/** รหัสอ้างอิงแบบฝึกหนึ่งข้อ ใช้เก็บใน Attempt */
export const stepRef = (unitId: string, index: number) => `${unitId}#${index}`;
