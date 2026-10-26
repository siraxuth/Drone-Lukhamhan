/** โดเมนอีเมลโรงเรียนที่อนุญาตให้ใช้ระบบ (ตั้งค่าได้ด้วย ALLOWED_EMAIL_DOMAIN) */
export const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN ?? 'lukhamhan.ac.th').trim().toLowerCase().replace(/^@/, '');

const adminEmails = () => (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

export const isAdminEmail = (email: string) => adminEmails().includes(email.trim().toLowerCase());

/** อีเมลโรงเรียน (@lukhamhan.ac.th) หรืออีเมลใน ADMIN_EMAILS เท่านั้น */
export function isAllowedEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return e.endsWith(`@${ALLOWED_DOMAIN}`) || isAdminEmail(e);
}

/** ตั้ง Google OAuth ครบหรือยัง (ถ้ายังไม่ครบ หน้า login จะบอกให้ตั้งค่า) */
export const googleConfigured = () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

/**
 * ทางเข้าด้วยรหัสผ่าน ใช้ได้เฉพาะตอนพัฒนาในเครื่อง ที่ยังไม่ได้ตั้ง Google (production ปิดเสมอ)
 * ช่วยให้ทดสอบหลังบ้านได้โดยไม่ต้องมี OAuth client
 */
export const devPasswordLogin = () => process.env.NODE_ENV !== 'production' && !googleConfigured();
