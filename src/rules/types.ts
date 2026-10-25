/** โครงข้อมูลกติกาต่อปี — ปีใหม่ = เพิ่มไฟล์ใหม่ (หรือเพิ่มแถว Season ใน DB) โดยไม่ต้องแก้ UI */
export type EventId = 'mission' | 'aviation' | 'innovation';

export type ScoreRow = { item: string; points: string; note?: string };

export type RuleEvent = {
  id: EventId;
  name: string; // ชื่อไทยตามกติกา
  nameEn: string;
  short: string; // ชื่อสั้นที่คนทั่วไปเข้าใจ
  summary: string; // อธิบายเป็นภาษาคน 1-2 ประโยค
  durationSec: number;
  maxMembers: number;
  steps: { title: string; items: string[] }[];
  scoring: ScoreRow[];
  maxPoints: number;
  notes: string[];
  video: { id: string; title: string };
  /** ชิ้นส่วนบนสนามของประเภทนี้ (ดู field/layout.ts) */
  field: { takeoffColor: 'green' | 'red'; platforms: boolean; balloons: boolean; targets: boolean };
};

export type Season = {
  year: number; // พ.ศ.
  title: string;
  organizer: string;
  venue: string;
  dates: string;
  source: { label: string; url: string };
  events: RuleEvent[];
  common: string[]; // ข้อกำหนดที่ใช้ร่วมกันทุกประเภท
  entry: string[];
  prizes: { stage: string; rows: { rank: string; prize: string }[] }[];
};
