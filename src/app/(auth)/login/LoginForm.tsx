'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, ShieldAlert } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Logo } from '@/components/brand/Logo';

const GoogleMark = () => (
  <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

/** คำอธิบายข้อผิดพลาดที่ Better Auth ส่งกลับมาใน ?error= */
function explain(code: string | undefined, domain: string) {
  if (!code) return null;
  if (/unable_to_create|forbidden|domain/i.test(code)) return `บัญชีนี้ใช้ไม่ได้ ระบบเปิดให้เฉพาะอีเมลโรงเรียน @${domain} เท่านั้น ลองเลือกบัญชี Google ของโรงเรียนอีกครั้ง`;
  if (/access_denied|cancel/i.test(code)) return 'ยกเลิกการเข้าสู่ระบบ ลองใหม่ได้ทุกเมื่อ';
  return 'เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง ถ้ายังไม่ได้แจ้งครูผู้ดูแลชมรม';
}

export function LoginForm({ next, error, domain, googleReady, devPassword }: { next: string; error?: string; domain: string; googleReady: boolean; devPassword: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(explain(error, domain) ?? '');

  async function google() {
    setBusy(true); setMsg('');
    const res = await authClient.signIn.social({ provider: 'google', callbackURL: next, errorCallbackURL: `/login?next=${encodeURIComponent(next)}` });
    if (res?.error) { setBusy(false); setMsg(res.error.message ?? 'เริ่มเข้าสู่ระบบไม่ได้'); }
  }

  // เฉพาะตอนพัฒนาในเครื่องที่ยังไม่ตั้ง Google
  async function devSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMsg('');
    const f = new FormData(e.currentTarget);
    const res = await authClient.signIn.email({ email: String(f.get('email')), password: String(f.get('password')) });
    setBusy(false);
    if (res.error) return setMsg(res.error.message ?? 'เกิดข้อผิดพลาด');
    router.push(next); router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-24">
      <div className="absolute inset-x-0 top-0 mx-auto max-w-6xl px-4 pt-4 sm:px-6"><Breadcrumbs items={[{ label: 'เข้าสู่ระบบ' }]} wrap={false} /></div>
      <section className="grid w-full max-w-md gap-6 squircle-2xl border border-line bg-surface p-6 sm:p-8" aria-labelledby="login-title">
        <div className="grid gap-3">
          <Logo />
          <h1 id="login-title" className="font-display text-3xl font-extrabold leading-tight tracking-tight">เข้าสู่ระบบ</h1>
          <p className="text-base leading-7 text-muted-foreground">ใช้บัญชี Google ของโรงเรียน <b className="text-foreground">@{domain}</b> เพื่อเรียนแบบทีละขั้น ทำภารกิจรายวัน และดูอันดับ</p>
        </div>

        {msg && <p role="alert" className="flex items-start gap-2 squircle-xl border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-sm text-brand-red"><ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{msg}</p>}

        {googleReady ? (
          <Button size="lg" variant="outline" className="h-12 gap-3 text-base" onClick={google} disabled={busy}>
            <GoogleMark /> {busy ? 'กำลังไป Google…' : `เข้าสู่ระบบด้วย Google @${domain}`}
          </Button>
        ) : (
          <p className="squircle-xl border border-line bg-surface-2 px-3 py-2 text-sm text-muted-foreground">ยังไม่ได้ตั้งค่า Google OAuth (ต้องมี <code className="font-mono">GOOGLE_CLIENT_ID</code> และ <code className="font-mono">GOOGLE_CLIENT_SECRET</code> ดูขั้นตอนใน DEPLOY.md)</p>
        )}

        {devPassword && (
          <form onSubmit={devSubmit} className="grid gap-3 border-t border-line pt-4">
            <p className="text-sm font-semibold">ทางเข้าสำหรับพัฒนา (เห็นเฉพาะในเครื่อง)</p>
            <div className="grid gap-2"><Label htmlFor="email">อีเมล</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
            <div className="grid gap-2"><Label htmlFor="password">รหัสผ่าน</Label><Input id="password" name="password" type="password" required /></div>
            <Button type="submit" variant="secondary" disabled={busy}>เข้าสู่ระบบ</Button>
          </form>
        )}

        <p className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"><GraduationCap className="mt-0.5 size-4 shrink-0" aria-hidden />ยังไม่อยากล็อกอิน? ลองเล่น <a href="/simulator" className="font-semibold text-brand-blue underline underline-offset-4">ตัวจำลองการบิน</a> ได้เลยโดยไม่ต้องใช้บัญชี</p>
      </section>
    </main>
  );
}
