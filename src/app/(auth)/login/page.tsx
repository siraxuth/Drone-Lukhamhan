'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Logo } from '@/components/brand/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email'));
    const password = String(f.get('password'));
    const res =
      mode === 'in'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: String(f.get('name')) });
    setBusy(false);
    if (res.error) return setError(res.error.message ?? 'เกิดข้อผิดพลาด');
    router.push('/admin');
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="absolute inset-x-0 top-0 mx-auto max-w-6xl px-4 pt-4 sm:px-6"><Breadcrumbs items={[{ label: 'เข้าสู่ระบบ' }]} wrap={false} /></div>
      <Card className="w-full max-w-sm squircle-2xl">
        <CardHeader>
          <Logo />
          <CardTitle className="pt-2">{mode === 'in' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</CardTitle>
          <CardDescription>สำหรับครูและสมาชิกชมรมที่ต้องการจัดการเนื้อหา</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            {mode === 'up' && (
              <div className="grid gap-2">
                <Label htmlFor="name">ชื่อ</Label>
                <Input id="name" name="name" required />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            {error && <p role="alert" className="text-sm text-brand-red">{error}</p>}
            <Button type="submit" disabled={busy}>{mode === 'in' ? 'เข้าสู่ระบบ' : 'สมัคร'}</Button>
            <button type="button" className="text-sm text-muted-foreground underline" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
              {mode === 'in' ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
