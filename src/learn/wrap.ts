/** ห่อบล็อกที่ผู้เรียนเรียงไว้เป็นโปรแกรมเต็ม (ใช้ทั้งฝั่งเซิร์ฟเวอร์ตัดสินและไคลเอนต์แสดงผล) */
export const wrapSetup = (lines: string[]) => `void setup() {\n${lines.map((l) => `  ${l}`).join('\n')}\n}\n\nvoid loop() {\n}\n`;
