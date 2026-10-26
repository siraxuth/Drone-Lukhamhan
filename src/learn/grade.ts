import { buildScenarioConfig } from '@/flight/config';
import { simulate, type SimEvent } from '@/flight/engine';
import { parse } from '@/flight/parser';
import { canon } from '@/flight/commands';
import { maxScore, type ScenarioConfig } from '@/lib/scenarios';

export const MAX_CODE_CHARS = 4000;
export const MAX_CODE_LINES = 120;

export type GradeResult = {
  passed: boolean;
  score: number;
  max: number | null;
  /** ข้อความผิดพลาดของโค้ด/การบิน (เรียงตามเวลา) */
  problems: string[];
  /** เวลาบินจนลงจอดบนฐาน (มิลลิวินาทีในตัวจำลอง) null = ยังไม่ได้ลงจอดบนฐาน */
  timeMs: number | null;
  /** คำสั่งที่ต้องมี (ตามลำดับ) แต่ยังไม่มี */
  missing: string[];
};

/**
 * ตัดสินโค้ดของผู้เรียนฝั่งเซิร์ฟเวอร์ด้วยเอนจินจำลอง (ไม่เชื่อคะแนนจากไคลเอนต์)
 * ผ่านเมื่อ: โค้ดไม่มีข้อผิดพลาด ไม่ตก · คะแนน ≥ minScore · มีคำสั่งใน mustInclude ครบและเรียงตามลำดับ
 * จำกัดขนาดโค้ดกันการส่งข้อมูลมหึมา (ตัวจำลองเองก็จำกัดจำนวนคำสั่งอยู่แล้ว)
 */
export function gradeCode(code: string, scenario: ScenarioConfig, minScore: number, mustInclude: string[]): GradeResult {
  if (code.length > MAX_CODE_CHARS || code.split('\n').length > MAX_CODE_LINES) {
    return { passed: false, score: 0, max: maxScore(scenario), problems: ['โค้ดยาวเกินกว่าที่แบบฝึกนี้รับ'], missing: [], timeMs: null };
  }
  const cfg = { ...buildScenarioConfig(scenario), style: 'full' as const };
  const r = simulate(code, cfg);
  // mustInclude ต้องมีครบ "ตามลำดับ" (เป็นลำดับย่อยของคำสั่งที่เรียก) เช่น calibration → takeOff → autoLand
  const used = parse(code, 'full').calls.map((c) => canon(c.name));
  const missing: string[] = [];
  let from = 0;
  for (const n of mustInclude) {
    const i = used.indexOf(canon(n), from);
    if (i < 0) missing.push(n); else from = i + 1;
  }
  const problems = r.events.filter((e: SimEvent) => e.kind === 'error').map((e) => e.text);
  return { passed: r.ok && r.score >= minScore && missing.length === 0, score: r.score, max: maxScore(scenario), problems, missing, timeMs: r.stopTime === null ? null : Math.round(r.stopTime) };
}

