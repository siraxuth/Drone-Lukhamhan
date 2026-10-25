import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth';
import { AdminSidebar } from './AdminSidebar';
import { AdminCrumbs } from './AdminCrumbs';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const metadata: Metadata = { title: 'จัดการเว็บไซต์', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const role = ((session.user as { role?: string }).role ?? 'MEMBER') as 'ADMIN' | 'TEACHER' | 'MEMBER';

  if (role === 'MEMBER') {
    return (
      <>
      <Breadcrumbs items={[{ label: 'จัดการเว็บไซต์' }]} />
      <main className="mx-auto grid min-h-[70dvh] max-w-md place-content-center gap-3 px-4 text-center">
        <h1 className="font-display text-3xl font-extrabold">ยังไม่มีสิทธิ์จัดการเนื้อหา</h1>
        <p className="text-lg text-muted-foreground">บัญชี {session.user.email} เป็นสมาชิกทั่วไป ให้แอดมินเปลี่ยนสิทธิ์เป็นครูหรือแอดมินก่อน</p>
        <Button size="lg" className="mx-auto h-12 text-base" render={<Link href="/" />} nativeButton={false}>กลับหน้าแรก</Button>
      </main>
      </>
    );
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AdminSidebar user={{ name: session.user.name, email: session.user.email }} role={role} />
      <SidebarInset className="h-svh min-h-0 min-w-0 overflow-hidden border border-line md:h-[calc(100svh-1rem)] md:peer-data-[variant=inset]:rounded-3xl md:peer-data-[variant=inset]:shadow-none [corner-shape:squircle]">
        <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-background/90 px-4 backdrop-blur">
          <SidebarTrigger aria-label="เปิด/ปิดเมนูด้านข้าง" className="size-10" />
          <Separator orientation="vertical" className="h-full" />
          <div className="min-w-0 flex-1 overflow-hidden"><AdminCrumbs /></div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" className="h-10 text-base" render={<Link href="/" target="_blank" />} nativeButton={false}>ดูเว็บไซต์</Button>
            <ThemeToggle />
          </div>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="grid min-w-0 gap-6 p-4 pb-24 sm:p-8 [&>*]:min-w-0">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
