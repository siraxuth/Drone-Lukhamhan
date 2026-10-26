import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { headers } from 'next/headers';
import { db } from './db';
import { ALLOWED_DOMAIN, devPasswordLogin, googleConfigured, isAdminEmail, isAllowedEmail } from './school';

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: 'postgresql' }),
  // เข้าสู่ระบบด้วย Google ของโรงเรียนเท่านั้น (รหัสผ่านใช้ได้เฉพาะตอนพัฒนาในเครื่องที่ยังไม่ตั้ง Google)
  emailAndPassword: { enabled: devPasswordLogin() },
  socialProviders: googleConfigured()
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          // hd = ให้ Google แสดงเฉพาะบัญชีของโดเมนโรงเรียน (เป็นแค่ตัวช่วย การบังคับจริงอยู่ที่ hook ด้านล่าง)
          hd: ALLOWED_DOMAIN,
          prompt: 'select_account',
        },
      }
    : {},
  // แอดมินเดิมที่เคยสมัครด้วยรหัสผ่าน เข้าด้วย Google อีเมลเดียวกันแล้วได้บัญชีเดิม
  account: { accountLinking: { enabled: true, trustedProviders: ['google'] } },
  session: {
    // อยู่ในระบบยาว 30 วัน และต่ออายุอัตโนมัติทุกครั้งที่ใช้งาน (ถ้าเข้าอย่างน้อยเดือนละครั้งก็ไม่ต้องล็อกอินใหม่)
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // เก็บสำเนา session ในคุกกี้สั้นๆ เพื่อลดการถามฐานข้อมูลทุกหน้า
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  // dev: พอร์ตอาจเปลี่ยนเมื่อ 3000 ถูกใช้อยู่
  // production: โดเมนจริง + ลิงก์ preview ของ Vercel (VERCEL_URL, VERCEL_BRANCH_URL) · dev: localhost
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
    ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:3001']),
  ].filter((o): o is string => !!o),
  user: {
    additionalFields: {
      // ไม่ให้ผู้ใช้ตั้ง role เอง — admin เปลี่ยนในหน้า /admin
      role: { type: 'string', defaultValue: 'MEMBER', input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // บังคับโดเมนโรงเรียน (ยกเว้น ADMIN_EMAILS) · อีเมลใน ADMIN_EMAILS สมัครแล้วเป็น ADMIN ทันที คนอื่นเป็น MEMBER
        before: async (user) => {
          if (!isAllowedEmail(user.email)) throw new APIError('FORBIDDEN', { message: `ใช้ได้เฉพาะอีเมล @${ALLOWED_DOMAIN}` });
          if (googleConfigured() && !user.emailVerified) throw new APIError('FORBIDDEN', { message: 'อีเมลนี้ Google ยังไม่ยืนยัน' });
          return { data: { ...user, role: isAdminEmail(user.email) ? 'ADMIN' : 'MEMBER' } };
        },
      },
    },
    session: {
      create: {
        // กันบัญชีเก่านอกโดเมน (เช่น gmail ที่เคยสมัครไว้) ไม่ให้ล็อกอินเข้ามาได้อีก
        before: async (session) => {
          const u = await db.user.findUnique({ where: { id: session.userId }, select: { email: true } });
          if (!u || !isAllowedEmail(u.email)) throw new APIError('FORBIDDEN', { message: `ใช้ได้เฉพาะอีเมล @${ALLOWED_DOMAIN}` });
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** ใช้ใน server component / action ของ /admin */
export async function requireRole(...roles: Array<'ADMIN' | 'TEACHER' | 'MEMBER'>) {
  const session = await getSession();
  if (!session) return null;
  const role = (session.user as { role?: string }).role;
  return roles.includes(role as 'ADMIN') ? session : null;
}

/** ใช้ในหน้า /learn และ API ของผู้เรียน: ต้องล็อกอิน (ทุกบทบาท) */
export async function requireUser() {
  return getSession();
}
