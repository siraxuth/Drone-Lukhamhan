/**
 * ตัวแปลงโค้ด Arduino ของชมรม → ลำดับท่าของโดรน ใช้เล่นเป็น 3 มิติใน <CmdDemo>
 * ไม่ใช่ฟิสิกส์จริง: เป็นภาพให้เห็นว่า "หลังสั่งคำสั่งนี้ โดรนทำอะไร" เท่านั้น
 * ระยะเป็นเซนติเมตร มุมเป็นองศา (หมุนขวา = ค่าบวก) เวลาเป็นวินาทีของแอนิเมชัน
 */
export type Kind = 'calibrate' | 'takeoff' | 'height' | 'move' | 'yaw' | 'land' | 'stop' | 'hold' | 'drop' | 'dir';

export type Step = {
  code: string;
  kind: Kind;
  /** ระยะ (ซม.) · ความสูง (ซม.) · มุม (องศา) */
  v: number;
  /** ทิศของ move: f b l r */
  dir?: 'f' | 'b' | 'l' | 'r';
  /** height: v เป็นค่าเปลี่ยนจากความสูงเดิม ไม่ใช่ค่าเป้า */
  rel?: boolean;
  /** ชื่อสั้นๆ ของสิ่งที่เกิด */
  title: string;
  /** อธิบายว่าโดรนทำอะไร */
  note: string;
  /** เวลาจริงบนโดรนโดยประมาณ (วินาที) ถ้ารู้ */
  real?: number;
  dur: number;
};

export type St = { x: number; z: number; h: number; yaw: number; on: boolean; ball: 'none' | 'held' | 'dropped'; bx: number; bz: number };

const MS = { f: 15.46, b: 15.16, l: 15.65, r: 15.65 } as const;
const NAME = { f: 'ไปข้างหน้า', b: 'ถอยหลัง', l: 'เลื่อนไปทางซ้าย', r: 'เลื่อนไปทางขวา' } as const;
const TAKEOFF_H = 110;

const norm = (s: string) => s.toLowerCase().replace(/_/g, '');

/** แยกอาร์กิวเมนต์แบบง่ายๆ (ตัวเลข ค่าคงที่ที่รู้จัก) */
const CONSTS: Record<string, number> = {
  HEIGHT_TAKEOFF: 110, HEIGHT_FLIGHT: 100, HEIGHT_GROUND: 100, HEIGHT_DROP: 45, HEIGHT_K5: 170, HEIGHT_SHOOT: 120,
};
function num(a: string | undefined, d = 0) {
  if (a == null) return d;
  const t = a.trim();
  if (t in CONSTS) return CONSTS[t];
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : d;
}

const mk = (code: string, kind: Kind, v: number, title: string, note: string, dur: number, extra: Partial<Step> = {}): Step => ({ code, kind, v, title, note, dur, ...extra });

/** รับโค้ด 1 บรรทัด เช่น `drone.fw(250);  // ข้อความอธิบาย` */
export function parseStep(raw: string): Step {
  const [codeRaw, ...c] = raw.split('//');
  const custom = c.join('//').trim();
  const code = codeRaw.trim();
  const m = code.match(/(?:drone\.|pArduino->|drone\.raw\(\)\.)\s*([A-Za-z_0-9]+)\s*\(([^)]*)\)/) ?? code.match(/^\s*([A-Za-z_0-9]+)\s*\(([^)]*)\)/);
  const name = norm(m?.[1] ?? '');
  const args = (m?.[2] ?? '').split(',');
  const a0 = num(args[0]);
  const a1 = num(args[1]);

  let s: Step;
  const moveDir = (d: 'f' | 'b' | 'l' | 'r', fast = false): Step => {
    const cm = Math.abs(a0);
    const ms = (fast ? 11.89 : MS[d]) * cm;
    return mk(code, 'move', cm, `${NAME[d]} ${cm} ซม.`,
      `โดรนเอียงตัวเล็กน้อยแล้ว${NAME[d]} ${cm} ซม. โค้ดรอ ${cm} × ${fast ? 11.89 : MS[d]} = ${Math.round(ms)} ms จากนั้นสั่งเบรกให้ลอยนิ่ง`,
      Math.min(4.2, Math.max(1.6, cm / 90)), { dir: d, real: ms / 1000 + 0.4 });
  };

  switch (name) {
    case 'calibration':
    case 'calibrateanddelay':
      s = mk(code, 'calibrate', 0, 'calibrate ตั้งศูนย์ไจโร', 'โดรนนอนนิ่งบนพื้น มอเตอร์ไม่หมุน ไจโรอ่านค่าตอนนิ่งเก็บไว้เป็น "ศูนย์" ห้ามจับหรือขยับจนกว่าจะรอครบ (ชมรมใช้ 3 วินาที)', 2.4, { real: 3 });
      break;
    case 'takeoff':
      s = mk(code, 'takeoff', TAKEOFF_H, 'take off ขึ้นบิน', 'ใบพัดหมุนเร็วขึ้นทั้ง 4 ตัว โดรนยกตัวจากพื้นขึ้นลอย สั่งแล้วจบทันที ต้องรอ ~4 วินาทีให้ขึ้นถึงก่อนสั่งต่อ', 2.4, { real: 4 });
      break;
    case 'sh':
    case 'setheight':
    case 'holdheight':
    case 'smoothsetheight':
    case 'sethcm':
      s = mk(code, 'height', a0, `ตั้งความสูง ${a0} ซม.`, `โดรนปรับแรงยกให้ลอยที่ความสูง ${a0} ซม. จากพื้น ${name === 'smoothsetheight' ? 'ขยับทีละ 10 ซม. ไม่กระชาก' : 'ถ้าอยู่ต่ำกว่าจะขึ้น ถ้าสูงกว่าจะลง'}`, 1.8, { real: 0.4 });
      break;
    case 'fw':
    case 'moveforward':
    case 'moveforwardcm':
      s = moveDir('f');
      break;
    case 'bw':
    case 'movebackward':
    case 'movebackwardcm':
      s = moveDir('b');
      break;
    case 'ml':
    case 'moveleft':
    case 'moveleftcm':
      s = moveDir('l');
      break;
    case 'mr':
    case 'moveright':
    case 'moverightcm':
      s = moveDir('r');
      break;
    case 'movefastforward': s = moveDir('f', true); break;
    case 'movefastbackward': s = moveDir('b', true); break;
    case 'movefastleft': s = moveDir('l', true); break;
    case 'movefastright': s = moveDir('r', true); break;
    case 'setyaw': {
      const right = a0 !== 2;
      s = mk(code, 'yaw', right ? a1 : -a1, `หมุน${right ? 'ขวา' : 'ซ้าย'} ${a1}°`, `โดรนหมุนตัวอยู่กับที่ไป${right ? 'ทางขวา (ตามเข็มนาฬิกา)' : 'ทางซ้าย (ทวนเข็มนาฬิกา)'} ${a1} องศา ตำแหน่งไม่เปลี่ยน มีแต่หัวที่หันไป`, 1.4 + a1 / 110, { real: (a1 * 42 + 120) / 1000 });
      break;
    }
    case 'smartyaw':
    case 'yawsoftstop': {
      const ang = args.length > 1 ? a1 : a0;
      const right = name === 'yawsoftstop' ? !/false/.test(args[0]) : ang >= 0;
      const deg = Math.abs(ang);
      s = mk(code, 'yaw', right ? deg : -deg, `หมุน${right ? 'ขวา' : 'ซ้าย'} ${deg}°`, `โดรนหมุน${right ? 'ขวา' : 'ซ้าย'} ${deg} องศาแบบเบรกนุ่ม (หมุนเกือบถึง แล้วค่อยๆ หยุด) หัวหยุดตรงมุมมากกว่าหมุนทีเดียว`, 1.6 + deg / 110);
      break;
    }
    case 'autoland':
    case 'land':
      s = mk(code, 'land', 0, 'auto land ลงจอด', 'โดรนค่อยๆ ลดความสูงเองจนแตะพื้น แล้วใบพัดหยุด', 2.6, { real: 4 });
      break;
    case 'stopmotor':
      s = mk(code, 'stop', 0, 'stop motor ตัดมอเตอร์', 'ตัดไฟมอเตอร์ทั้ง 4 ตัวทันที โดรนตกลงพื้นเลย ใช้เฉพาะฉุกเฉิน', 1.8);
      break;
    case 'poshold':
    case 'settle':
    case 'wait':
    case 'delay':
      s = mk(code, 'hold', 0, name === 'delay' || name === 'wait' ? `รอ ${a0} ms` : 'ลอยนิ่ง', name === 'delay' || name === 'wait'
        ? `โค้ดหยุดรอ ${a0} ms โดรนทำตามคำสั่งก่อนหน้าต่อ (ถ้ากำลังลอยก็ลอยอยู่ที่เดิม)`
        : 'บอกโดรนให้ "ล็อกตำแหน่ง" เบรกแรงที่เหลือแล้วลอยนิ่งอยู่ที่เดิม ไม่ให้ไหลต่อ', 1.4, { real: name === 'delay' || name === 'wait' ? a0 / 1000 : 0.22 });
      break;
    case 'setdirection':
    case 'direction': {
      const d = a0;
      if (d === 5 || d === 6) {
        s = mk(code, 'height', d === 5 ? 60 : -60, d === 5 ? 'ขึ้นต่อเนื่อง' : 'ลงต่อเนื่อง', `ส่งทิศ ${d} (${d === 5 ? 'ขึ้น' : 'ลง'}) ความเร็ว ${a1} โดรนไปทางนั้นเรื่อยๆ จนกว่าจะสั่งใหม่`, 1.6, { rel: true });
      } else if (d >= 1 && d <= 4) {
        const dd = (['f', 'b', 'l', 'r'] as const)[d - 1];
        s = mk(code, 'dir', 70, `ส่งทิศ ${d} (${NAME[dd]})`, `โดรนเริ่มบิน${NAME[dd]} ที่ความเร็ว ${a1} และไม่หยุดเอง ต้องสั่งทิศ 7 เพื่อหยุด (ภาพนี้ตัดให้สั้น)`, 2.2, { dir: dd });
      } else {
        s = mk(code, 'hold', 0, 'หยุดลอยนิ่ง', 'ทิศ 7 = ไม่เคลื่อนที่ โดรนเบรกแล้วลอยนิ่ง ใช้หยุดหลังสั่งบินต่อเนื่อง', 1.4, { real: 0.22 });
      }
      break;
    }
    case 'droppayload':
    case 'dropchx':
    case 'missiondropch1ch4':
    case 'dropball':
    case 'servorelease':
    case 'servoreleasedual':
      s = mk(code, 'drop', 0, 'ปล่อยบอล', 'เซอร์โวหมุนเปิดประตูใต้ท้องโดรน บอลหล่นลงพื้น รอครู่หนึ่งแล้วปิดประตู โดรนยังลอยอยู่ที่เดิม', 2.4, { real: 0.3 });
      break;
    default:
      s = mk(code, 'hold', 0, 'คำสั่งนี้ไม่ขยับโดรน', 'คำสั่งนี้ไม่เปลี่ยนตำแหน่ง ความสูง หรือหัวของโดรน ในภาพจึงลอยนิ่ง', 1.2);
  }
  if (custom) s.note = custom;
  return s;
}

export const start = (air: boolean, ball: boolean): St => ({ x: 0, z: 0, h: air ? TAKEOFF_H : 0, yaw: 0, on: air, ball: ball ? 'held' : 'none', bx: 0, bz: 0 });

/** ทิศหัวโดรน (ลบ = ไป -z คือ "ข้างหน้า" ตอนเริ่ม) yaw บวก = หมุนขวา มองจากด้านบน */
export function vec(yawDeg: number, dir: 'f' | 'b' | 'l' | 'r') {
  const t = (yawDeg * Math.PI) / 180;
  const f = [Math.sin(t), -Math.cos(t)], r = [Math.cos(t), Math.sin(t)];
  return dir === 'f' ? f : dir === 'b' ? [-f[0], -f[1]] : dir === 'r' ? r : [-r[0], -r[1]];
}

/** สถานะหลังจบคำสั่ง */
export function end(s: St, p: Step): St {
  const n = { ...s };
  switch (p.kind) {
    case 'takeoff': n.on = true; n.h = p.v; break;
    case 'height': n.h = p.rel ? Math.max(20, s.h + p.v) : p.v; n.on = true; break;
    case 'move': case 'dir': { const [dx, dz] = vec(s.yaw, p.dir!); n.x += dx * p.v; n.z += dz * p.v; break; }
    case 'yaw': n.yaw += p.v; break;
    case 'land': case 'stop': n.h = 0; n.on = false; break;
    case 'drop': n.ball = 'dropped'; n.bx = s.x; n.bz = s.z; break;
    default:
  }
  return n;
}

export const ease = (u: number) => u * u * (3 - 2 * u);
export const clamp01 = (u: number) => Math.min(1, Math.max(0, u));

export type Pose = { x: number; z: number; h: number; yaw: number; pitch: number; roll: number; spin: number; ball: St['ball']; bx: number; by: number; bz: number; door: number };

/** ท่าของโดรนที่ช่วง u (0..1) ของคำสั่ง p เริ่มจากสถานะ a */
export function sample(a: St, p: Step, u: number): Pose {
  const b = end(a, p);
  const L = (x: number, y: number, t: number) => x + (y - x) * t;
  const e = ease(u);
  const pose: Pose = { x: a.x, z: a.z, h: a.h, yaw: a.yaw, pitch: 0, roll: 0, spin: a.on ? 1 : 0, ball: a.ball, bx: a.x, by: a.ball === 'held' ? -1 : 0, bz: a.z, door: 0 };
  if (a.ball === 'dropped') { pose.bx = a.bx; pose.bz = a.bz; }

  switch (p.kind) {
    case 'takeoff':
      pose.h = L(a.h, b.h, ease(clamp01((u - 0.12) / 0.88)));
      pose.spin = clamp01(u / 0.3);
      pose.pitch = 0;
      break;
    case 'land':
      pose.h = L(a.h, 0, ease(clamp01(u / 0.85)));
      pose.spin = 1 - ease(clamp01((u - 0.8) / 0.2));
      break;
    case 'stop':
      pose.h = a.h * (1 - Math.pow(clamp01(u / 0.7), 2));
      pose.spin = 0;
      pose.roll = 18 * clamp01(u * 2) * (1 - clamp01((u - 0.7) / 0.3));
      break;
    case 'height':
      pose.h = L(a.h, b.h, e);
      pose.spin = 1;
      break;
    case 'move': case 'dir': {
      const run = clamp01(u / 0.8);
      const k = ease(run);
      pose.x = L(a.x, b.x, k); pose.z = L(a.z, b.z, k);
      const lean = Math.sin(Math.PI * run) * 13 - (u > 0.8 ? Math.sin(Math.PI * clamp01((u - 0.8) / 0.2)) * 6 : 0);
      if (p.dir === 'f') pose.pitch = lean; else if (p.dir === 'b') pose.pitch = -lean;
      else if (p.dir === 'r') pose.roll = lean; else pose.roll = -lean;
      break;
    }
    case 'yaw':
      pose.yaw = L(a.yaw, b.yaw, ease(clamp01(u / 0.85)));
      break;
    case 'drop': {
      pose.door = Math.sin(Math.PI * clamp01(u / 0.9));
      const fall = clamp01((u - 0.25) / 0.45);
      pose.bx = a.x; pose.bz = a.z;
      pose.ball = u < 0.25 ? 'held' : 'dropped';
      // by = ตำแหน่งบอลสัมพัทธ์กับโดรน (ซม.) ตกจากท้องโดรนลงพื้น
      pose.by = u < 0.25 ? -1 : -1 - (a.h - 7) * fall * fall;
      break;
    }
    case 'hold': {
      pose.pitch = 3 * Math.sin(u * Math.PI * 2) * (1 - u);
      break;
    }
    case 'calibrate':
      pose.spin = 0;
      break;
    default:
  }
  return pose;
}

export const WORLD = 0.0075; // หน่วยโลก 3 มิติต่อ 1 ซม.
