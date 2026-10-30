'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Plane, Sparkles, X } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserMenu, UserMenuMobile } from '@/components/UserMenu';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import { ScrollProgress } from '@/components/ui/scroll-progress';

type Sub = { href: string; label: string; hint: string; icon: typeof Plane; on: (path: string) => boolean };
type NavLink = { href: string; label: string; spy?: 'how' | 'showcase'; children?: readonly Sub[] };

/** บทเรียนมี 2 ชุด: โดรนมิชชั่น (เขียนโค้ด Arduino) กับโดรนแปรอักษร (ออกแบบใน Blender) */
const lessonSets: readonly Sub[] = [
  { href: '/docs', label: 'โดรนมิชชั่น', hint: 'เขียนโค้ดสั่งโดรนบินภารกิจในสนามแข่ง', icon: Plane, on: (p) => p.startsWith('/docs') && !p.startsWith('/docs/lettering') },
  { href: '/docs/lettering', label: 'โดรนแปรอักษร', hint: 'ออกแบบโชว์โดรนเป็นตัวอักษรและรูปทรงด้วย Blender', icon: Sparkles, on: (p) => p.startsWith('/docs/lettering') },
];

/** คอร์สเรียน (/learn) แยกเป็นสายภารกิจกับสายแปรอักษร */
const courseSets: readonly Sub[] = [
  { href: '/learn', label: 'คอร์สโดรนมิชชั่น', hint: 'ฝึกเขียนโค้ด ความรู้โดรน และฟิสิกส์ พร้อมสะสม XP', icon: Plane, on: (p) => p.startsWith('/learn') && !p.startsWith('/learn/lettering') },
  { href: '/learn#t-lettering', label: 'คอร์สโดรนแปรอักษร', hint: 'เรียนออกแบบโชว์ใน Blender ทีละหน่วย มีแบบฝึกท้ายหน่วย', icon: Sparkles, on: (p) => p.startsWith('/learn/lettering') },
];

const links: readonly NavLink[] = [
  { href: '/#how', label: 'การทำงาน', spy: 'how' },
  { href: '/docs', label: 'บทเรียน', children: lessonSets },
  { href: '/learn', label: 'คอร์สเรียน', children: courseSets },
  { href: '/#showcase', label: 'ผลงานที่ผ่านมา', spy: 'showcase' },
  { href: '/simulator', label: 'ฝึกเขียนโค้ด' },
  { href: '/field', label: 'จำลองสนามแข่งขัน' },
];

/**
 * Navbar ลอย: เลื่อนลงแล้วหดเป็นแคปซูลเล็กพร้อมเงา · เมนูมีแถบไฮไลต์ที่ไหลตามเมาส์ · จุดสีฟ้าบอกหน้า/ส่วนที่อยู่
 * มือถือ: ปุ่มสามขีดเปิด Drawer (shadcn) จากขวา เมนูไล่ขึ้นทีละรายการ
 */
/** frame = หน้าแรก: navbar เป็นติ่ง (notch) ห้อยจากขอบบนลงมาเหมือนกล้องหน้า MacBook โคนติ่งโค้งเว้าเข้าหาเส้นกรอบ (Hud) */
export function Header({ frame = false }: { frame?: boolean } = {}) {
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

  const isActive = useCallback((l: NavLink) => (l.spy ? pathname === '/' && spy === l.spy : pathname.startsWith(l.href)), [pathname, spy]);

  const [menu, setMenu] = useState<string | null>(null);
  useEffect(() => { setMenu(null); }, [pathname]);
  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => { if (!(e.target as Element).closest('[data-menu]')) setMenu(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [menu]);

  const point = (el: HTMLElement) => setHl({ left: el.offsetLeft, width: el.offsetWidth });

  return (
    <header className={frame ? 'pointer-events-none fixed inset-x-0 top-0 z-[310]' : 'fixed inset-x-0 top-3 z-40 px-3'}>
      <nav
        data-tour="menu"
        data-scrolled={scrolled}
        aria-label="เมนูหลัก"
        className={frame
          ? 'pointer-events-auto relative mx-auto mt-0 flex h-14 sm:mt-2 w-[calc(100%-1rem)] items-center justify-between gap-3 border border-t-0 border-line bg-[var(--canvas)] px-4 squircle-b-notch sm:w-fit sm:min-w-[22rem] sm:max-w-[calc(100%-4rem)] lg:gap-8 lg:px-6'
          : `squircle-2xl relative mx-auto flex max-w-[84rem] items-center justify-between gap-3 border border-line bg-surface/90 px-4 py-2 backdrop-blur-md transition-[max-width,padding,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] data-[scrolled=true]:max-w-6xl data-[scrolled=true]:py-1.5 data-[scrolled=true]:bg-surface/95`}
      >
        {frame && (
          <>
            <span aria-hidden className="notch-fillet notch-fillet-l" />
            <span aria-hidden className="notch-fillet notch-fillet-r" />
          </>
        )}
        <Link href="/" aria-label="หน้าแรก" className="shrink-0 transition-transform hover:scale-[1.03]"><Logo /></Link>

        <ul ref={list} onMouseLeave={() => setHl(null)} className="relative hidden items-center lg:flex">
          <span
            aria-hidden
            className="absolute inset-y-0 my-auto h-9 squircle-xl bg-foreground/[0.07] transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ left: hl?.left ?? 0, width: hl?.width ?? 0, opacity: hl ? 1 : 0 }}
          />
          {links.map((l) => {
            const active = isActive(l);
            const tone = `relative flex min-h-11 items-center whitespace-nowrap squircle-xl px-3 text-base transition-colors hover:text-foreground xl:px-4 ${active ? 'bg-brand-blue/10 font-semibold text-brand-blue' : 'text-muted-foreground'}`;
            if (l.children) {
              return (
                <li key={l.href} data-menu className="relative" onMouseEnter={(e) => { point(e.currentTarget); setMenu(l.href); }} onMouseLeave={() => setMenu(null)} onFocus={(e) => point(e.currentTarget)}>
                  <button type="button" aria-haspopup="menu" aria-expanded={menu === l.href} onClick={() => setMenu(l.href)} className={`${tone} gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue`}>
                    {l.label}
                    <ChevronDown className={`size-4 transition-transform duration-200 ${menu === l.href ? 'rotate-180' : ''}`} aria-hidden />
                  </button>
                  {menu === l.href && (
                    <div role="menu" aria-label={l.label} className="absolute left-0 top-full z-50 w-[22rem] pt-2">
                      <ul className="grid gap-1 squircle-2xl border border-line bg-surface p-2 shadow-lg">
                        {l.children.map((c) => {
                          const on = c.on(pathname);
                          return (
                            <li key={c.href} role="none">
                              <Link role="menuitem" href={c.href} onClick={() => setMenu(null)} aria-current={on ? 'page' : undefined} className={`flex items-start gap-3 squircle-xl p-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand-blue ${on ? 'bg-brand-blue/10' : ''}`}>
                                <span className="mt-0.5 grid size-9 shrink-0 place-items-center squircle-xl bg-brand-blue/10 text-brand-blue"><c.icon className="size-5" aria-hidden /></span>
                                <span>
                                  <span className="block text-base font-semibold text-foreground">{c.label}</span>
                                  <span className="mt-0.5 block text-sm leading-6 text-muted-foreground">{c.hint}</span>
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </li>
              );
            }
            return (
              <li key={l.href} className="relative" onMouseEnter={(e) => point(e.currentTarget)} onFocus={(e) => point(e.currentTarget)}>
                <Link href={l.href} aria-current={active ? 'page' : undefined} className={tone}>
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden lg:block"><UserMenu /></div>
          <Button size="sm" className="group/cta hidden h-10.5 px-4 text-base sm:inline-flex lg:hidden xl:inline-flex squircle-3xl" render={<Link href="/docs" />} nativeButton={false}>
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
          <div className="flex h-full flex-col overflow-y-auto overscroll-contain p-5">
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
                  const row = 'flex min-h-14 w-full items-center justify-between squircle-2xl px-4 font-display text-2xl font-bold transition-colors hover:bg-surface-2';
                  if (l.children) {
                    return (
                      <li key={l.href} className="drawer-item" style={{ animationDelay: `${120 + i * 55}ms` }}>
                        <Accordion defaultValue={active ? ['lessons'] : []}>
                          <AccordionItem value="lessons" className="border-0">
                            <AccordionTrigger className={`${row} items-center py-0 text-left hover:no-underline ${active ? 'bg-surface-2 text-brand-blue' : ''}`}>
                              {l.label}
                            </AccordionTrigger>
                            <AccordionContent className="pb-1 [&_a]:no-underline">
                              <ul className="grid gap-1 pl-3 pt-1">
                                {l.children.map((c) => (
                                  <li key={c.href}>
                                    <Link href={c.href} onClick={() => setOpen(false)} className="flex items-center gap-3 squircle-2xl px-3 py-3 transition-colors hover:bg-surface-2">
                                      <span className="grid size-10 shrink-0 place-items-center squircle-xl bg-brand-blue/10 text-brand-blue"><c.icon className="size-5" aria-hidden /></span>
                                      <span>
                                        <span className="block text-lg font-semibold">{c.label}</span>
                                        <span className="block text-sm leading-6 text-muted-foreground">{c.hint}</span>
                                      </span>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </li>
                    );
                  }
                  return (
                    <li key={l.href} className="drawer-item" style={{ animationDelay: `${120 + i * 55}ms` }}>
                      <Link href={l.href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined}
                        className={`${row} ${active ? 'bg-surface-2 text-brand-blue' : ''}`}>
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
