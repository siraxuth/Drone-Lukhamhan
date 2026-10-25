export type Quality = 'off' | 'low' | 'high';

/**
 * เลือกระดับภาพตามเครื่อง ก่อนโหลด 3D
 * off  = ไม่มี WebGL / โหมดประหยัดเน็ต / RAM ≤ 2GB / CPU ≤ 2 คอร์ → ใช้ภาพนิ่ง
 * low  = มือถือ แท็บเล็ต หรือเครื่อง RAM ≤ 4GB / CPU ≤ 4 คอร์ → โมเดลเบา ไม่มีเงาสะท้อน ความละเอียดต่ำ
 * high = คอมทั่วไป
 */
export function detectQuality(): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  try {
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) return 'off';
  } catch { return 'off'; }
  const mem = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency ?? 8;
  const conn = nav.connection;
  if (conn?.saveData || conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g') return 'off';
  if (mem <= 2 || cores <= 2) return 'off';
  const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 768;
  if (coarse || mem <= 4 || cores <= 4) return 'low';
  return 'high';
}
