/** โครงเนื้อหาของแพลตฟอร์มเรียน (/learn) เขียนเป็นโค้ดเพื่อให้ตรวจชนิดได้และรีวิวผ่าน git */
export type TrackId = 'code' | 'basics' | 'physics';

/** การ์ดอ่าน 1 ใบ: ข้อความ (ย่อหน้าละรายการ ใช้ `โค้ด` ในเครื่องหมายคำพูดกลับได้) + โค้ดตัวอย่าง/เคล็ดลับไม่บังคับ */
export type ReadStep = { kind: 'read'; title: string; body: string[]; code?: string; tip?: string };
/** ชนิดแบบฝึกอื่นๆ จะเพิ่มในเฟสถัดไป (เลือกคำตอบ ลาก-วาง เขียนโค้ด) */
export type Step = ReadStep;

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
