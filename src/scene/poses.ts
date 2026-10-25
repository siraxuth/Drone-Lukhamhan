/**
 * ท่าของโดรนต่อ section (อ้างด้วย data-pose ใน DOM)
 *
 * x,y   = ตำแหน่งบนจอ เป็นสัดส่วนของครึ่งจอ (-1..1)
 * s     = ขนาด
 * view  = มุมที่หันให้คนดู: rx ก้มมองจากบน (0 = มองระดับสายตา, 90 = มองจากบนลงล่าง), ry หันหัวโดรน (0 = หันหน้าเข้าหาคนดู, 90 = หันหัวไปทางขวา)
 * move  = ท่าที่เล่นตามระยะเลื่อนในฉากนั้น (ดู Drone3D)
 * spin  = ความเร็วใบพัด 0..1 (1 = เต็มที่) · spins = แยกรายใบ [หน้าขวา, หน้าซ้าย, หลังซ้าย, หลังขวา]
 * arrows = แสดงลูกศรทิศการหมุนของใบพัด
 * my, ms = ตำแหน่งแนวตั้ง (สัดส่วนความสูงจอ, + = ขึ้น) และขนาด บนจอแคบ (มือถือ)
 */
export type Move = 'none' | 'hover' | 'forward' | 'side' | 'turn' | 'push';

export type Pose = {
  label: string;
  x: number; y: number; s: number;
  rx: number; ry: number;
  explode: number;
  spin: number;
  spins?: [number, number, number, number];
  arrows: number;
  move: Move;
  my: number; ms: number;
  slot: number; // > 0 = ให้โดรนไปอยู่กึ่งกลางกล่อง [data-drone-slot] โดยกว้างเป็นสัดส่วนนี้ของกล่อง
  alt: number; // ซม. แสดงใน HUD
};

const P = (label: string, p: Partial<Pose>): Pose => ({
  label, x: 0.5, y: 0, s: 1, rx: 22, ry: -28, explode: 0, spin: 0.7, arrows: 0, move: 'hover', my: 0.22, ms: 0.25, slot: 0, alt: 110, ...p,
});

export const poses: Record<string, Pose> = {
  hero: P('พร้อมบิน', { x: 0.55, y: 0.02, s: 1.25, rx: 30, ry: -30, my: 0.3 }),
  learn: P('เลือกบทเรียน', { x: -0.6, y: 0.12, s: 0.8, rx: 34, ry: 35, spin: 0.5 }),

  // ฉากเรื่องเล่า: มุมกล้องเลือกให้เห็นท่านั้นชัดที่สุด
  lift: P('ลอยนิ่ง', { slot: 0.5, rx: 10, ry: -24, move: 'none', spin: 1 }),
  rotors: P('ใบพัดหมุนสวนกัน', { slot: 0.5, rx: 82, ry: 0, arrows: 1, spin: 0.25, move: 'none' }),
  pitch: P('ก้มหัวพุ่งไปข้างหน้า', { slot: 0.5, rx: 6, ry: 90, move: 'forward', spin: 0.85 }),
  roll: P('เอียงข้างแล้วเลื่อน', { slot: 0.5, rx: 6, ry: 0, move: 'side', spin: 0.85 }),
  yaw: P('หมุนตัวอยู่กับที่', { slot: 0.5, rx: 62, ry: 0, move: 'turn', arrows: 1, spin: 0.35 }),
  mixing: P('แบ่งแรงให้ 4 ใบพัด', { slot: 0.5, rx: 80, ry: 0, arrows: 1, spin: 0.4, spins: [0.15, 0.7, 0.15, 0.7], move: 'none' }),
  pid: P('โดนลมแล้วกลับมานิ่ง', { slot: 0.5, rx: 8, ry: 0, move: 'push', spin: 0.85 }),

  protocol: P('รับคำสั่ง', { x: 0.62, y: 0.35, s: 0.55, rx: 26, ry: -40, spin: 0.8 }),
  code: P('ทำตามโค้ด', { x: 0, y: 0.1, s: 0.7, rx: 30, ry: 25, spin: 0.6 }),
  specs: P('แยกชิ้นส่วนให้ดู', { x: 0.55, y: 0.18, s: 0.9, rx: 40, ry: 25, explode: 1, spin: 0, move: 'none', alt: 0 }),
  field: P('บินเหนือสนาม', { x: -0.55, y: 0.05, s: 0.95, rx: 78, ry: 20, spin: 0.9, alt: 150 }),
  showcase: P('โชว์ผลงาน', { x: 0.62, y: -0.25, s: 0.6, rx: 18, ry: -50, spin: 0.9, alt: 120 }),
  simulator: P('ซ้อมในจอก่อน', { x: -0.55, y: 0.1, s: 0.8, rx: 64, ry: 30, spin: 0.8, alt: 130 }),
  faq: P('รอคำถาม', { x: 0.65, y: 0.3, s: 0.5, rx: 24, ry: -20, spin: 0.4, alt: 80 }),
  closing: P('ไปต่อกัน', { x: 0, y: 0.05, s: 1.45, rx: 14, ry: 0, spin: 1, alt: 160 }),
};
