import type { FlightConfig, Result } from './engine';
import { simulate } from './engine';
import { inLaunchZone, type FieldLights, type FlightDifficulty, type PlayerPosition } from './environment';

export type LaunchPose = { x: number; y: number; yaw: number };
export type LaunchForecast = { pose: LaunchPose; distanceM: number; score: number; ok: boolean; failure?: string };

export function forecastLaunch(code: string, cfg: FlightConfig, key: number, pose: LaunchPose, difficulty: FlightDifficulty, lights: FieldLights, seed: number, player?: PlayerPosition): LaunchForecast {
  const result: Result = simulate(code, cfg, seed, key, { difficulty, lights, launch: pose, actions: player ? [{ t: 0, type: 'walk', position: player }] : [] });
  const distanceM = result.frames.reduce((furthest, frame) => Math.max(furthest, Math.hypot(frame.x - pose.x, frame.y - pose.y) / 100), 0);
  return { pose, distanceM, score: result.score, ok: result.ok, failure: result.events.find(event => event.kind === 'error')?.text };
}

/** Compare positions inside the launch zone using the same code and flight model as the run. */
export function recommendLaunch(code: string, cfg: FlightConfig, key: number, difficulty: FlightDifficulty, lights: FieldLights, seed: number, player?: PlayerPosition): LaunchForecast {
  const offsets: Array<[number, number]> = [[0, 0], [0, -40], [40, 0], [0, 40], [-40, 0]];
  const yawOffsets = [0, 45, 315, 90, 270, 135, 225, 180];
  let best: LaunchForecast | null = null;
  for (const [dx, dy] of offsets) for (const yawOffset of yawOffsets) {
    const pose = { x: cfg.start.x + dx, y: cfg.start.y + dy, yaw: ((cfg.startYaw ?? 0) + yawOffset) % 360 };
    if (!inLaunchZone(pose.x, pose.y, cfg.start.x, cfg.start.y)) continue;
    const candidate = forecastLaunch(code, cfg, key, pose, difficulty, lights, seed, player);
    if (!best || Number(candidate.ok) > Number(best.ok)
      || candidate.ok === best.ok && (candidate.distanceM > best.distanceM + 0.01
        || Math.abs(candidate.distanceM - best.distanceM) <= 0.01 && candidate.score > best.score)) best = candidate;
  }
  return best ?? forecastLaunch(code, cfg, key, { ...cfg.start, yaw: cfg.startYaw ?? 0 }, difficulty, lights, seed, player);
}
