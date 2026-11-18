'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { ScenePreview } from '@/field/ScenePlan';
import type { ScenarioView } from '@/lib/scenarios';
import { cn } from '@/lib/utils';

export function ScenarioImage({ scenario, className }: { scenario: ScenarioView; className?: string }) {
  if (scenario.config.pattern === 'standard') return (
    <div className={cn('relative min-h-0 overflow-hidden bg-surface-2', className)}>
      <Image fill sizes="(min-width: 768px) 340px, 90vw" className="object-contain" src={`/field/${scenario.config.event}-top.webp`} alt={`สนามของโจทย์ ${scenario.title}`} />
    </div>
  );
  return <div className={cn('grid place-items-center overflow-hidden bg-surface-2', className)}>
    <ScenePreview config={scenario.config} className="h-full max-h-full w-auto max-w-full" />
  </div>;
}

function briefExcerpt(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

export function ScenarioPicker({ scenarios, value, onSelect, onNext }: {
  scenarios: ScenarioView[]; value: string; onSelect: (slug: string) => void; onNext: () => void;
}) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(6);
  const filtered = scenarios.filter(scenario => `${scenario.title} ${scenario.level}`.toLocaleLowerCase('th').includes(query.trim().toLocaleLowerCase('th')));
  const selected = scenarios.find(scenario => scenario.slug === value);
  return <div className="grid min-w-0 gap-4">
    <InputGroup>
      <InputGroupInput aria-label="ค้นหาโจทย์" placeholder="ค้นหาโจทย์หรือระดับ เช่น ผ่านห่วง" value={query} onChange={event => { setQuery(event.target.value); setLimit(6); }} />
      <InputGroupAddon><Search /></InputGroupAddon>
    </InputGroup>
    <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        {filtered.length ? <div className="grid gap-2 sm:grid-cols-2">
          {filtered.slice(0, limit).map(scenario => <Card key={scenario.slug} size="sm" className={cn('gap-2 overflow-hidden squircle-2xl py-0', scenario.slug === value && 'ring-2 ring-brand-blue')}>
            <ScenarioImage scenario={scenario} className="h-24" />
            <CardHeader className="gap-1">
              <Badge variant="secondary">{scenario.level}</Badge>
              <CardTitle className="line-clamp-2">{scenario.title}</CardTitle>
              <CardDescription className="line-clamp-2">{briefExcerpt(scenario.briefHtml)}</CardDescription>
            </CardHeader>
            <CardFooter className="justify-end pb-2">
              <Button type="button" size="sm" variant={scenario.slug === value ? 'secondary' : 'outline'} aria-pressed={scenario.slug === value} onClick={() => onSelect(scenario.slug)}>
                {scenario.slug === value ? <><Check data-icon="inline-start" /> เลือกแล้ว</> : 'เลือกโจทย์นี้'}
              </Button>
            </CardFooter>
          </Card>)}
        </div> : <Empty><EmptyHeader><EmptyTitle>ไม่พบโจทย์</EmptyTitle><EmptyDescription>ลองค้นด้วยชื่อสั้นลงหรือชื่อระดับ</EmptyDescription></EmptyHeader></Empty>}
        {filtered.length > limit && <Button type="button" className="mt-3" variant="outline" onClick={() => setLimit(value => value + 6)}>ดูโจทย์เพิ่ม</Button>}
      </div>
      {selected && <Card size="sm" className="h-fit gap-3 overflow-hidden squircle-2xl pt-0">
        <ScenarioImage scenario={selected} className="h-40" />
        <CardHeader>
          <CardTitle>{selected.title}</CardTitle>
          <CardDescription>รายละเอียดโจทย์ที่เลือก</CardDescription>
        </CardHeader>
        <CardContent className="rich max-h-56 overflow-auto text-sm" dangerouslySetInnerHTML={{ __html: selected.briefHtml }} />
        <CardFooter><Button type="button" onClick={onNext}>ตั้งกติกาห้อง</Button></CardFooter>
      </Card>}
    </div>
  </div>;
}
