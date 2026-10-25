import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { headers } from 'next/headers';
import { db } from './db';

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
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
        // อีเมลใน ADMIN_EMAILS (คั่นด้วย ,) สมัครแล้วเป็น ADMIN ทันที คนอื่นเป็น MEMBER
        before: async (user) => {
          const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
          return { data: { ...user, role: admins.includes(user.email.toLowerCase()) ? 'ADMIN' : 'MEMBER' } };
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
