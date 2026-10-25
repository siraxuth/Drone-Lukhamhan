import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { leds, safety, specs } from './content';

const tone = { ok: 'bg-brand-blue', info: 'bg-brand-blue', warn: 'bg-foreground', bad: 'bg-brand-red' } as const;

export function Specs() {
  return (
    <section id="gear" data-pose="specs" className="py-28">
      <div data-reveal-group className="mx-auto max-w-6xl px-4">
        <p data-reveal-item className="text-sm font-medium text-brand-blue">รู้จักเครื่องที่ใช้</p>
        <h2 data-reveal-item className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">RCSA EDU ในมือคุณ</h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-5">
          <Card data-reveal-item className="squircle-2xl lg:col-span-3">
            <CardHeader><CardTitle>สเปกจากคู่มือ</CardTitle><CardDescription>ตัวเลขที่ใช้คำนวณในบทฟิสิกส์ เช่น น้ำหนัก 310 กรัม</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {specs.map(([k, v]) => (
                    <TableRow key={k}><TableCell className="text-muted-foreground">{k}</TableCell><TableCell className="font-medium">{v}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card data-reveal-item className="squircle-2xl lg:col-span-2">
            <CardHeader><CardTitle>ไฟ LED บอกอะไร</CardTitle><CardDescription>ดูสถานะโดรนได้ในพริบตา</CardDescription></CardHeader>
            <CardContent className="grid gap-3">
              {leds.map((l) => (
                <div key={l.color} className="flex items-start gap-3">
                  <span aria-hidden className={`mt-1.5 size-3 shrink-0 rounded-full ${tone[l.tone]}`} />
                  <p className="text-sm"><Badge variant="outline" className="mr-2">{l.color}</Badge>{l.meaning}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Alert data-reveal-item className="squircle-2xl mt-4">
          <AlertTriangle className="size-4" />
          <AlertTitle>ความปลอดภัยมาก่อนเสมอ</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 grid gap-1.5">{safety.map((s) => <li key={s}>• {s}</li>)}</ul>
          </AlertDescription>
        </Alert>
      </div>
    </section>
  );
}
