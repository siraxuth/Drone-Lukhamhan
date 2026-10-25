'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserMenu, UserMenuMobile } from '@/components/UserMenu';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import { ScrollProgress } from '@/components/ui/scroll-progress';

const links = [
  { href: '/#how', label: 'โดรนบินยังไง', spy: 'how' },
  { href: '/#showcase', label: 'ผลงาน', spy: 'showcase' },
  { href: '/simulator', label: 'ลองบินจำลอง' },
  { href: '/field', label: 'สนาม' },
  { href: '/docs', label: 'บทเรียน' },
] as const;

/**
 * Navbar ลอย: เลื่อนลงแล้วหดเป็นแคปซูลเล็กพร้อมเงา · เมนูมีแถบไฮไลต์ที่ไหลตามเมาส์ · จุดสีฟ้าบอกหน้า/ส่วนที่อยู่
 * มือถือ: ปุ่มสามขีดเปิด Drawer (shadcn) จากขวา เมนูไล่ขึ้นทีละรายการ
 */
export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [spy, setSpy] = useState<'how' | 'showcase' | null>(null);
  const [hl, setHl] = useState<{ left: number; width: number } | null>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrolled(scrollY > 24);
      if (location.pathname !== '/') return setSpy(null);
      const sc = document.getElementById('showcase');
      if (sc && sc.getBoundingClientRect().top < innerHeight * 0.5) setSpy('showcase');
      else setSpy(scrollY > innerHeight * 0.4 ? 'how' : null);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', on, { passive: true });
    return () => { removeEventListener('scroll', on); cancelAnimationFrame(raf); };
  }, [pathname]);

  const isActive = useCallback((l: (typeof links)[number]) => ('spy' in l ? pathname === '/' && spy === l.spy : pathname.startsWith(l.href)), [pathname, spy]);

  const point = (el: HTMLElement) => setHl({ left: el.offsetLeft, width: el.offsetWidth });

  return (
    <header className="fixed inset-x-0 top-3 z-40 px-3">
      <nav
        data-tour="menu"
        data-scrolled={scrolled}
        aria-label="เมนูหลัก"
        className="squircle-2xl relative mx-auto flex max-w-[84rem] items-center justify-between gap-3 border border-line bg-surface/90 px-4 py-2 backdrop-blur-md transition-[max-width,padding,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] data-[scrolled=true]:max-w-6xl data-[scrolled=true]:py-1.5 data-[scrolled=true]:bg-surface/95 "
      >
        <Link href="/" aria-label="หน้าแรก" className="shrink-0 transition-transform hover:scale-[1.03]"><Logo /></Link>

        <ul ref={list} onMouseLeave={() => setHl(null)} className="relative hidden items-center lg:flex">
          <span
            aria-hidden
            className="absolute inset-y-0 my-auto h-9 squircle-xl bg-foreground/[0.07] transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ left: hl?.left ?? 0, width: hl?.width ?? 0, opacity: hl ? 1 : 0 }}
          />
          {links.map((l) => {
            const active = isActive(l);
            return (
              <li key={l.href} className="relative" onMouseEnter={(e) => point(e.currentTarget)} onFocus={(e) => point(e.currentTarget)}>
                <Link href={l.href} aria-current={active ? 'page' : undefined} className={`relative flex min-h-11 items-center whitespace-nowrap px-3 text-base xl:px-4 transition-colors hover:text-foreground ${active ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                  {l.label}
                  <span aria-hidden className={`absolute bottom-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-brand-blue transition-all duration-300 ${active ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden lg:block"><UserMenu /></div>
          <Button size="sm" className="group/cta hidden h-10 px-4 text-base sm:inline-flex squircle-2xl" render={<Link href="/docs" />} nativeButton={false}>
            เริ่มเรียน <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-0.5" aria-hidden />
          </Button>
          <button
            type="button"
            aria-label="เปิดเมนู"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="group/burger grid size-11 place-items-center squircle-xl border border-line bg-surface-2 lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            <span className="flex w-5 flex-col items-end gap-[5px]" aria-hidden>
              <span className="h-0.5 w-5 rounded-full bg-foreground transition-all group-hover/burger:w-3" />
              <span className="h-0.5 w-3.5 rounded-full bg-foreground transition-all group-hover/burger:w-5" />
              <span className="h-0.5 w-5 rounded-full bg-foreground transition-all group-hover/burger:w-2.5" />
            </span>
          </button>
        </div>
      </nav>
      <ScrollProgress className="top-0 z-50 h-[3px] bg-none bg-brand-blue" />

      <Drawer open={open} onOpenChange={setOpen} swipeDirection="right">
        <DrawerContent className="h-dvh w-[min(22rem,88vw)] [corner-shape:squircle] !rounded-l-3xl bg-surface">
          <div className="flex h-full flex-col p-5">
            <div className="flex items-center justify-between">
              <Logo />
              <DrawerClose render={<button type="button" aria-label="ปิดเมนู" className="grid size-11 place-items-center squircle-xl border border-line bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand-blue" />}>
                <X className="size-5" aria-hidden />
              </DrawerClose>
            </div>
            <DrawerTitle className="sr-only">เมนู</DrawerTitle>
            <DrawerDescription className="sr-only">ไปยังส่วนต่างๆ ของเว็บไซต์ชมรมโดรน</DrawerDescription>

            <nav aria-label="เมนูมือถือ" className="mt-8 flex-1">
              <ul className="grid gap-1">
                {links.map((l, i) => {
                  const active = isActive(l);
                  return (
                    <li key={l.href} className="drawer-item" style={{ animationDelay: `${120 + i * 55}ms` }}>
                      <Link href={l.href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined}
                        className={`flex min-h-14 items-center justify-between squircle-2xl px-4 font-display text-2xl font-bold transition-colors hover:bg-surface-2 ${active ? 'bg-surface-2 text-brand-blue' : ''}`}>
                        {l.label}
                        <ArrowRight className="size-5 text-muted-foreground" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="drawer-item grid gap-3" style={{ animationDelay: `${120 + links.length * 55}ms` }}>
              <Button size="lg" className="h-12 text-base" render={<Link href="/docs" onClick={() => setOpen(false)} />} nativeButton={false}>เริ่มเรียน</Button>
              <UserMenuMobile onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </header>
  );
}
