import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

/** spring นุ่มไม่เด้งเกิน เริ่มที่เฟรม delay (0 → 1) */
export function useIn(delay = 0, damping = 200) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping } });
}

/** ค่าที่วิ่งเส้นตรงจาก a ไป b ในช่วงเฟรม [from, to] */
export function useLinear(from: number, to: number, a: number, b: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, to], [a, b], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

/** ลอยขึ้นและจางเข้า ใช้กับข้อความ/การ์ด */
export const rise = (p: number, dist = 40): React.CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * dist}px)` });
