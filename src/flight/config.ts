import { FIELD, balloonId } from '@/field/layout';
import type { EventId } from '@/rules/types';
import type { FlightConfig } from './engine';
import { baseAt, startOf, type ScenarioConfig } from '@/lib/scenarios';

/** แปลงพิกัดสนามจริง (เมตร, y เหนือ) → พิกัดเอนจิน (ซม., y ลง, กลางสนาม = 500,500) */
const sx = (x: number) => Math.round(500 + x * 100);
const sy = (y: number) => Math.round(500 - y * 100);

const PLATFORM_NAMES = ['ซ้ายบน', 'ขวาบน', 'ซ้ายล่าง', 'ขวาล่าง'];
const TARGET_NAMES = ['เป้าซ้ายบน', 'เป้าขวาบน', 'เป้าซ้ายล่าง', 'เป้าขวาล่าง'];

/** คู่ประตูตามโค้ดภารกิจของชมรม: แท่นฝั่งซ้าย = ประตู 1&4, ฝั่งขวา = 2&3 */
export function buildConfig(event: EventId): FlightConfig {
  const platforms = FIELD.platform.positions.map(([x, y], i) => ({
    id: PLATFORM_NAMES[i], x: sx(x), y: sy(y), r: FIELD.platform.radius * 100, gates: (x < 0 ? 'ch1_ch4' : 'ch2_ch3') as 'ch1_ch4' | 'ch2_ch3',
  }));
  const balloons = FIELD.balloons.groups.flatMap((g, gi) => [-1, 0, 1].map((k) => ({
    id: balloonId(gi, k),
    x: sx(g.center[0] + (g.along === 'x' ? k * FIELD.balloons.spacing : 0)),
    y: sy(g.center[1] + (g.along === 'y' ? k * FIELD.balloons.spacing : 0)),
    z: Math.round((FIELD.balloons.totalHeight - 0.15) * 100),
  })));
  const boards = FIELD.target.positions.map(([x, y], i) => ({ id: TARGET_NAMES[i], x: sx(x), y: sy(y), cz: FIELD.target.centerHeight * 100, r: (FIELD.target.diameter / 2) * 100 }));
  return {
    start: { x: 500, y: 500 },
    pad: { half: (FIELD.takeoff.size / 2) * 100 },
    // ช่องห่วงอยู่ระหว่าง 0.2–1.2 ม. จากพื้น z คือกึ่งกลางโดรน: ขาต่ำกว่า 7 ซม. ต้องพ้นคานล่าง, ตัวบนสูงกว่า ~4 ซม. ต้องพ้นคานบน (เผื่อ 3–4 ซม.)
    hoop: { half: (FIELD.hoop.size / 2) * 100, zMin: FIELD.hoop.bottom * 100 + 7 + 3, zMax: FIELD.hoop.top * 100 - 4 - 4 },
    platforms: event === 'innovation' ? [] : platforms,
    balloons: event === 'aviation' ? balloons : [],
    boards: event === 'innovation' ? boards : [],
    ballCap: 20,
    points: { ball: 1, balloon: 5, platformLanding: 5, padThroughHoop: 20, padNoHoop: 10 },
    boardRings: [...FIELD.target.rings],
  };
}

/** เหนือ/ใต้ ของพิกัดเอนจิน → พิกัดสนามจริง (เมตร) สำหรับวาด 3 มิติ */
export const toField = (x: number, y: number) => ({ x: (x - 500) / 100, y: (500 - y) / 100 });

/**
 * ตั้งค่าเอนจินจากโจทย์ฝึก
 * - สนามแข่งจริง (standard): ใช้แท่น/ลูกโป่ง/เป้าตามกติกา + จุดผ่าน/ห่วงที่เพิ่ม
 * - กริด/พื้นว่าง: ใช้เฉพาะวัตถุที่วางไว้ ไม่มีห่วงมาตรฐาน ลงจอดบนแท่นฐาน = 10 คะแนน
 */
export function buildScenarioConfig(sc: ScenarioConfig): FlightConfig {
  const base = buildConfig(sc.event);
  const free = sc.pattern !== 'standard';
  const cfg: FlightConfig = { ...base };
  if (free) {
    cfg.free = true;
    const st = startOf(sc), pb = baseAt(sc);
    cfg.start = { x: sx(st.x), y: sy(st.y) };
    cfg.startYaw = st.yaw;
    cfg.padAt = pb ? { x: sx(pb.x), y: sy(pb.y) } : null;
    cfg.hoop = { half: 75, zMin: 0, zMax: 1000 };
    cfg.points = { ...base.points, padThroughHoop: 10, padNoHoop: 10 };
    cfg.platforms = sc.objects.flatMap((o) => (o.type === 'platform' ? [{ id: o.id, x: sx(o.x), y: sy(o.y), r: (o.r ?? 0.5) * 100, gates: 'any' as const }] : []));
    cfg.balloons = sc.objects.flatMap((o) => (o.type === 'balloon' ? [{ id: o.id, x: sx(o.x), y: sy(o.y), z: o.z ?? 145 }] : []));
    cfg.boards = sc.objects.flatMap((o) => (o.type === 'target' ? [{ id: o.id, x: sx(o.x), y: sy(o.y), cz: o.cz ?? 140, r: o.r ?? 50 }] : []));
  }
  cfg.waypoints = sc.objects.flatMap((o) => (o.type === 'waypoint' ? [{ id: o.id, x: sx(o.x), y: sy(o.y), r: o.r ?? 45, zMin: o.zMin ?? 45, zMax: o.zMax ?? 250, points: o.points ?? 10, order: o.order }] : []));
  cfg.hoops = sc.objects.flatMap((o) => (o.type === 'hoop' ? [{ id: o.id, x: sx(o.x), y: sy(o.y), size: (o.size ?? 1) * 100, yaw: o.yaw ?? 0, zMin: o.zMin ?? 55, zMax: o.zMax ?? 150, points: o.points ?? 15 }] : []));
  return cfg;
}
