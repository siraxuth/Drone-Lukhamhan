import { FIELD } from '@/field/layout';

const FIELD_CM = FIELD.size * 100;

export type FlightDifficulty = 'easy' | 'medium' | 'hard';
export type LedColor = 'cyan' | 'blue' | 'ice';
export type CornerLight = { enabled: boolean; color: LedColor; intensity: number };
export type FieldLights = [CornerLight, CornerLight, CornerLight, CornerLight];
export type CeilingLights = [boolean, boolean, boolean, boolean];
export type PlayerPosition = { x: number; y: number }; // field metres, north-positive
export type ManualStick = { forward: number; right: number; up: number; yaw: number };
export type FlightAction =
  | { t: number; type: 'walk'; position: PlayerPosition }
  | { t: number; type: 'manual'; enabled: boolean }
  | { t: number; type: 'stick'; value: ManualStick }
  | { t: number; type: 'land' }
  | { t: number; type: 'pickup' }
  | { t: number; type: 'flip' } // ผลจำลองเก่าที่บันทึกไว้ในเครื่อง
  | { t: number; type: 'power' };
export type FlightEnvironment = {
  difficulty: FlightDifficulty;
  lights: FieldLights;
  ceilingLights?: CeilingLights;
  actions?: FlightAction[];
  launch?: { x: number; y: number; yaw: number }; // engine centimetres
  timeLimitMs?: number;
  completed?: {
    balls: Array<{ id: string; count: number }>;
    balloons: string[];
    platforms: string[];
    boards: Array<{ id: string; points: number }>;
    visits: string[];
  };
};

const off = (): CornerLight => ({ enabled: false, color: 'cyan', intensity: 0.7 });
export const LIGHTS_OFF: FieldLights = [off(), off(), off(), off()];
export const LIGHTS_ON: FieldLights = [
  { enabled: true, color: 'cyan', intensity: 0.7 },
  { enabled: true, color: 'blue', intensity: 0.8 },
  { enabled: true, color: 'blue', intensity: 0.7 },
  { enabled: true, color: 'ice', intensity: 0.8 },
];
export const CEILING_LIGHTS_ON: CeilingLights = [true, true, true, true];

/** Four fixtures at field corners, ordered NW, NE, SW, SE. Pure math also runs on 2D devices. */
export function opticalFlowQuality(x: number, y: number, z: number, lights: FieldLights, player?: PlayerPosition, ceilingLights?: CeilingLights): number {
  const corners = [[0, 0], [FIELD_CM, 0], [0, FIELD_CM], [FIELD_CM, FIELD_CM]] as const;
  let glare = 0;
  let illumination = 0.28; // ambient field light; a deep shadow can also lose floor detail
  let overheadFill = 0;
  for (let i = 0; i < corners.length; i++) {
    if (ceilingLights?.[i]) {
      const [cx, cy] = corners[i];
      const reach = Math.max(0.25, 1 - Math.hypot(x - cx, y - cy) / 1500);
      overheadFill += reach * 0.17;
      illumination += reach * 0.17;
    }
    const light = lights[i];
    if (!light.enabled) continue;
    const [lx, ly] = corners[i];
    const distance = Math.hypot(x - lx, y - ly);
    const reach = Math.max(0, 1 - distance / 1000);
    const px = player ? 500 + player.x * 100 : -1000;
    const py = player ? 500 - player.y * 100 : -1000;
    const along = ((px - lx) * (x - lx) + (py - ly) * (y - ly)) / Math.max(1, distance * distance);
    const shadowDistance = Math.abs((px - lx) * (y - ly) - (py - ly) * (x - lx)) / Math.max(1, distance);
    const blocked = player && along > 0.1 && along < 0.96 && shadowDistance < 38 ? 0.16 : 1;
    const exposure = Math.max(0, Math.min(1, light.intensity)) * reach * blocked;
    illumination += exposure * 0.3;
    glare += exposure * (light.color === 'blue' ? 0.36 : light.color === 'ice' ? 0.3 : 0.26);
  }
  const height = z < 35 ? (z / 35) * 0.55 : z > 180 ? Math.max(0.35, 1 - (z - 180) / 300) : 1;
  const dark = Math.max(0, 0.35 - illumination) * 1.5;
  const quality = height * (1 - glare * (1 - Math.min(0.4, overheadFill * 0.55)) - dark);
  return Math.max(0.08, Math.min(1, quality));
}

export function inLaunchZone(x: number, y: number, baseX: number, baseY: number): boolean {
  return x >= 12 && x <= FIELD_CM - 12 && y >= 12 && y <= FIELD_CM - 12
    && Math.abs(x - baseX) <= 63 && Math.abs(y - baseY) <= 63;
}
