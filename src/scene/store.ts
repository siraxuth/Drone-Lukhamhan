/** สถานะที่แชร์ระหว่าง scroll → 3D → HUD (mutable, ไม่ผ่าน React state เพื่อไม่ให้ re-render ทุกเฟรม) */
export const sceneState = {
  active: 'hero',
  local: 0, // 0..1 ภายใน section ที่กำลังอ่าน
  velocity: 0, // ความเร็ว scroll ดิบจาก Lenis (px/วินาที)
  smoothVelocity: 0, // ความเร็วที่หน่วงแล้ว ใช้กับภาพ
  telemetry: { alt: 0, roll: 0, pitch: 0, yaw: 0, rpm: 0 },
};
