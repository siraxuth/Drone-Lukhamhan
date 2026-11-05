export type MeasurePoint = { x: number; y: number };
export type Measurement = { id: number; kind: 'distance' | 'area'; points: MeasurePoint[] };

export const measureColors = ['#38bdf8', '#fbbf24', '#a78bfa', '#34d399', '#fb7185'] as const;
export const measureColor = (id: number) => measureColors[(id - 1) % measureColors.length];
export const segmentLength = (a: MeasurePoint, b: MeasurePoint) => Math.hypot(a.x - b.x, a.y - b.y);
export const pathLength = (points: MeasurePoint[]) => points.slice(1).reduce((sum, point, index) => sum + segmentLength(points[index], point), 0);
export const polygonArea = (points: MeasurePoint[]) => points.length < 3 ? 0 : Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + point.x * next.y - next.x * point.y;
}, 0)) / 2;
export const clampMeasurePoint = (point: MeasurePoint): MeasurePoint => ({
  x: Math.max(-5, Math.min(5, Math.round(point.x * 100) / 100)),
  y: Math.max(-5, Math.min(5, Math.round(point.y * 100) / 100)),
});
