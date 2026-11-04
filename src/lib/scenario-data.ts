import { db } from './db';
import { clean } from './rich';
import { scenarioSeeds } from './scenario-seeds';
import { expandedMissions } from './mission-expansion';
import { parseConfig, type ScenarioView } from './scenarios';
import { bindStarterToKey } from '@/flight/key-program';

function withoutInlineReload(code: string) {
  return code.replace(/^\s*reload\s*\(\s*\)\s*;[^\n]*(?:\n|$)/gm, '');
}

function learnerBrief(html: string) {
  return clean(html
    .replace(/<b>\s*ภารกิจ\s+[AB]\s*<\/b>\s*·\s*/gi, '')
    .replace(/reload\s*\(\s*\)/gi, 'เติมสัมภาระจากแผงด้านขวา')
    .replace(/ตำแหน่ง reload\(\)/gi, 'แผงเตรียมโดรนด้านขวา'));
}

/** Hide legacy pair suffixes retained in already-published challenge records. */
function learnerTitle(title: string, slug: string, config: ScenarioView['config']) {
  const match = /^flight-(\d+)-(\d+)-([ab])$/i.exec(slug);
  if (!match || !config.pairId || !config.variant) return title.replace(/\s+แบบ\s*[AB]$/i, '');
  const ordinal = (Number(match[1]) - 1) * 50 + (Number(match[2]) - 1) * 2 + (match[3].toLowerCase() === 'a' ? 1 : 2);
  return title.replace(/\s+\d{2}\s+แบบ\s*[AB]$/i, ` ${String(ordinal).padStart(3, '0')}`);
}

/** โจทย์ฝึกที่เผยแพร่แล้ว เรียงตามลำดับ · ถ้าฐานข้อมูลยังว่างหรือเชื่อมไม่ได้ ใช้ข้อมูลตั้งต้นในโค้ดแทน */
export async function getScenarios(): Promise<ScenarioView[]> {
  const authored: ScenarioView[] = [...scenarioSeeds, ...expandedMissions].map((s) => ({
    id: s.slug, slug: s.slug, title: s.title, briefHtml: learnerBrief(s.brief), starter: bindStarterToKey(withoutInlineReload(s.starter)),
    level: s.level, order: s.order, config: { ...s.config, requiresPayload: s.config.requiresPayload ?? /\bdrop\s*\(/.test(s.solution) },
  }));
  try {
    const rows = await db.challenge.findMany({ where: { published: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    const merged = new Map(authored.map((s) => [s.slug, s]));
    for (const c of rows) {
      const slug = c.slug ?? c.id;
      const config = parseConfig(c.config);
      merged.set(slug, { id: c.id, slug, title: learnerTitle(c.title, slug, config), briefHtml: learnerBrief(c.brief), starter: bindStarterToKey(withoutInlineReload(c.starter)), level: c.level, order: c.order, config: { ...config, requiresPayload: config.requiresPayload ?? (config.event === 'mission' || /\bdrop\s*\(/.test(c.starter) || config.objects.some((o) => o.type === 'platform')) } });
    }
    return [...merged.values()].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'th'));
  } catch { /* ใช้ข้อมูลตั้งต้นด้านล่าง */ }
  return authored.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'th'));
}
