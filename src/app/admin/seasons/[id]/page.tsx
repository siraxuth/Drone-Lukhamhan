import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { saveSeason } from '../../actions';
import { ImagePicker, RulesEditor } from '../../client';
import { Field, Notice, PageHead, Panel } from '../../ui';

export default async function SeasonEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const s = id === 'new' ? null : await db.season.findUnique({ where: { id } });
  if (id !== 'new' && !s) notFound();
  const rules = (Array.isArray(s?.rules) ? s.rules : []) as Array<{ heading: string; body: string }>;
  return (
    <>
      <Link href="/admin/seasons" className="inline-flex min-h-11 items-center gap-2 text-base text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" aria-hidden /> ฤดูกาลทั้งหมด</Link>
      <PageHead title={s ? 'แก้ไขฤดูกาล' : 'เพิ่มฤดูกาล'} />
      <Notice error={error} />
      <form action={saveSeason.bind(null, id)} className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Panel>
          <Field id="title" label="ชื่อ"><Input id="title" name="title" defaultValue={s?.title} required placeholder="เช่น กติกา RCSA ปี ๒๕๖๙" className="h-11 text-base" /></Field>
          <Field id="summary" label="สรุปสั้นๆ"><Textarea id="summary" name="summary" defaultValue={s?.summary ?? ''} rows={3} className="text-base" /></Field>
          <Field label="ข้อกติกา" hint="เพิ่มทีละข้อ มีหัวข้อและรายละเอียด"><RulesEditor name="rules" initial={rules} /></Field>
          <Field id="videoUrls" label="ลิงก์วิดีโออ้างอิง" hint="ลิงก์ละหนึ่งบรรทัด"><Textarea id="videoUrls" name="videoUrls" defaultValue={s?.videoUrls.join('\n')} rows={3} className="text-base" /></Field>
        </Panel>
        <div className="grid h-fit gap-6">
          <Panel>
            <Field id="year" label="ปี (ค.ศ.)" hint="ซ้ำกับปีที่มีอยู่ไม่ได้"><Input id="year" name="year" type="number" defaultValue={s?.year ?? new Date().getFullYear()} required className="h-11 text-base" /></Field>
            <Field label="ภาพสนาม"><ImagePicker name="fieldImage" folder="seasons" initial={s?.fieldImage} /></Field>
            <label className="flex items-center justify-between gap-3 text-base">เผยแพร่ <Switch name="published" defaultChecked={s?.published ?? false} /></label>
          </Panel>
          <div className="flex gap-3">
            <Button type="submit" size="lg" className="h-12 flex-1 text-base">บันทึก</Button>
            <Button type="button" variant="outline" size="lg" className="h-12 text-base" render={<Link href="/admin/seasons" />} nativeButton={false}>ยกเลิก</Button>
          </div>
        </div>
      </form>
    </>
  );
}
