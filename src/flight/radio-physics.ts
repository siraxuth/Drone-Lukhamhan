import type { FlightDifficulty, ManualStick } from './environment';

const GRAVITY = 9.81;
const DEG = Math.PI / 180;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const RADIO_READY_MS = 4920;
export const NEUTRAL_STICK: ManualStick = { forward: 0, right: 0, up: 0, yaw: 0 };

export const radioDynamics = () => ({ pitch: 0, roll: 0, yawRate: 0, thrust: GRAVITY });
export type RadioDynamics = ReturnType<typeof radioDynamics>;

/** Stabilized aircraft model. Velocities are m/s, yaw is degrees, attitude is radians. */
export function stepRadio(
  state: RadioDynamics, stick: ManualStick, yaw: number, velocity: { x: number; y: number; z: number },
  dt: number, quality: number, difficulty: FlightDifficulty, battery: number, height: number, time: number, seed: number,
) {
  const hard = difficulty === 'hard';
  const heading = yaw * DEG;
  const sin = Math.sin(heading), cos = Math.cos(heading);
  const forward = velocity.x * sin - velocity.y * cos;
  const right = velocity.x * cos + velocity.y * sin;
  const maxTilt = (hard ? 23 : 17) * DEG;
  const brake = hard ? 0.95 + quality : difficulty === 'easy' ? 3.3 : 2.4;
  const desiredTilt = (demand: number, speed: number) => clamp((demand * 1.2 - speed) * brake / GRAVITY, -maxTilt, maxTilt);
  const response = 1 - Math.exp(-dt / (0.09 + (1 - quality) * 0.1));
  state.pitch += (desiredTilt(stick.forward, forward) - state.pitch) * response;
  state.roll += (desiredTilt(stick.right, right) - state.roll) * response;
  state.yawRate += (stick.yaw * (hard ? 105 : 85) - state.yawRate) * response;
  const lift = Math.cos(state.pitch) * Math.cos(state.roll);
  const groundEffect = 1 + 0.10 * Math.exp(-Math.max(0, height) / 14);
  const targetThrust = (GRAVITY + 3.6 * (stick.up * 0.65 - velocity.z)) / (lift * groundEffect);
  const maxThrust = GRAVITY * (1.03 + battery / 250);
  state.thrust += (clamp(targetThrust, 0, maxThrust) - state.thrust) * (1 - Math.exp(-dt / 0.12));
  const thrust = state.thrust * groundEffect;
  const bodyForward = thrust * Math.sin(state.pitch) * Math.cos(state.roll);
  const bodyRight = thrust * Math.sin(state.roll);
  const wind = hard ? 0.25 * (1 - quality) + 0.12 : 0;
  const drag = 0.18 + 0.13 * Math.hypot(velocity.x, velocity.y);
  return {
    x: velocity.x + (bodyForward * sin + bodyRight * cos - drag * velocity.x + wind * Math.sin(time / 1800 + seed)) * dt,
    y: velocity.y + (-bodyForward * cos + bodyRight * sin - drag * velocity.y + wind * Math.cos(time / 2100 + seed)) * dt,
    z: velocity.z + (thrust * lift - GRAVITY - 0.12 * velocity.z * Math.abs(velocity.z)) * dt,
    yaw: yaw + state.yawRate * dt,
  };
}
