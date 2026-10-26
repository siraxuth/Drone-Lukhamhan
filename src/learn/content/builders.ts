import type { ArrangeStep, FillStep, QuizStep, SkillId, WriteStep } from '../types';

type L = 1 | 2 | 3 | 4 | 5;
/** ตัวช่วยสร้างข้อเลือกตอบ: ใส่คำตอบที่ถูกไว้ที่ตำแหน่ง pos (เริ่ม 0) ระหว่างตัวเลือกผิด เฉลยไม่เคยถูกส่งไปไคลเอนต์ */
export const quiz = (title: string, question: string, correct: string, wrong: string[], pos: number, skills: SkillId[], level: L, explain: string, code?: string): QuizStep => {
  const options = [...wrong]; options.splice(pos, 0, correct);
  return { kind: 'quiz', title, question, code, options, answer: pos, skills, level, explain };
};
export const fill = (title: string, question: string, code: string, blanks: FillStep['blanks'], skills: SkillId[], level: L, explain: string): FillStep => ({ kind: 'fill', title, question, code, blanks, skills, level, explain });
export const arrange = (a: Omit<ArrangeStep, 'kind'>): ArrangeStep => ({ kind: 'arrange', ...a });
export const write = (w: Omit<WriteStep, 'kind'>): WriteStep => ({ kind: 'write', ...w });
