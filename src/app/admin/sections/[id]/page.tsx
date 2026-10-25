import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RichEditor } from '@/components/RichEditor';
import { toHtml } from '@/lib/rich';
import { saveSection } from '../../actions';
import { Field, Notice, PageHead, Panel } from '../../ui';

export default async function SectionEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const s = id === 'new' ? null : await db.section.findUnique({ where: { id } });
  if (id !== 'new' && !s) notFound();
  return (
    <>
      <Link href="/admin/sections" className="inline-flex min-h-11 items-center gap-2 text-base text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" aria-hidden /> หมวดทั้งหมด</Link>
      <PageHead title={s ? 'แก้ไขหมวด' : 'เพิ่มหมวด'} />
      <Notice error={error} />
      <form action={saveSection.bind(null, id)} className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Panel>
          <Field id="title" label="ชื่อหมวด"><Input id="title" name="title" defaultValue={s?.title} required className="h-11 text-base" /></Field>
          <Field id="quote" label="คำคมประจำหมวด"><Input id="quote" name="quote" defaultValue={s?.quote ?? ''} className="h-11 text-base" /></Field>
          <Field label="เนื้อหา"><RichEditor name="body" initial={toHtml(s?.body ?? '')} minHeight="18rem" /></Field>
        </Panel>
        <div className="grid h-fit gap-6">
          <Panel>
            <Field id="slug" label="slug" hint="a-z 0-9 และ - เท่านั้น ใช้ในลิงก์"><Input id="slug" name="slug" defaultValue={s?.slug} required pattern="[a-z0-9-]+" className="h-11 font-mono text-base" /></Field>
            <Field id="order" label="ลำดับ"><Input id="order" name="order" type="number" defaultValue={s?.order ?? 0} className="h-11 text-base" /></Field>
            <label className="flex items-center justify-between gap-3 text-base">เผยแพร่ <Switch name="published" defaultChecked={s?.published ?? true} /></label>
          </Panel>
          <div className="flex gap-3">
            <Button type="submit" size="lg" className="h-12 flex-1 text-base">บันทึก</Button>
            <Button type="button" variant="outline" size="lg" className="h-12 text-base" render={<Link href="/admin/sections" />} nativeButton={false}>ยกเลิก</Button>
          </div>
        </div>
      </form>
    </>
  );
}
