import Link from 'next/link';
import { db } from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RowMenu } from '../client';
import { Notice, PageHead, StatusBadge } from '../ui';

export default async function SectionsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const rows = await db.section.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
  return (
    <>
      <PageHead title="หมวดเนื้อหา" desc="หมวดและข้อความที่จัดลำดับได้ (ตัวเลขน้อยขึ้นก่อน)" newHref="/admin/sections/new" newLabel="เพิ่มหมวด" />
      <Notice ok={ok} error={error} />
      <div className="hidden overflow-hidden squircle-3xl border border-line bg-surface md:block">
        <Table>
          <TableHeader><TableRow><TableHead className="w-20">ลำดับ</TableHead><TableHead>ชื่อหมวด</TableHead><TableHead>slug</TableHead><TableHead className="w-36">สถานะ</TableHead><TableHead className="w-16"><span className="sr-only">เมนู</span></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="text-base">{s.order}</TableCell>
                <TableCell className="whitespace-normal text-base"><Link href={`/admin/sections/${s.id}`} className="font-semibold hover:text-brand-blue hover:underline">{s.title}</Link></TableCell>
                <TableCell className="font-mono text-base text-muted-foreground">{s.slug}</TableCell>
                <TableCell><StatusBadge published={s.published} /></TableCell>
                <TableCell className="text-right"><RowMenu model="section" id={s.id} label={s.title} editHref={`/admin/sections/${s.id}`} published={s.published} /></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-lg text-muted-foreground">ยังไม่มีหมวดเนื้อหา</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <ul className="grid gap-3 md:hidden">
        {rows.map((s) => (
          <li key={s.id} className="flex items-start gap-3 squircle-3xl border border-line bg-surface p-4">
            <Link href={`/admin/sections/${s.id}`} className="min-w-0 flex-1">
              <span className="line-clamp-2 block text-lg font-bold leading-snug">{s.title}</span>
              <span className="mt-2 flex flex-wrap items-center gap-2 text-base text-muted-foreground">ลำดับ {s.order} · <span className="font-mono">{s.slug}</span> <StatusBadge published={s.published} /></span>
            </Link>
            <RowMenu model="section" id={s.id} label={s.title} editHref={`/admin/sections/${s.id}`} published={s.published} />
          </li>
        ))}
        {rows.length === 0 && <li className="squircle-3xl border border-line bg-surface p-8 text-center text-lg text-muted-foreground">ยังไม่มีหมวดเนื้อหา</li>}
      </ul>
    </>
  );
}
