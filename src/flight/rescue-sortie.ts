import { NEUTRAL_STICK, radioDynamics } from './radio-physics';

export type Landscape = 'river' | 'bridge' | 'forest' | 'village' | 'camp';
type StepKind = 'รับของ' | 'ส่งของ' | 'สำรวจ' | 'ผ่านจุด' | 'ลงจอด' | 'เก็บน้ำ';
export const keyActions = {
  2: 'รับสัมภาระ', 3: 'ส่งมอบสัมภาระ', 4: 'ถ่ายภาพสำรวจ', 5: 'ยืนยันจุดผ่าน',
  6: 'อ่านระดับน้ำ', 7: 'ตรวจสภาพจุดหมาย', 8: 'หย่อนขวด', 9: 'เก็บขวดขึ้น', 10: 'ส่งพิกัดให้ทีม',
} as const;
type MissionKey = keyof typeof keyActions;
function step(kind: StepKind, label: string, x: number, z: number, min: number, max: number, key: MissionKey | null) {
  return {kind,label,x,z,min,max,key};
}
const pick = (label:string,x:number,z:number) => step('รับของ',label,x,z,1.5,3,2);
const drop = (label:string,x:number,z:number) => step('ส่งของ',label,x,z,1.5,3,3);
const scan = (label:string,x:number,z:number,min:number,max:number,key:MissionKey=4) => step('สำรวจ',label,x,z,min,max,key);
const pass = (label:string,x:number,z:number) => step('ผ่านจุด',label,x,z,5,10,5);
const base = step('ลงจอด','กลับลงจอดที่ฐาน',0,0,0,1.2,null);
function mission(landscape: Landscape, title:string, ...steps: ReturnType<typeof step>[]) {return {landscape,title,steps:[...steps,base]};}
export const missions = [
  mission('river','ชุดปฐมพยาบาลริมฝั่ง',pick('รับชุดปฐมพยาบาล',30,-48),drop('ส่งให้เจ้าหน้าที่ริมฝั่ง',89,-65)),
  mission('river','ตามหาเรือหลงทาง',scan('มองหาเรือที่ปากคลอง',-40,-30,8,14),scan('ยืนยันตำแหน่งเรือที่โค้งน้ำ',-71,-62,4,8,10)),
  mission('forest','วิทยุให้ทีมหน้า',pick('รับวิทยุที่กองอำนวยการ',-14,-25),pass('บินผ่านแนวเสาสัญญาณ',12,-52),drop('ส่งวิทยุให้หัวหน้าทีม',58,-76)),
  mission('village','ตรวจทางเข้าโรงครัว',pass('บินตามแนวถนน',18,-39),scan('ตรวจทางเข้าจากมุมสูง',44,-68,10,16)),
  mission('camp','น้ำดื่มสำหรับจุดพัก',pick('รับน้ำดื่มที่คลัง',-28,-12),drop('ส่งน้ำให้ทีมจัดจุดพัก',-63,-49)),
  mission('river','เฝ้าระดับแม่น้ำ',scan('อ่านแนวน้ำที่ตลิ่งเหนือ',-38,-78,4,7,6),scan('สำรวจปลายน้ำ',-85,12,6,10,6),scan('มองภาพรวมสองฝั่ง',-42,25,16,24)),
  mission('river','เก็บตัวอย่างน้ำ',step('เก็บน้ำ','หย่อนขวดเก็บน้ำข้างทุ่นสีส้ม',-81,-34,1.5,2.5,8),drop('ส่งขวดให้เจ้าหน้าที่ห้องตรวจ',34,-103)),
  mission('bridge','ตรวจสะพานก่อนเปิดทาง',scan('ตรวจหัวสะพาน',30,-36,5,9,7),pass('บินตามแนวสะพาน',30,-58),scan('ตรวจทางออกอีกฝั่ง',30,-81,7,11,7)),
  mission('forest','แบตเตอรี่ผลัดดึก',pick('รับแบตเตอรี่สำรอง',26,9),pass('ผ่านจุดนัดพบ',66,-37),drop('ส่งแบตให้ทีมสื่อสาร',108,-90)),
  mission('village','หาเส้นทางอพยพ',scan('ตรวจจุดรวมพล',-25,-58,8,12),pass('ตามแนวถนนฝั่งตะวันออก',18,-81),scan('ตรวจลานปลายทาง',75,-108,12,18)),
  mission('camp','ขนของสองเที่ยว',pick('รับผ้าห่มที่คลัง',16,-26),drop('ส่งผ้าห่มให้ทีมที่พัก',42,-49),pick('รับไฟฉายที่จุดชาร์จ',68,-38),drop('ส่งไฟฉายให้ทีมค้นหา',-20,-78)),
  mission('forest','เปิดจุดพยาบาลสำรอง',scan('สำรวจลานตั้งเต็นท์',54,-82,12,16),pick('รับชุดตั้งเต็นท์',-30,-18),pass('บินผ่านจุดสังเกตกลางทาง',12,-48),drop('ส่งชุดให้ทีมแพทย์ที่ลาน',57,-86)),
  mission('forest','สำรวจสามระดับ',scan('ดูภาพรวมพื้นที่',48,-62,22,28),scan('ตรวจแนวลาดริมฝั่ง',31,-41,10,14),scan('ตรวจป้ายจุดนัดพบ',20,-25,3,5)),
  mission('river','ส่งแผนที่ให้ทีมเรือ',pick('รับแผนที่จากศูนย์',18,-17),scan('ยืนยันจุดจอดเรือ',-58,-24,9,13,10),drop('ส่งแผนที่ให้คนประจำท่า',-64,-29)),
  mission('village','ปิดงานกู้ภัย',pass('ตรวจทางเข้าศูนย์',32,-26),pick('รับบันทึกจากทีมภาคสนาม',72,-78),drop('ส่งบันทึกให้ฝ่ายประสานงาน',-32,-98),scan('ตรวจลานก่อนถอนกำลัง',-21,-40,10,15)),
];
export const LAND_HEIGHT = 1.2;
export const LAND_HOLD_MS = 600;
export function newFlight(missionIndex = 0) {
  return { contact: 0, missionIndex, stations: missions[missionIndex].steps, carrying: false, x: 0, z: 0, h: 0, yaw: 0, vx: 0, vz: 0, vh: 0, elapsed: 0, stage: 0, spin: 0,
    photos: [] as {label:string; image:string}[], pendingPhoto:'', report:'', bottleDown:false, transfer: 0, landingSince: 0, phase: 'ground' as 'ground'|'launch'|'flight'|'landing',
    stick: NEUTRAL_STICK, dynamics: radioDynamics() };
}
export type RescueFlight = ReturnType<typeof newFlight>;

export function approach(f: RescueFlight) {
  const stations=f.stations;
  const point = stations[Math.min(f.stage, stations.length - 1)];
  const dx = point.x - f.x, dz = point.z - f.z;
  const distance = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, -dz) * 180 / Math.PI - f.yaw;
  const turn = ((angle % 360 + 540) % 360) - 180;
  const steady = Math.hypot(f.vx, f.vz) * 5 < 0.7 && Math.abs(f.vh) * 3 < 0.45;
  return { distance, turn, steady, ready: distance <= 3 && f.h >= point.min && f.h <= point.max && (point.kind === 'ผ่านจุด' || steady) };
}

export function expectedKey(f: RescueFlight) {
  const step=f.stations[f.stage];
  return step?.kind==='เก็บน้ำ' && f.bottleDown ? 9 : step?.key ?? null;
}

export function useMissionKey(f: RescueFlight, key: number) {
  const step=f.stations[f.stage];
  const expected=expectedKey(f);
  if(f.phase!=='flight' || !step || !expected) return '';
  if(key!==expected) return `จุดนี้ใช้ K${expected} · ${keyActions[expected]}`;
  const {distance, steady}=approach(f);
  if(distance>3) return 'เข้าใกล้เครื่องหมายให้เหลือไม่เกิน 3 เมตร แล้วกดอีกครั้ง';
  if(f.h<step.min || f.h>step.max) return `ปรับความสูงให้อยู่ที่ ${step.min}–${step.max} ม. แล้วกดอีกครั้ง`;
  if(step.kind!=='ผ่านจุด' && !steady) return 'ผ่อนก้านให้โดรนหยุดเคลื่อน แล้วกดอีกครั้ง';
  if(expected===8){f.bottleDown=true;f.transfer=0;return 'กำลังหย่อนขวดลงน้ำ';}
  if(expected===9 && f.transfer<1.4) return 'รอขวดแตะน้ำ แล้วกด K9 ดึงขึ้น';
  if(expected===2 || expected===9) f.carrying=true;
  if(expected===3) f.carrying=false;
  if(expected===4) f.pendingPhoto=step.label;
  if(expected===10) f.report=`ส่งพิกัดให้ทีมแล้ว · X ${f.x.toFixed(1)} ม. / Z ${f.z.toFixed(1)} ม.`;
  f.stage++; f.bottleDown=false; f.transfer=0;
  return `✓ ${step.label}แล้ว`;
}
