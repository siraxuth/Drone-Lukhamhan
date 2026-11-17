import type { FlightConfig, Result } from './engine';
import { simulate } from './engine';
import { inLaunchZone, type CeilingLights, type FieldLights, type FlightDifficulty, type PlayerPosition } from './environment';

export type LaunchPose = { x: number; y: number; yaw: number };
export type LaunchForecast = { pose: LaunchPose; distanceM: number; score: number; ok: boolean; failure?: string; reached: string[]; required: number; ordered: number };

export function forecastLaunch(code: string, cfg: FlightConfig, key: number, pose: LaunchPose, difficulty: FlightDifficulty, lights: FieldLights, seed: number, player?: PlayerPosition, ceilingLights?: CeilingLights): LaunchForecast {
  const result: Result = simulate(code, cfg, seed, key, { difficulty, lights, ceilingLights, launch: pose, actions: player ? [{ t: 0, type: 'walk', position: player }] : [] });
  const distanceM = result.frames.reduce((furthest, frame) => Math.max(furthest, Math.hypot(frame.x - pose.x, frame.y - pose.y) / 100), 0);
  const goals = [...[...(cfg.waypoints ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), ...(cfg.hoops ?? [])];
  const reached = result.visits.filter(visit => goals.some(goal => goal.id === visit.id)).map(visit => visit.id);
  let ordered = 0;
  for (const point of [...(cfg.waypoints ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    if (!reached.includes(point.id)) break;
    ordered++;
  }
  return { pose, distanceM, score: result.score, ok: result.ok, failure: result.events.find(event => event.kind === 'error')?.text, reached, required: goals.length, ordered };
}

/** Compare code paths against mission goals; the configured start wins ties. */
export function recommendLaunch(code: string, cfg: FlightConfig, key: number, difficulty: FlightDifficulty, lights: FieldLights, seed: number, player?: PlayerPosition, ceilingLights?: CeilingLights): LaunchForecast {
  const base = { ...cfg.start, yaw: cfg.startYaw ?? 0 };
  let best = forecastLaunch(code, cfg, key, base, difficulty, lights, seed, player, ceilingLights);
  if (best.ok && best.required > 0 && best.reached.length === best.required) return best;
  const offsets: Array<[number, number]> = [[0, 0], [0, -40], [40, 0], [0, 40], [-40, 0]];
  const yawOffsets = [0, 45, 315, 90, 270, 135, 225, 180];
  const better = (a: LaunchForecast, b: LaunchForecast) => {
    const ac = a.reached.length, bc = b.reached.length;
    if (ac !== bc) return ac > bc;
    if (a.ordered !== b.ordered) return a.ordered > b.ordered;
    if (a.ok !== b.ok) return a.ok;
    if (a.score !== b.score) return a.score > b.score;
    const ad = Math.hypot(a.pose.x - base.x, a.pose.y - base.y) + Math.abs(((a.pose.yaw - base.yaw + 540) % 360) - 180);
    const bd = Math.hypot(b.pose.x - base.x, b.pose.y - base.y) + Math.abs(((b.pose.yaw - base.yaw + 540) % 360) - 180);
    return ad < bd;
  };
  for (const [dx, dy] of offsets) for (const yawOffset of yawOffsets) {
    if (dx === 0 && dy === 0 && yawOffset === 0) continue;
    const pose = { x: cfg.start.x + dx, y: cfg.start.y + dy, yaw: ((base.yaw + yawOffset) % 360 + 360) % 360 };
    if (!inLaunchZone(pose.x, pose.y, cfg.start.x, cfg.start.y)) continue;
    const candidate = forecastLaunch(code, cfg, key, pose, difficulty, lights, seed, player, ceilingLights);
    if (better(candidate, best)) best = candidate;
  }
  const firstGoal = [...(cfg.waypoints ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0] ?? cfg.hoops?.[0];
  if (firstGoal && best.reached.length < best.required) {
    for (const yawOffset of yawOffsets) {
      const yaw = ((base.yaw + yawOffset) % 360 + 360) % 360;
      const result = simulate(code, cfg, seed, key, { difficulty, lights, ceilingLights, launch: { ...base, yaw } });
      const zMin = firstGoal.zMin, zMax = firstGoal.zMax;
      let closest: Result['frames'][number] | null = null;
      let distance = Infinity;
      for (let i = 0; i < result.frames.length; i += Math.max(1, Math.floor(result.frames.length / 120))) {
        const frame = result.frames[i];
        if (frame.z < zMin || frame.z > zMax) continue;
        const d = Math.hypot(frame.x - firstGoal.x, frame.y - firstGoal.y);
        if (d < distance) { closest = frame; distance = d; }
      }
      if (!closest) continue;
      const pose = { x: Math.round(Math.max(-80, Math.min(1080, base.x + firstGoal.x - closest.x))), y: Math.round(Math.max(-80, Math.min(1080, base.y + firstGoal.y - closest.y))), yaw };
      if (pose.x === base.x && pose.y === base.y) continue;
      const candidate = forecastLaunch(code, cfg, key, pose, difficulty, lights, seed, player, ceilingLights);
      if (better(candidate, best)) best = candidate;
    }
  }
  return best;
}
