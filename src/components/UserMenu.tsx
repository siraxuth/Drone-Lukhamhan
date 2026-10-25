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
