import Link from 'next/link';
import { Home } from 'lucide-react';
import { abs } from '@/lib/site';
import { BreadcrumbScroll } from './BreadcrumbScroll';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

export type Crumb = { label: string; href?: string };

/**
 * เส้นทางหน้า (breadcrumb) ใช้ทุกหน้า: "หน้าแรก" ขึ้นต้นเสมอ รายการสุดท้ายคือหน้าปัจจุบัน
 * เรนเดอร์เป็น JSON-LD (BreadcrumbList) ด้วยเพื่อให้เครื่องมือค้นหาเข้าใจโครงสร้างเว็บ
 */
export function Breadcrumbs({ items, className = '', wrap = true }: { items: Crumb[]; className?: string; wrap?: boolean }) {
  const all: Crumb[] = [{ label: 'หน้าแรก', href: '/' }, ...items];
  const nav = (
    <Breadcrumb className={className}>
      <BreadcrumbScroll>
      <BreadcrumbList className="w-max flex-nowrap gap-1.5 text-base sm:w-auto sm:flex-wrap sm:gap-2.5">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <span key={`${c.label}-${i}`} className="contents">
              <BreadcrumbItem className="shrink-0 sm:min-w-0 sm:max-w-[28rem]">
                {last || !c.href ? (
                  <BreadcrumbPage className={`whitespace-nowrap sm:truncate ${last ? 'font-semibold' : ''}`}>{c.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={c.href!} />} className="inline-flex min-h-11 items-center gap-1.5 rounded-md">
                    {i === 0 && <Home className="size-4" aria-hidden />}
                    <span className="whitespace-nowrap sm:truncate">{c.label}</span>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!last && <BreadcrumbSeparator />}
            </span>
          );
        })}
      </BreadcrumbList>
      </BreadcrumbScroll>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: all.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, ...(c.href ? { item: abs(c.href) } : {}) })),
          }).replace(/</g, '\\u003c'),
        }}
      />
    </Breadcrumb>
  );
  return wrap ? <div className="mx-auto max-w-[84rem] px-4 pt-24 sm:px-6 xl:px-10">{nav}</div> : nav;
}
