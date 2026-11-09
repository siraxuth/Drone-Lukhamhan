// One mount per loose kit part (manual p.02, 04-06). Arm 1 is front-left, numbered clockwise from above.
export const labels = {
  beam: 'คาน 11 รู',
  bolt: 'น็อต M3×8 (ยึดลำ)',
  motor: 'ชุดมอเตอร์พร้อมสาย ปลั๊ก ใบพัด และกรงครอบ',
  mscrew: 'น็อต M3×8 (ใต้คาน)',
  bracket: 'คาน 3 รู',
  pin: 'พิน 2780 · ล็อกคาน 3 รู',
  leglock: 'พิน 32054 · ล็อกขา',
  leg: 'แกนขา (cross axle)',
  battery: 'แบตเตอรี่',
  plug: 'ขั้วสายแบต',
} as const;
export type Kind = keyof typeof labels;
export const kindOf = (id: string) => id.split('-')[0] as Kind;
// White plug = counter-clockwise motor on the white-dot corners, arms 2 and 4 (manual p.04-05).
export const whiteArm = (id: string) => Number(id.split('-')[1]) % 2 === 0;
export const sockets = [
  ...[1, 2, 3, 4].flatMap((i) => [
    `beam-${i}`,
    `bolt-${i}-0`,
    `bolt-${i}-1`,
    `motor-${i}`,
    `pin-${i}`,
    `bracket-${i}`,
    `leglock-${i}`,
    `mscrew-${i}-0`,
    `mscrew-${i}-1`,
    `leg-${i}`,
  ]),
  'battery',
  'plug',
];
export function prerequisites(id: string) {
  const [kind, arm] = id.split('-');
  if (kind === 'bolt' || kind === 'motor' || kind === 'pin') return [`beam-${arm}`];
  if (kind === 'bracket') return [`pin-${arm}`];
  if (kind === 'leglock') return [`bracket-${arm}`];
  if (kind === 'mscrew') return [`motor-${arm}`];
  if (kind === 'leg') return [`leglock-${arm}`];
  return kind === 'plug' ? ['battery'] : [];
}
