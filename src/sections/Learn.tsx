import Link from 'next/link';
import { Activity, ArrowUpRight, Cable, Code2, Flag, Shuffle, Wind } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';
import { MagicCard } from '@/components/ui/magic-card';
import { Badge } from '@/components/ui/badge';
import { topics } from './content';

const icons = { Wind, Shuffle, Activity, Cable, Code2, Flag } as const;

export function Learn() {
  return (
    <section id="learn" data-pose="learn" className="mx-auto max-w-6xl px-4 py-28">
      <div data-reveal-group>
        <p data-reveal-item className="text-sm font-medium text-brand-blue">เส้นทางการเรียน</p>
        <h2 data-reveal-item className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">เริ่มจากตรงไหนก็ได้ เรียงมาให้แล้ว</h2>
        <p data-reveal-item className="mt-3 max-w-2xl text-muted-foreground">ทุกบทอ่านจบใน 5 นาที มีภาพ มีสูตร มีตัวอย่าง และบอกว่าความรู้นี้ไปใช้ในโค้ดของชมรมตรงไหน</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t, i) => {
            const Icon = icons[t.icon];
            return (
              <Link key={t.id} href={t.href} data-reveal-item className="group squircle-2xl relative block">
                <MagicCard className="squircle-2xl h-full" gradientColor="color-mix(in oklab, var(--brand-blue) 18%, transparent)" gradientFrom="var(--brand-blue)" gradientTo="var(--brand-red)">
                  <div className="flex h-full flex-col gap-3 p-6">
                    <div className="flex items-center justify-between">
                      <span className="squircle-xl grid size-11 place-items-center bg-surface-2 text-brand-blue"><Icon className="size-5" /></span>
                      <Badge variant="secondary">{t.tag}</Badge>
                    </div>
                    <h3 className="font-display text-xl font-semibold">{i + 1}. {t.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{t.body}</p>
                    <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-brand-blue">อ่านบทนี้ <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
                  </div>
                </MagicCard>
                {i === 0 && <BorderBeam size={90} duration={8} colorFrom="var(--brand-blue)" colorTo="var(--brand-red)" />}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
