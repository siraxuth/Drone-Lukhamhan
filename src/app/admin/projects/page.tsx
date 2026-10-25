import Link from 'next/link';
import { Search } from 'lucide-react';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RowMenu } from '../client';
import { Notice, PageHead, StatusBadge } from '../ui';

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ q?: string; ok?: string; error?: string }> }) {
  const { q = '', ok, error } = await searchParams;
  const rows = await db.project.findMany({
    where: q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : undefined,
    orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  });
  return (
    <>
      <PageHead title="ผลงาน" desc="ผลงานที่ผ่านมาของชมรม แสดงที่หน้าแรกและหน้า /works" newHref="/admin/projects/new" newLabel="เพิ่มผลงาน" />
      <Notice ok={ok} error={error} />
      <form className="flex gap-2" role="search">
        <Input name="q" defaultValue={q} placeholder="ค้นหาชื่อหรือรายละเอียด" aria-label="ค้นหาผลงาน" className="h-11 max-w-sm text-base" />
        <Button type="submit" variant="outline" className="h-11 text-base"><Search className="size-4" aria-hidden /> ค้นหา</Button>
      </form>
      {/* จอใหญ่: ตาราง · มือถือ: การ์ด */}
      <div className="hidden overflow-hidden squircle-3xl border border-line bg-surface md:block">
        <Table>
          <TableHeader><TableRow><TableHead className="w-20">ปี</TableHead><TableHead>ชื่อผลงาน</TableHead><TableHead className="w-36">สถานะ</TableHead><TableHead className="w-16"><span className="sr-only">เมนู</span></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-base">{p.year}</TableCell>
                <TableCell className="whitespace-normal text-base"><Link href={`/admin/projects/${p.id}`} className="font-semibold hover:text-brand-blue hover:underline">{p.title}</Link></TableCell>
                <TableCell><StatusBadge published={p.published} /></TableCell>
                <TableCell className="text-right"><RowMenu model="project" id={p.id} label={p.title} editHref={`/admin/projects/${p.id}`} viewHref={`/works/${p.id}`} published={p.published} /></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-lg text-muted-foreground">{q ? 'ไม่พบผลงานที่ค้นหา' : 'ยังไม่มีผลงาน'}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <ul className="grid gap-3 md:hidden">
        {rows.map((p) => (
          <li key={p.id} className="flex items-start gap-3 squircle-3xl border border-line bg-surface p-4">
            <Link href={`/admin/projects/${p.id}`} className="min-w-0 flex-1">
              <span className="line-clamp-2 block text-lg font-bold leading-snug">{p.title}</span>
              <span className="mt-2 flex flex-wrap items-center gap-2 text-base text-muted-foreground">ปี {p.year} <StatusBadge published={p.published} /></span>
            </Link>
            <RowMenu model="project" id={p.id} label={p.title} editHref={`/admin/projects/${p.id}`} viewHref={`/works/${p.id}`} published={p.published} />
          </li>
        ))}
        {rows.length === 0 && <li className="squircle-3xl border border-line bg-surface p-8 text-center text-lg text-muted-foreground">{q ? 'ไม่พบผลงานที่ค้นหา' : 'ยังไม่มีผลงาน'}</li>}
      </ul>
    </>
  );
}
