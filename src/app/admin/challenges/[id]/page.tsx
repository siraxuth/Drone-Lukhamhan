import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { RichEditor } from '@/components/RichEditor';
import { toHtml } from '@/lib/rich';
import { parseConfig, LEVELS } from '@/lib/scenarios';
import { ChallengeForm } from '../ChallengeForm';
import { ScenarioEditor } from '../ScenarioEditor';
import { StarterField } from '../StarterField';
import { Field, Notice, PageHead, Panel } from '../../ui';

export default async function ChallengeEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const c = id === 'new' ? null : await db.challenge.findUnique({ where: { id } });
  if (id !== 'new' && !c) notFound();
  return (
    <>
      <Link href="/admin/challenges" className="inline-flex min-h-11 items-center gap-2 text-base text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" aria-hidden /> โจทย์ทั้งหมด</Link>
      <PageHead title={c ? 'แก้ไขโจทย์' : 'เพิ่มโจทย์'} />
      <Notice error={error} />
      <ChallengeForm id={id} saved={saved} slug={c?.slug}>
        <div className="lg:col-span-2" data-challenge-scenario tabIndex={-1}>
          <Panel>
            <div><h2 className="text-xl font-bold">เลือกสนามและวางภารกิจ</h2><p className="text-sm text-muted-foreground">สนามคือพื้นที่ 10×10 เมตร เลือกแบบสนามจริง กริด 5×5 หรือพื้นว่างจากหัวข้อ “ลายสนาม” ก่อน แล้วลากจุดผ่าน ห่วง แท่น บอลลูน หรือเป้าลงบนพื้นที่</p></div>
            <ScenarioEditor initial={parseConfig(c?.config)} />
          </Panel>
        </div>
        <div className="grid gap-6">
          <Panel>
            <Field id="title" label="ชื่อโจทย์"><Input id="title" name="title" defaultValue={c?.title} required className="h-11 text-base" /></Field>
            <Field label="คำอธิบายโจทย์" hint="บอกเป้าหมาย คะแนน และคำใบ้ ผู้เรียนเห็นที่ขั้น 'อ่านโจทย์'"><RichEditor name="brief" initial={toHtml(c?.brief ?? '')} minHeight="10rem" /></Field>
          </Panel>
          <Panel>
            <div><h2 className="text-lg font-bold">โค้ดเริ่มต้น</h2><p className="text-base text-muted-foreground">ให้แค่ท่อนแรกเป็นต้นแบบ แล้วเขียนคอมเมนต์บอกว่าต้องต่อยอดอะไร</p></div>
            <StarterField defaultValue={c?.starter ?? ''} />
          </Panel>
        </div>
        <div className="grid h-fit gap-6 lg:sticky lg:top-6">
          <Panel>
            <Field id="level" label="ระดับ">
              <NativeSelect id="level" name="level" defaultValue={c?.level ?? 'เริ่มต้น'} className="w-full [&_select]:h-11 [&_select]:text-base">
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </NativeSelect>
            </Field>
            <Field id="order" label="ลำดับในรายการ" hint="เลขน้อยขึ้นก่อน"><Input id="order" name="order" type="number" min={0} max={999} defaultValue={c?.order ?? 0} className="h-11 text-base" /></Field>
            <p className="text-sm text-muted-foreground">สร้างลิงก์จากชื่อให้อัตโนมัติ: แปลคำภารกิจที่รู้จักเป็นอังกฤษ และถอดอักษรสำหรับคำอื่น ชื่อซ้ำจะเติมเลขท้าย</p>
            {c?.slug && <p className="break-all text-sm">ลิงก์ปัจจุบัน: /simulator?tab={c.slug}</p>}
            <label className="flex items-center justify-between gap-3 text-base">เผยแพร่ <Switch name="published" defaultChecked={c?.published ?? false} /></label>
          </Panel>
          {c?.slug && <Button type="button" variant="outline" size="lg" className="h-11 text-base" render={<Link href={`/simulator?tab=${c.slug}`} target="_blank" />} nativeButton={false}>ลองเล่นโจทย์นี้</Button>}
        </div>
      </ChallengeForm>
    </>
  );
}
