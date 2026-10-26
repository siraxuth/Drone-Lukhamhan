import type { ScenarioConfig, SceneObject } from '@/lib/scenarios';

const wp = (id: string, x: number, y: number, order?: number, extra: Partial<SceneObject> = {}): SceneObject => ({ type: 'waypoint', id, x, y, order, points: 10, ...extra } as SceneObject);

/** ด่านลอยนิ่งเหนือฐาน 90–130 ซม. แล้วลงจอด (คะแนนเต็ม 20) */
export const SC_HOVER: ScenarioConfig = { pattern: 'blank', event: 'mission', objects: [wp('ลอยเหนือฐาน', 0, 0, undefined, { zMin: 90, zMax: 130, r: 40 })] };
/** เดินตรง 2 ช่อง C4 → C5 แล้วลงจอด (คะแนนเต็ม 30) */
export const SC_LINE: ScenarioConfig = { pattern: 'grid5', event: 'mission', objects: [wp('C4', 0, 1, 1), wp('C5', 0, 2, 2)] };
/** เดินตัว L: ขึ้น 2 ช่อง แล้วขวา 2 ช่อง (คะแนนเต็ม 50) */
export const SC_L: ScenarioConfig = { pattern: 'grid5', event: 'mission', objects: [wp('C4', 0, 1, 1), wp('C5', 0, 2, 2), wp('D5', 1, 2, 3), wp('E5', 2, 2, 4)] };

/** เดินสี่เหลี่ยม 1×1 ม. ด้วยการหมุนหัว: (0,1) → (1,1) → (1,0) แล้วกลับลงฐาน (คะแนนเต็ม 40) */
export const SC_SQUARE: ScenarioConfig = { pattern: 'grid5', event: 'mission', objects: [wp('B', 0, 1, 1), wp('C', 1, 1, 2), wp('D', 1, 0, 3)] };
/** ลอดห่วงใบเดียวที่ 1.2 ม. หน้าฐาน แล้วผ่านจุดหลังห่วง (ห่วงเปิดช่อง 55–150 ซม.) */
export const SC_HOOP: ScenarioConfig = {
  pattern: 'grid5', event: 'mission',
  objects: [{ type: 'hoop', id: 'ห่วง', x: 0, y: 1.2, yaw: 0, size: 1, zMin: 55, zMax: 150, points: 15 } as SceneObject, wp('หลังห่วง', 0, 2, 1)],
};
/** ส่งบอลลงแท่นกลมที่ช่อง (0,2) ระยะ 2 ม. หน้าฐาน */
export const SC_DROP: ScenarioConfig = { pattern: 'grid5', event: 'mission', objects: [{ type: 'platform', id: 'แท่น', x: 0, y: 2, r: 0.5 } as SceneObject] };
