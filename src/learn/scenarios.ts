import type { ScenarioConfig, SceneObject } from '@/lib/scenarios';

const wp = (id: string, x: number, y: number, order?: number, extra: Partial<SceneObject> = {}): SceneObject => ({ type: 'waypoint', id, x, y, order, points: 10, ...extra } as SceneObject);

/** ด่านลอยนิ่งเหนือฐาน 90–130 ซม. แล้วลงจอด (คะแนนเต็ม 20) */
export const SC_HOVER: ScenarioConfig = { pattern: 'blank', event: 'mission', objects: [wp('ลอยเหนือฐาน', 0, 0, undefined, { zMin: 90, zMax: 130, r: 40 })] };
/** เดินตรง 2 ช่อง C4 → C5 แล้วลงจอด (คะแนนเต็ม 30) */
export const SC_LINE: ScenarioConfig = { pattern: 'grid5', event: 'mission', objects: [wp('C4', 0, 1, 1), wp('C5', 0, 2, 2)] };
/** เดินตัว L: ขึ้น 2 ช่อง แล้วขวา 2 ช่อง (คะแนนเต็ม 50) */
export const SC_L: ScenarioConfig = { pattern: 'grid5', event: 'mission', objects: [wp('C4', 0, 1, 1), wp('C5', 0, 2, 2), wp('D5', 1, 2, 3), wp('E5', 2, 2, 4)] };
