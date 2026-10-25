import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RichEditor } from '@/components/RichEditor';
import { toHtml } from '@/lib/rich';
import { saveProject } from '../../actions';
import { GalleryPicker, ImagePicker } from '../../client';
import { Field, Notice, PageHead, Panel } from '../../ui';

export default async function ProjectEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const p = id === 'new' ? null : await db.project.findUnique({ where: { id } });
  if (id !== 'new' && !p) notFound();
  return (
    <>
      <Link href="/admin/projects" className="inline-flex min-h-11 items-center gap-2 text-base text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" aria-hidden /> ผลงานทั้งหมด</Link>
      <PageHead title={p ? 'แก้ไขผลงาน' : 'เพิ่มผลงาน'} />
      <Notice error={error} />
      <form action={saveProject.bind(null, id)} className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Panel>
          <Field id="title" label="ชื่อผลงาน"><Input id="title" name="title" defaultValue={p?.title} required className="h-11 text-base" /></Field>
          <Field label="รายละเอียด" hint="ย่อหน้าแรกใช้เป็นคำสรุปบนการ์ด"><RichEditor name="description" initial={toHtml(p?.description ?? '')} placeholder="เล่าที่มา วิธีทำ และผลลัพธ์ของผลงาน" minHeight="18rem" /></Field>
          <Field label="แกลเลอรีภาพ" hint="เพิ่มได้หลายรูป ทุกรูปจะแสดงในหน้าผลงาน (นอกจากรูปปก) ใช้ใส่ภาพตอนแข่ง ภาพทีม ภาพรางวัล"><GalleryPicker name="images" folder="projects" initial={p?.images} /></Field>
          <Field id="location" label="สถานที่" hint="เช่น ชื่อสนามแข่ง หรือชื่องาน"><Input id="location" name="location" defaultValue={p?.location} placeholder="เช่น สนามแข่ง RCSA ศูนย์ภาคอีสาน" className="h-11 text-base" /></Field>
          <Field id="videoUrl" label="ลิงก์คลิป (ไม่บังคับ)" hint="วางลิงก์ YouTube จะแสดงเป็นคลิปฝังในหน้าผลงาน ลิงก์อื่นแสดงเป็นปุ่ม"><Input id="videoUrl" name="videoUrl" type="url" defaultValue={p?.videoUrl ?? ''} placeholder="https://youtu.be/…" className="h-11 text-base" /></Field>
        </Panel>
        <div className="grid h-fit gap-6">
          <Panel>
            <Field label="รูปปก"><ImagePicker name="image" folder="projects" initial={p?.image} /></Field>
            <Field id="year" label="ปี (ค.ศ.)"><Input id="year" name="year" type="number" defaultValue={p?.year ?? new Date().getFullYear()} required className="h-11 text-base" /></Field>
            <label className="flex items-center justify-between gap-3 text-base">เผยแพร่บนเว็บไซต์ <Switch name="published" defaultChecked={p?.published ?? true} /></label>
          </Panel>
          <div className="flex gap-3">
            <Button type="submit" size="lg" className="h-12 flex-1 text-base">บันทึก</Button>
            <Button type="button" variant="outline" size="lg" className="h-12 text-base" render={<Link href="/admin/projects" />} nativeButton={false}>ยกเลิก</Button>
          </div>
        </div>
      </form>
    </>
  );
}
