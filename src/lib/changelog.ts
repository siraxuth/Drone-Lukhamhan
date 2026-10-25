import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Release = { version: string; date: string; intro: string; groups: Array<{ title: string; items: string[] }> };

/** อ่าน CHANGELOG.md ตอน build แล้วแยกเป็นรายเวอร์ชัน (## [x.y.z] - วันที่ / ### กลุ่ม / - รายการ) */
export function getReleases(): Release[] {
  let md = '';
  try { md = readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf8'); } catch { return []; }
  const out: Release[] = [];
  let cur: Release | null = null;
  let group: { title: string; items: string[] } | null = null;
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    const h2 = /^## \[([^\]]+)\](?: - (\d{4}-\d{2}-\d{2}))?/.exec(line);
    if (h2) {
      if (h2[1].toLowerCase() === 'unreleased') { cur = null; continue; }
      cur = { version: h2[1], date: h2[2] ?? '', intro: '', groups: [] };
      out.push(cur); group = null; continue;
    }
    if (!cur) continue;
    const h3 = /^### (.+)/.exec(line);
    if (h3) { group = { title: h3[1], items: [] }; cur.groups.push(group); continue; }
    const li = /^- (.+)/.exec(line);
    if (li && group) { group.items.push(li[1]); continue; }
    if (line && !group && !line.startsWith('#')) cur.intro += (cur.intro ? ' ' : '') + line;
  }
  return out;
}

export const latestRelease = () => getReleases()[0];
