import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { ALLOWED_DOMAIN, devPasswordLogin, googleConfigured } from '@/lib/school';
import { LoginForm } from './LoginForm';

/** ปลายทางหลังล็อกอิน: รับเฉพาะเส้นทางในเว็บ (กัน open redirect) */
const safeNext = (n?: string) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/learn');

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const q = await searchParams;
  const next = safeNext(q.next);
  if (await getSession()) redirect(next);
  return <LoginForm next={next} error={q.error} domain={ALLOWED_DOMAIN} googleReady={googleConfigured()} devPassword={devPasswordLogin()} />;
}
