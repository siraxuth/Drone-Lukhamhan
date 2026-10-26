'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, CalendarCheck, Flag, FolderKanban, Gauge, Images, LayoutList, LogOut, Puzzle, Users } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar } from '@/components/ui/sidebar';
import { authClient } from '@/lib/auth-client';

const groups = [
  { label: 'ภาพรวม', items: [{ href: '/admin', label: 'แดชบอร์ด', icon: Gauge }] },
  {
    label: 'เนื้อหา',
    items: [
      { href: '/admin/projects', label: 'ผลงาน', icon: FolderKanban },
      { href: '/admin/seasons', label: 'ฤดูกาล / กติกา', icon: Flag },
      { href: '/admin/challenges', label: 'โจทย์ฝึกตัวจำลอง', icon: Puzzle },
      { href: '/admin/daily', label: 'ภารกิจรายวัน', icon: CalendarCheck },
      { href: '/admin/sections', label: 'หมวดเนื้อหา', icon: LayoutList },
      { href: '/admin/media', label: 'คลังรูป', icon: Images },
    ],
  },
  { label: 'ระบบ', items: [{ href: '/admin/users', label: 'สมาชิกและสิทธิ์', icon: Users, adminOnly: true }] },
] as const;

const roleTh = { ADMIN: 'แอดมิน', TEACHER: 'ครู', MEMBER: 'สมาชิก' } as const;

export function AdminSidebar({ user, role }: { user: { name: string; email: string }; role: keyof typeof roleTh }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const active = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="p-3"><Link href="/" aria-label="กลับหน้าแรก" className="flex items-center overflow-hidden group-data-[collapsible=icon]:justify-center [&_span:not(:first-child)]:group-data-[collapsible=icon]:hidden"><Logo /></Link></SidebarHeader>
      <SidebarContent>
        {groups.map((g) => {
          const items = g.items.filter((i) => !('adminOnly' in i) || role === 'ADMIN');
          if (!items.length) return null;
          return (
            <SidebarGroup key={g.label}>
              <SidebarGroupLabel className="text-sm">{g.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((i) => (
                    <SidebarMenuItem key={i.href}>
                      <SidebarMenuButton size="lg" tooltip={i.label} isActive={active(i.href)} render={<Link href={i.href} onClick={() => setOpenMobile(false)} />} className="text-base group-data-[collapsible=icon]:justify-center">
                        <i.icon className="size-5 shrink-0" aria-hidden /> <span className="group-data-[collapsible=icon]:hidden">{i.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm">ลัด</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" tooltip="บทเรียน (docs)" render={<Link href="/docs" target="_blank" />} className="text-base group-data-[collapsible=icon]:justify-center"><BookOpen className="size-5 shrink-0" aria-hidden /> <span className="group-data-[collapsible=icon]:hidden">บทเรียน (docs)</span></SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="grid gap-0.5 px-1 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-base font-semibold">{user.name}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email} · {roleTh[role]}</p>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="ออกจากระบบ" className="text-base group-data-[collapsible=icon]:justify-center" onClick={async () => { await authClient.signOut(); router.push('/login'); router.refresh(); }}>
              <LogOut className="size-5 shrink-0" aria-hidden /> <span className="group-data-[collapsible=icon]:hidden">ออกจากระบบ</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
