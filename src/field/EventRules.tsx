import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { RuleEvent } from '@/rules/types';

const fmt = (s: number) => `${Math.floor(s / 60)} นาที ${s % 60} วินาที`;

/** กติกาของประเภทที่เลือก — ใช้ข้อมูลจาก rules/season-*.ts เท่านั้น (เปลี่ยนปีไม่ต้องแก้ UI) */
export function EventRules({ event }: { event: RuleEvent }) {
  return (
    <section aria-labelledby={`rules-${event.id}`} className="grid gap-6">
      <div>
        <h2 id={`rules-${event.id}`} className="font-display text-3xl font-semibold tracking-tight">{event.name}</h2>
        <p className="text-muted-foreground">{event.nameEn}</p>
        <p className="mt-3 max-w-2xl">{event.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">เวลา {fmt(event.durationSec)}</Badge>
          <Badge variant="secondary">ทีมละไม่เกิน {event.maxMembers} คน</Badge>
          <Badge variant="secondary">คะแนนเต็ม {event.maxPoints}</Badge>
          <Badge variant="outline">ระบบอัตโนมัติเท่านั้น</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="squircle-2xl">
          <CardHeader><CardTitle>ลำดับภารกิจ</CardTitle><CardDescription>ทำตามนี้ภายในเวลาที่กำหนด</CardDescription></CardHeader>
          <CardContent>
            <ol className="grid gap-4">
              {event.steps.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-3">
                  <span className="grid size-8 place-items-center squircle-sm bg-surface-2 font-mono text-sm text-brand-blue">{i + 1}</span>
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <ul className="mt-1 grid gap-1 text-sm text-muted-foreground">{s.items.map((t) => <li key={t}>• {t}</li>)}</ul>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="squircle-2xl">
          <CardHeader><CardTitle>การให้คะแนน</CardTitle><CardDescription>รวมสูงสุด {event.maxPoints} คะแนน · เท่ากันตัดสินที่เวลา</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>รายการ</TableHead><TableHead className="text-right">คะแนน</TableHead></TableRow></TableHeader>
              <TableBody>
                {event.scoring.map((r) => (
                  <TableRow key={r.item}>
                    <TableCell className="whitespace-normal">{r.item}{r.note && <span className="block text-xs text-muted-foreground">{r.note}</span>}</TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap text-brand-blue">{r.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {event.notes.length > 0 && <ul className="grid gap-1 text-sm text-muted-foreground">{event.notes.map((n) => <li key={n}>💡 {n}</li>)}</ul>}

    </section>
  );
}
