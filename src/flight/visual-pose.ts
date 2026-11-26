import { toField } from './config';
import { frameAt, type Frame } from './engine';

export function flightMotion(frames: Frame[], time: number, hard: boolean, shakeSeed: number | null) {
  const frame = frameAt(frames, time);
  const previousTime = Math.max(frames[0].t, time - 120);
  const previous = frameAt(frames, previousTime);
  const earlier = frameAt(frames, Math.max(frames[0].t, time - 240));
  const position = toField(frame.x, frame.y);
  const before = toField(previous.x, previous.y);
  const first = toField(earlier.x, earlier.y);
  const span = Math.max(0.001, (time - previousTime) / 1000);
  const vx = (position.x - before.x) / span, vy = (position.y - before.y) / span;
  const wx = (before.x - first.x) / span, wy = (before.y - first.y) / span;
  const yaw = frame.yaw * Math.PI / 180;
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  const forward = vx * sin + vy * cos, side = vx * cos - vy * sin;
  const forwardAccel = (forward - wx * sin - wy * cos) / span;
  const sideAccel = (side - wx * cos + wy * sin) / span;
  const limit = hard ? 34 : 22;
  const shake = hard && shakeSeed !== null ? 7 : 0;
  const seed = shakeSeed ?? 0;
  const tilt = (value: number) => Math.max(-limit, Math.min(limit, value));
  return {
    frame, ...position, alt: frame.z / 100, yaw: frame.yaw, speed: Math.hypot(vx, vy),
    pitch: frame.pitch ?? tilt(forward * 8 + forwardAccel * 4.5 + Math.sin(time / 260 + seed) * shake),
    roll: frame.roll ?? tilt(side * 8 + sideAccel * 4.5 + Math.cos(time / 310 + seed * 0.7) * shake),
  };
}
