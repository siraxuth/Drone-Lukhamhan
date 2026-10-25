/**
 * รายชื่อผู้จัดทำที่โชว์ในหน้า /team · เพิ่มคนได้ที่นี่ที่เดียว (ไม่ใส่ = ไม่แสดงส่วนรายชื่อ)
 * ตัวอย่าง: { name: 'ชื่อ นามสกุล', role: 'เขียนโค้ดตัวจำลอง', note: 'ม.5 · ชมรมโดรน' }
 */
export type Member = { name: string; role: string; note?: string; photo?: string };
export const members: Member[] = [];
