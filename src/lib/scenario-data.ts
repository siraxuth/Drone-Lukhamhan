import { db } from './db';
import { clean } from './rich';
import { scenarioSeeds } from './scenario-seeds';
import { parseConfig, type ScenarioView } from './scenarios';

/** โจทย์ฝึกที่เผยแพร่แล้ว เรียงตามลำดับ · ถ้าฐานข้อมูลยังว่างหรือเชื่อมไม่ได้ ใช้ข้อมูลตั้งต้นในโค้ดแทน */
export async function getScenarios(): Promise<ScenarioView[]> {
  try {
    const rows = await db.challenge.findMany({ where: { published: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    if (rows.length) {
      return rows.map((c) => ({ id: c.id, slug: c.slug ?? c.id, title: c.title, briefHtml: clean(c.brief), starter: c.starter, level: c.level, order: c.order, config: parseConfig(c.config) }));
    }
  } catch { /* ใช้ข้อมูลตั้งต้นด้านล่าง */ }
  return scenarioSeeds.map((s) => ({ id: s.slug, slug: s.slug, title: s.title, briefHtml: clean(s.brief), starter: s.starter, level: s.level, order: s.order, config: s.config }));
}
