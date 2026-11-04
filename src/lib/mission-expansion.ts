import type { ScenarioConfig, SceneObject } from './scenarios';

/**
 * 200 additional missions, authored as 100 paired variants. The generator is
 * deterministic: each mission has its own fixed scene, instructions and answer
 * program, while shared construction rules keep geometry and progression valid.
 * Answer programs are used only by content validation and are never sent to the UI.
 */
export type ExpandedMission = {
  slug: string;
  title: string;
  level: 'เริ่มต้น' | 'กลาง' | 'ยาก' | 'โหดมาก';
  order: number;
  brief: string;
  starter: string;
  solution: string;
  config: ScenarioConfig;
};

type Family = 'route' | 'height' | 'hoop' | 'cargo' | 'target' | 'mixed';
const TIERS = ['เริ่มต้น', 'กลาง', 'ยาก', 'โหดมาก'] as const;
const FAMILY_COUNTS: Array<[Family, number]> = [
  ['route', 8], ['height', 5], ['hoop', 4], ['cargo', 3], ['target', 3], ['mixed', 2],
];
const NAMES: Record<Family, string> = {
  route: 'ผ่านจุดตรวจ', height: 'คุมระดับความสูง', hoop: 'ลอดห่วง', cargo: 'ส่งสัมภาระ', target: 'ยิงเป้า', mixed: 'ภารกิจผสม',
};
const TAGS: Record<Family, string[]> = {
  route: ['checkpoint', 'route'], height: ['checkpoint', 'altitude'], hoop: ['hoop', 'altitude'],
  cargo: ['cargo', 'landing'], target: ['target', 'altitude'], mixed: ['mixed', 'checkpoint', 'altitude'],
};
const templates = [
  [[0, 1], [1, 1], [1, 2], [0, 2]],
  [[1, 0], [1, 1], [2, 1], [2, 0]],
  [[0, 1], [-1, 1], [-1, 2], [0, 2]],
  [[-1, 0], [-1, 1], [-2, 1], [-2, 0]],
  [[0, -1], [1, -1], [1, -2], [0, -2]],
  [[1, 0], [1, -1], [2, -1], [2, 0]],
  [[0, -1], [-1, -1], [-1, -2], [0, -2]],
  [[-1, 0], [-1, -1], [-2, -1], [-2, 0]],
] as const;

const point = (p: readonly number[]) => ({ x: p[0], y: p[1] });
const move = (dx: number, dy: number) => {
  const out: string[] = [];
  if (dy > 0) out.push(`move_forward(${dy * 100});`);
  if (dy < 0) out.push(`move_backward(${-dy * 100});`);
  if (dx > 0) out.push(`move_right(${dx * 100});`);
  if (dx < 0) out.push(`move_left(${-dx * 100});`);
  return out;
};
const routeProgram = (route: Array<{ x: number; y: number }>, heights?: number[]) => {
  const lines = ['  calibration();', '  delay(3000);', '  take_off();', '  delay(3000);', '  set_height(100);'];
  let current = { x: 0, y: 0 };
  route.forEach((p, i) => {
    if (heights?.[i] !== undefined) lines.push(`  set_height(${heights[i]});`);
    lines.push(...move(p.x - current.x, p.y - current.y).map((s) => `  ${s}`));
    lines.push('  poshold();');
    current = p;
  });
  lines.push(...move(-current.x, -current.y).map((s) => `  ${s}`), '  poshold();');
  lines.push('  auto_land();');
  return `void setup() {\n${lines.join('\n')}\n}\n\nvoid loop() {\n}\n`;
};
const scaffold = (title: string) => `// ${title}\nvoid setup() {\n  calibration();\n  delay(3000);\n  take_off();\n  delay(3000);\n  set_height(100);\n\n  // วางแผนเส้นทางและคำสั่งให้ครบตามจุดตรวจ\n\n  auto_land();\n}\n\nvoid loop() {\n}\n`;
const wp = (id: string, p: { x: number; y: number }, order: number, z = 100): SceneObject => ({ type: 'waypoint', id, ...p, order, points: 10, r: 65, zMin: z - 12, zMax: z + 12 });
const hoop = (id: string, x: number, y: number, yaw: number, z: number): SceneObject => ({ type: 'hoop', id, x, y, yaw, size: 1, zMin: z - 18, zMax: z + 18, points: 15 });

function makeMission(tier: number, pairNo: number, variant: 'A' | 'B', family: Family, ordinal: number): ExpandedMission {
  const mirror = variant === 'B' ? -1 : 1;
  const template = templates[(pairNo + tier * 2) % templates.length];
  const complexity = Math.min(4, 1 + tier + (pairNo % 2));
  const route = template.slice(0, complexity).map(([x, y]) => ({ x: x * mirror, y }));
  const baseConfig: ScenarioConfig = { pattern: 'grid5', event: 'mission', objects: [], pairId: `flight-${tier + 1}-${String(pairNo + 1).padStart(2, '0')}`, variant, tags: TAGS[family] };
  let solution = routeProgram(route);
  let description = '';
  let needsPayload = false;

  if (family === 'route') {
    baseConfig.objects = route.map((p, i) => wp(`จุด ${i + 1}`, p, i + 1));
    description = `บินผ่านจุดตรวจ ${route.length} จุดตามลำดับ แล้วกลับมาลงที่ฐาน`;
  } else if (family === 'height') {
    const heights = route.map((_, i) => [85, 125, 165, 110][(i + pairNo + tier) % 4]);
    baseConfig.objects = route.map((p, i) => wp(`จุดสูง ${i + 1}`, p, i + 1, heights[i]));
    solution = routeProgram(route, heights);
    description = `ผ่านจุดตรวจ ${route.length} จุด โดยปรับความสูงให้ตรงช่วงที่กำหนด แล้วกลับฐาน`;
  } else if (family === 'hoop') {
    const count = 1 + tier;
    const direction = variant === 'A' ? 1 : -1;
    const flightHeight = 80 + 20 * ((pairNo + tier) % 4);
    const ys = Array.from({ length: count }, (_, i) => direction * (i * 0.5 + 0.25));
    baseConfig.objects = ys.map((y, i) => hoop(`ห่วง ${i + 1}`, 0, y, 0, flightHeight));
    const hoopRoute = Array.from({ length: count }, (_, i) => ({ x: 0, y: direction * (i * 0.5 + 0.5) }));
    solution = routeProgram(hoopRoute, hoopRoute.map(() => flightHeight));
    description = `ลอดห่วง ${count} ใบตามแนวสนาม ปรับความสูงให้ผ่านช่อง แล้วกลับฐาน`;
  } else if (family === 'cargo') {
    needsPayload = true;
    const p = route[Math.min(route.length - 1, Math.floor(route.length / 2))];
    baseConfig.event = 'mission';
    baseConfig.requiresPayload = true;
    baseConfig.objects = [{ type: 'platform', id: 'แท่นส่งของ', ...p, r: 0.55 }, ...route.flatMap((q, i) => q === p ? [] : [wp(`จุดทางผ่าน ${i + 1}`, q, i + 1)])];
    let current = { x: 0, y: 0 };
    const lines = ['  calibration();', '  delay(3000);', '  take_off();', '  delay(3000);', '  set_height(100);'];
    route.forEach((q) => { lines.push(...move(q.x - current.x, q.y - current.y).map((s) => `  ${s}`)); current = q; if (q === p) lines.push('  poshold();', '  drop();'); });
    lines.push(...move(-current.x, -current.y).map((s) => `  ${s}`), '  auto_land();');
    solution = `void setup() {\n${lines.map((s) => `  ${s}`).join('\n')}\n}\n\nvoid loop() {\n}\n`;
    description = `เตรียมสัมภาระจากแผงด้านขวา บินไปแท่น ${p.x >= 0 ? 'ฝั่งขวา' : 'ฝั่งซ้าย'} หยุดนิ่ง ปล่อยของ แล้วกลับฐาน`;
  } else if (family === 'target') {
    const x = (variant === 'A' ? -1 : 1) * (1 + (pairNo % 2));
    const targetY = 2 + (pairNo % 2) * 0.5;
    const z = [100, 140, 170, 125][(pairNo + tier) % 4];
    baseConfig.event = 'innovation';
    baseConfig.objects = [{ type: 'target', id: `เป้า ${ordinal}`, x, y: targetY, cz: z, r: 50 }];
    const startX = x;
    const routeTo = [{ x: startX, y: 0 }];
    const lines = ['  calibration();', '  delay(3000);', '  take_off();', '  delay(3000);', `  set_height(${z});`, ...move(startX, 0).map((s) => `  ${s}`), '  poshold();', '  shoot();'];
    lines.push(...move(-startX, 0).map((s) => `  ${s}`), '  poshold();', '  auto_land();');
    solution = `void setup() {\n${lines.map((s) => `  ${s}`).join('\n')}\n}\n\nvoid loop() {\n}\n`;
    description = `ยืนห่างเป้าอย่างน้อย 1 เมตร ตั้งความสูง ${z} ซม. แล้วเล็งยิงให้โดนวงคะแนน ก่อนกลับฐาน`;
  } else {
    needsPayload = true;
    baseConfig.requiresPayload = true;
    const sign = variant === 'A' ? 1 : -1;
    const mid = { x: 0, y: sign };
    const p = { x: 0, y: sign * 2 };
    baseConfig.objects = [{ type: 'hoop', id: 'ห่วงทางผ่าน', x: 0, y: sign * 0.5, yaw: 0, size: 1, zMin: 50, zMax: 150, points: 15 }, wp('จุดกลาง', mid, 1, 100), { type: 'platform', id: 'แท่นส่งของ', ...p, r: 0.55 }, wp('กลับผ่านจุดตรวจ', { x: 0, y: sign * 0.5 }, 2, 100)];
    const path = [mid, p];
    let current = { x: 0, y: 0 };
    const lines = ['  calibration();', '  delay(3000);', '  take_off();', '  delay(3000);', '  set_height(100);'];
    path.forEach((q, i) => {
      lines.push(...move(q.x - current.x, q.y - current.y).map((s) => `  ${s}`));
      if (i === 1) lines.push('  poshold();', '  drop();');
      current = q;
    });
    lines.push(...move(-current.x, -current.y).map((s) => `  ${s}`), '  poshold();', '  auto_land();');
    solution = `void setup() {\n${lines.map((s) => `  ${s}`).join('\n')}\n}\n\nvoid loop() {\n}\n`;
    description = 'เตรียมสัมภาระ ลอดห่วง ผ่านจุดตรวจตามลำดับ ไปส่งของ แล้วกลับผ่าน checkpoint ก่อนลงฐาน';
  }

  const slug = `flight-${tier + 1}-${String(pairNo + 1).padStart(2, '0')}-${variant.toLowerCase()}`;
  const title = `${NAMES[family]} · ${TIERS[tier]} ${String(ordinal).padStart(3, '0')}`;
  return {
    slug, title, level: TIERS[tier], order: 100 + ordinal,
    brief: `<p>${description}</p><p>เริ่มบนฐาน วางคำสั่งทีละบรรทัด แล้วดูเส้นทางจริงเทียบกับเส้นที่วางแผนไว้</p><p>ลองคิดก่อนบิน: ถ้าโดรนไหลเลยจุด ควรเผื่อเบรกหรือปรับความสูงตรงไหน?</p>`,
    starter: scaffold(title), solution,
    config: { ...baseConfig, requiresPayload: needsPayload },
  };
}

export const expandedMissions: ExpandedMission[] = (() => {
  const out: ExpandedMission[] = [];
  let ordinal = 0;
  for (let tier = 0; tier < 4; tier++) {
    let pairNo = 0;
    for (const [family, pairs] of FAMILY_COUNTS) {
      for (let i = 0; i < pairs; i++, pairNo++) {
        ordinal++;
        out.push(makeMission(tier, pairNo, 'A', family, ordinal));
        ordinal++;
        out.push(makeMission(tier, pairNo, 'B', family, ordinal));
      }
    }
  }
  return out;
})();
