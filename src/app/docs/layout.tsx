import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { Logo } from '@/components/brand/Logo';
import { ScrollTop } from '@/components/docs/ScrollTop';
import { Tour } from '@/components/Tour';
import { docsTour } from '@/lib/tours';

/** บทเรียน 2 ชุดสลับกันที่หัว sidebar (ชุดหลังอยู่ใต้ /docs/lettering จึงเรียงไว้ท้ายเพื่อให้ชนะเมื่อพาธตรงทั้งคู่) */
const tabs = [
  { title: 'โดรนมิชชั่น', description: 'เขียนโค้ดสั่งโดรนบินภารกิจ', url: '/docs' },
  { title: 'โดรนแปรอักษร', description: 'ออกแบบโชว์โดรนด้วย Blender', url: '/docs/lettering' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DocsLayout tree={source.getPageTree()} nav={{ title: <Logo /> }} sidebar={{ tabs }}>
      <ScrollTop />
      <Tour id="docs" steps={docsTour} />
      {children}
    </DocsLayout>
  );
}
