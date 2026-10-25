/**
 * seed โจทย์ฝึกของตัวจำลอง (ตาราง Challenge) · รัน: bun run prisma/seed-challenges.ts
 * ใช้ slug เป็นตัวระบุ รันซ้ำได้: โจทย์ที่ slug ตรงกันจะถูกอัปเดตเป็นข้อมูลตั้งต้น โจทย์ที่ครูเพิ่มเองไม่ถูกแตะ
 */
import { db } from '../src/lib/db';
import { scenarioSeeds } from '../src/lib/scenario-seeds';

for (const s of scenarioSeeds) {
  const data = { title: s.title, brief: s.brief, starter: s.starter, config: s.config as object, level: s.level, order: s.order, published: true, slug: s.slug };
  const found = await db.challenge.findFirst({ where: { slug: s.slug } });
  if (found) await db.challenge.update({ where: { id: found.id }, data });
  else await db.challenge.create({ data });
  console.log(found ? 'อัปเดต' : 'เพิ่ม', s.slug);
}
console.log('รวม', await db.challenge.count(), 'โจทย์ในฐานข้อมูล');
process.exit(0);
