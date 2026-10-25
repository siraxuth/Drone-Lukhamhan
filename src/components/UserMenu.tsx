'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogIn, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth-client';

const ROLE: Record<string, string> = { ADMIN: 'แอดมิน', TEACHER: 'ครู', MEMBER: 'สมาชิก' };
const btn = 'grid size-10 shrink-0 place-items-center squircle-xl border border-line bg-surface-2 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue';

/** ยังไม่ล็อกอิน = ปุ่มไอคอนไปหน้า login · ล็อกอินแล้ว = อวาตาร์ เปิดเมนูผู้ใช้ */
export function UserMenu() {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();

  if (isPending) return <span aria-hidden className={`${btn} animate-pulse`} />;

  if (!data) {
    return (
      <Link href="/login" aria-label="เข้าสู่ระบบ" title="เข้าสู่ระบบ" className={btn}>
        <LogIn className="size-5" aria-hidden />
      </Link>
    );
  }

  const u = data.user as { name?: string; email: string; image?: string | null; role?: string };
  const name = u.name?.trim() || u.email.split('@')[0];
  const role = u.role ?? 'MEMBER';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`เมนูผู้ใช้ ${name}`} className="grid size-10 shrink-0 place-items-center squircle-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">
        <Avatar className="size-10 squircle-xl after:hidden">
          {u.image && <AvatarImage src={u.image} alt="" className="squircle-xl" />}
          <AvatarFallback className="squircle-xl bg-foreground text-base font-bold text-background">{name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-72 squircle-2xl p-2">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="grid gap-0.5 px-3 py-2.5">
            <span className="truncate text-lg font-bold text-foreground">{name}</span>
            <span className="truncate text-base font-normal text-muted-foreground">{u.email}</span>
            <span className="mt-1.5 w-fit squircle-xl bg-muted px-2.5 py-0.5 text-sm font-medium text-foreground">{ROLE[role] ?? role}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/admin" />} className="min-h-11 squircle-xl px-3 text-base">
          <LayoutDashboard className="size-5" aria-hidden /> {role === 'MEMBER' ? 'บัญชีของฉัน' : 'จัดการเว็บไซต์'}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-11 squircle-xl px-3 text-base text-brand-red"
          onClick={async () => { await authClient.signOut(); router.refresh(); }}
        >
          <LogOut className="size-5" aria-hidden /> ออกจากระบบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** บัญชีผู้ใช้ในลิ้นชักเมนูมือถือ: ยังไม่ล็อกอิน = ปุ่มเข้าสู่ระบบ · ล็อกอินแล้ว = ชื่อ อีเมล บทบาท + ทางเข้าหลังบ้านกับปุ่มออกจากระบบ */
export function UserMenuMobile({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();
  const row = 'flex min-h-12 w-full items-center gap-3 squircle-xl px-4 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-blue';

  if (isPending) return <span aria-hidden className="block h-12 animate-pulse squircle-xl bg-surface-2" />;

  if (!data) {
    return (
      <Link href="/login" onClick={onNavigate} className={`${row} justify-center border border-line hover:bg-surface-2`}>
        <LogIn className="size-5" aria-hidden /> เข้าสู่ระบบ
      </Link>
    );
  }

  const u = data.user as { name?: string; email: string; image?: string | null; role?: string };
  const name = u.name?.trim() || u.email.split('@')[0];
  const role = u.role ?? 'MEMBER';

  return (
    <div className="grid gap-2 squircle-2xl border border-line bg-surface-2 p-3">
      <div className="flex items-center gap-3 px-1 py-1">
        <Avatar className="size-11 squircle-xl after:hidden">
          {u.image && <AvatarImage src={u.image} alt="" className="squircle-xl" />}
          <AvatarFallback className="squircle-xl bg-foreground text-base font-bold text-background">{name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold leading-tight">{name}</p>
          <p className="truncate text-sm text-muted-foreground">{u.email}</p>
          <p className="mt-1 w-fit squircle-xl bg-muted px-2 py-0.5 text-xs font-medium">{ROLE[role] ?? role}</p>
        </div>
      </div>
      <Link href="/admin" onClick={onNavigate} className={`${row} bg-surface hover:bg-muted`}>
        <LayoutDashboard className="size-5" aria-hidden /> {role === 'MEMBER' ? 'บัญชีของฉัน' : 'จัดการเว็บไซต์'}
      </Link>
      <button type="button" className={`${row} bg-surface text-brand-red hover:bg-muted`}
        onClick={async () => { await authClient.signOut(); onNavigate?.(); router.refresh(); }}>
        <LogOut className="size-5" aria-hidden /> ออกจากระบบ
      </button>
    </div>
  );
}
