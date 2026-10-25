import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { RichEditor } from '@/components/RichEditor';
import { toHtml } from '@/lib/rich';
import { parseConfig, LEVELS } from '@/lib/scenarios';
import { saveChallenge } from '../../actions';
import { ScenarioEditor } from '../ScenarioEditor';
import { StarterField } from '../StarterField';
import { Field, Notice, PageHead, Panel } from '../../ui';

export default async function ChallengeEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const [c, seasons] = await Promise.all([id === 'new' ? null : db.challenge.findUnique({ where: { id } }), db.season.findMany({ orderBy: { year: 'desc' } })]);
  if (id !== 'new' && !c) notFound();
  return (
    <>
      <Link href="/admin/challenges" className="inline-flex min-h-11 items-center gap-2 text-base text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" aria-hidden /> โจทย์ทั้งหมด</Link>
      <PageHead title={c ? 'แก้ไขโจทย์' : 'เพิ่มโจทย์'} />
      <Notice error={error} />
      <form action={saveChallenge.bind(null, id)} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-6">
          <Panel>
            <Field id="title" label="ชื่อโจทย์"><Input id="title" name="title" defaultValue={c?.title} required className="h-11 text-base" /></Field>
            <Field label="คำอธิบายโจทย์" hint="บอกเป้าหมาย คะแนน และคำใบ้ ผู้เรียนเห็นที่ขั้น 'อ่านโจทย์'"><RichEditor name="brief" initial={toHtml(c?.brief ?? '')} minHeight="10rem" /></Field>
          </Panel>
          <Panel>
            <div><h2 className="text-lg font-bold">สนามและวัตถุ</h2><p className="text-base text-muted-foreground">เลือกลายสนาม แล้วลากวางจุดผ่าน ห่วง แท่น ลูกโป่ง เป้า ได้เลย</p></div>
            <ScenarioEditor initial={parseConfig(c?.config)} />
          </Panel>
          <Panel>
            <div><h2 className="text-lg font-bold">โค้ดเริ่มต้น</h2><p className="text-base text-muted-foreground">ให้แค่ท่อนแรกเป็นต้นแบบ แล้วเขียนคอมเมนต์บอกว่าต้องต่อยอดอะไร</p></div>
            <StarterField defaultValue={c?.starter ?? ''} />
          </Panel>
        </div>
        <div className="grid h-fit gap-6 lg:sticky lg:top-6">
          <Panel>
            <Field id="level" label="ระดับ">
              <NativeSelect className="w-full"><select id="level" name="level" defaultValue={c?.level ?? 'เริ่มต้น'} className="h-11 w-full appearance-none rounded-lg border border-input bg-transparent pl-3 pr-8 text-base">
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select></NativeSelect>
            </Field>
            <Field id="order" label="ลำดับในรายการ" hint="เลขน้อยขึ้นก่อน"><Input id="order" name="order" type="number" min={0} max={999} defaultValue={c?.order ?? 0} className="h-11 text-base" /></Field>
            <Field id="slug" label="slug (ใช้ในลิงก์)" hint="a-z 0-9 และ - เช่น grid-square · เว้นว่างให้ระบบตั้งให้"><Input id="slug" name="slug" defaultValue={c?.slug ?? ''} placeholder="grid-square" className="h-11 font-mono text-base" /></Field>
            <Field id="seasonId" label="ฤดูกาล">
              <NativeSelect className="w-full"><select id="seasonId" name="seasonId" defaultValue={c?.seasonId ?? ''} className="h-11 w-full appearance-none rounded-lg border border-input bg-transparent pl-3 pr-8 text-base">
                <option value="">ไม่ผูกกับปีไหน</option>
                {seasons.map((s) => <option key={s.id} value={s.id}>{s.year} · {s.title}</option>)}
              </select></NativeSelect>
            </Field>
            <label className="flex items-center justify-between gap-3 text-base">เผยแพร่ <Switch name="published" defaultChecked={c?.published ?? false} /></label>
          </Panel>
          <div className="flex gap-3">
            <Button type="submit" size="lg" className="h-12 flex-1 text-base">บันทึก</Button>
            <Button type="button" variant="outline" size="lg" className="h-12 text-base" render={<Link href="/admin/challenges" />} nativeButton={false}>ยกเลิก</Button>
          </div>
          {c?.slug && <Button type="button" variant="outline" size="lg" className="h-11 text-base" render={<Link href={`/simulator?tab=${c.slug}`} target="_blank" />} nativeButton={false}>ลองเล่นโจทย์นี้</Button>}
        </div>
      </form>
    </>
  );
}
