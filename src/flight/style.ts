/**
 * โหมดการเขียนโค้ดของตัวจำลอง
 * any = ง่าย: ชื่อสั้น (fw, sh) หรือ drone.xxx หรือ pArduino->xxx ก็ได้ ไม่สนตัวพิมพ์
 * drone = บังคับ drone.ชื่อ() ตามคลาส DroneEasy (ตัวพิมพ์เล็กใหญ่ต้องตรง)
 * parduino = บังคับ pArduino->ชื่อเต็ม() ตามคลาส Arduino ใน protocol.hpp (ตัวพิมพ์เล็กใหญ่ต้องตรง)
 */
export type Style = 'any' | 'drone' | 'parduino';

export const STYLES: Array<{ id: Style; label: string; hint: string }> = [
  { id: 'any', label: 'ง่าย', hint: 'เขียนสั้นๆ ได้ เช่น fw(100); หรือแบบเต็มก็ได้' },
  { id: 'drone', label: 'drone.', hint: 'ต้องเขียน drone.fw(100); ตัวพิมพ์เล็กใหญ่ต้องตรง' },
  { id: 'parduino', label: 'pArduino->', hint: 'ต้องเขียน pArduino->move_forward_cm(100); เหมือนโค้ดจริงของชมรม' },
];

/** เมธอดของ DroneEasy.hpp (ชื่อตรงตัวอักษร) ที่ตัวจำลองรู้จัก */
export const DRONE_NAMES = new Set([
  'calibration', 'calibrateAndDelay', 'takeOff', 'autoLand', 'stopMotor', 'settle', 'wait', 'fw', 'bw', 'ml', 'mr', 'sh',
  'moveForward', 'moveBackward', 'moveLeft', 'moveRight', 'moveFastForward', 'moveFastBackward', 'moveFastLeft', 'moveFastRight',
  'setHeight', 'holdHeight', 'smoothSetHeight', 'posHold', 'setYaw',
]);
/** เมธอดของ class Arduino ใน protocol.hpp ที่ตัวจำลองรู้จัก */
export const PARDUINO_NAMES = new Set([
  'calibration', 'calibrateAndDelay', 'take_off', 'auto_land', 'stop_motor', 'set_height', 'set_heights', 'smooth_set_height', 'poshold', 'poshold_heights',
  'move_forward_cm', 'move_backward_cm', 'move_left_cm', 'move_right_cm', 'move_forward_fast', 'move_backward_fast', 'move_left_fast', 'move_right_fast', 'set_yaw',
]);
/** เขียนเปล่าๆ ได้ในทุกโหมด: ฟังก์ชัน Arduino และคำสั่งภารกิจของตัวจำลอง (บรรจุ/ปล่อย/แตะ/ยิง) */
export const BARE_OK = new Set(['delay', 'reload', 'turnByHand', 'drop', 'pop', 'shoot', 'shot_b']);

const canonOf = (n: string) => n.toLowerCase().replace(/_/g, '');

/** ตรวจว่าการเขียนคำสั่งนี้ถูกตามโหมด คืนข้อความผิดพลาด หรือ null ถ้าผ่าน */
export function styleError(style: Style, prefix: 'drone' | 'parduino' | null, name: string): string | null {
  if (style === 'any') return null;
  const want = style === 'drone' ? 'drone.' : 'pArduino->';
  const set = style === 'drone' ? DRONE_NAMES : PARDUINO_NAMES;
  const other = prefix && prefix !== style;
  if (other) return `โหมดนี้บังคับเขียนแบบ ${want}ชื่อ() ใช้ ${prefix === 'drone' ? 'drone.' : 'pArduino->'} ไม่ได้`;
  if (prefix === null) {
    if (BARE_OK.has(name)) return null;
    if (set.has(name)) return `ต้องเขียน ${want}${name}(...) ไม่ใช่ ${name}(...) เฉยๆ`;
    return `ต้องเขียน ${want}ชื่อ() และ ${name} ไม่ใช่ชื่อที่ถูกต้อง (ดูตารางเทียบชื่อที่ปุ่ม "คำสั่ง")`;
  }
  if (set.has(name)) return null;
  const near = [...set].find((n) => canonOf(n) === canonOf(name));
  return near ? `ไม่มี ${want}${name}() ลองใช้ ${want}${near}() (ตัวพิมพ์เล็กใหญ่ต้องตรง)` : `ไม่มี ${want}${name}() ในโหมดนี้ (ดูตารางเทียบชื่อที่ปุ่ม "คำสั่ง")`;
}

type Map1 = Record<string, string>;
// canon ของชื่อเดิม → ชื่อในโหมดปลายทาง (ชื่อที่ไม่อยู่ในตาราง เช่น reload/drop ปล่อยไว้ตามเดิม)
const TO_DRONE: Map1 = {
  calibration: 'calibration', calibrate: 'calibration', calibrateanddelay: 'calibrateAndDelay', takeoff: 'takeOff', autoland: 'autoLand', stopmotor: 'stopMotor',
  settle: 'settle', wait: 'wait', sh: 'sh', setheight: 'setHeight', setheights: 'setHeight', smoothsetheight: 'smoothSetHeight', holdheight: 'holdHeight', posholdheights: 'holdHeight',
  fw: 'fw', bw: 'bw', ml: 'ml', mr: 'mr', moveforwardcm: 'fw', movebackwardcm: 'bw', moveleftcm: 'ml', moverightcm: 'mr',
  moveforward: 'moveForward', movebackward: 'moveBackward', moveleft: 'moveLeft', moveright: 'moveRight',
  moveforwardfast: 'moveFastForward', movebackwardfast: 'moveFastBackward', moveleftfast: 'moveFastLeft', moverightfast: 'moveFastRight',
  movefastforward: 'moveFastForward', movefastbackward: 'moveFastBackward', movefastleft: 'moveFastLeft', movefastright: 'moveFastRight',
  poshold: 'posHold', hold: 'posHold', setyaw: 'setYaw',
};
const TO_PARDUINO: Map1 = {
  calibration: 'calibration', calibrate: 'calibration', calibrateanddelay: 'calibrateAndDelay', takeoff: 'take_off', autoland: 'auto_land', stopmotor: 'stop_motor',
  settle: 'delay', wait: 'delay', sh: 'set_height', setheight: 'set_height', setheights: 'set_heights', smoothsetheight: 'smooth_set_height', holdheight: 'poshold_heights', posholdheights: 'poshold_heights',
  fw: 'move_forward_cm', bw: 'move_backward_cm', ml: 'move_left_cm', mr: 'move_right_cm', moveforwardcm: 'move_forward_cm', movebackwardcm: 'move_backward_cm', moveleftcm: 'move_left_cm', moverightcm: 'move_right_cm',
  moveforward: 'move_forward_cm', movebackward: 'move_backward_cm', moveleft: 'move_left_cm', moveright: 'move_right_cm',
  moveforwardfast: 'move_forward_fast', movebackwardfast: 'move_backward_fast', moveleftfast: 'move_left_fast', moverightfast: 'move_right_fast',
  movefastforward: 'move_forward_fast', movefastbackward: 'move_backward_fast', movefastleft: 'move_left_fast', movefastright: 'move_right_fast',
  poshold: 'poshold', hold: 'poshold', setyaw: 'set_yaw',
};

/** แปลงโค้ดทั้งไฟล์ให้เป็นโหมดที่ต้องการ (ใช้ปุ่ม "แปลงโค้ดให้" และตอนแทรกคำสั่ง) */
export function convertStyle(code: string, style: Style): string {
  if (style === 'any') return code;
  const table = style === 'drone' ? TO_DRONE : TO_PARDUINO;
  const prefix = style === 'drone' ? 'drone.' : 'pArduino->';
  const re = /(?<![\w.>])(?:drone\s*\.\s*|pArduino\s*->\s*|pArduino\s*\.\s*)?([A-Za-z_]\w*)\s*\(([^()]*)\)/g;
  return code.split('\n').map((line) => {
    const ci = line.indexOf('//');
    const body = ci >= 0 ? line.slice(0, ci) : line, tail = ci >= 0 ? line.slice(ci) : '';
    const out = body.replace(re, (all, name: string, args: string) => {
      const c = canonOf(name);
      if (c === 'yaw' || c === 'turn') {
        const n = Number(args.trim());
        const [dir, deg] = Number.isFinite(n) && args.trim() !== '' ? [n < 0 ? 2 : 1, Math.abs(n)] : [1, args.trim() || '0'];
        return `${prefix}${style === 'drone' ? 'setYaw' : 'set_yaw'}(${dir}, ${deg})`;
      }
      if (c === 'delay') return all.replace(/^(?:drone\s*\.\s*|pArduino\s*->\s*)/, '');
      const to = table[c];
      if (to === 'delay') return `delay(${args})`;
      return to ? `${prefix}${to}(${args})` : all;
    });
    return out + tail;
  }).join('\n');
}
