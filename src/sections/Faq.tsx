import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { faq, glossary } from './content';

export function Faq() {
  return (
    <section id="faq" data-pose="faq" className="mx-auto max-w-6xl px-4 py-28">
      <div data-reveal-group className="grid gap-12 lg:grid-cols-2">
        <div>
          <p data-reveal-item className="text-sm font-medium text-brand-blue">คำถามที่พบบ่อย</p>
          <h2 data-reveal-item className="mt-2 font-display text-4xl font-semibold tracking-tight">มือใหม่มักสงสัยอะไร</h2>
          <Accordion data-reveal-item defaultValue={['q0']} className="mt-6">
            {faq.map((f, i) => (
              <AccordionItem key={f.q} value={`q${i}`}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent className="leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <div>
          <p data-reveal-item className="text-sm font-medium text-brand-red">ศัพท์ที่จะเจอ</p>
          <h2 data-reveal-item className="mt-2 font-display text-4xl font-semibold tracking-tight">พจนานุกรมสั้นๆ</h2>
          <div className="mt-6 grid gap-3">
            {glossary.map((g) => (
              <Card key={g.term} data-reveal-item className="squircle-2xl"><CardContent className="p-4"><p className="font-display font-semibold text-brand-blue">{g.term}</p><p className="mt-1 text-sm text-muted-foreground">{g.def}</p></CardContent></Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
