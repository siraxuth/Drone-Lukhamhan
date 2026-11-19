'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { ScenePreview } from '@/field/ScenePlan';
import { LEVELS, type ScenarioView } from '@/lib/scenarios';
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
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [expanded, setExpanded] = useState<Record<string, number>>({});
  const tags = (scenario: ScenarioView) => scenario.config.tags?.length ? scenario.config.tags : [scenario.config.event];
  const labels: Record<string, string> = {
    route: 'วางเส้นทาง', checkpoint: 'ผ่านจุดตรวจ', altitude: 'ความสูง', hoop: 'ลอดห่วง',
    cargo: 'ปล่อยบอล', landing: 'ลงจอด', target: 'ยิงเป้า', mixed: 'ภารกิจผสม',
    mission: 'สนามภารกิจ', aviation: 'แตะลูกโป่ง', innovation: 'สนามยิงเป้า',
  };
  const levels = [...new Set([...LEVELS, ...scenarios.map(scenario => scenario.level)])];
  const categories = [...new Set(scenarios.flatMap(tags))].sort((a, b) => (labels[a] ?? a).localeCompare(labels[b] ?? b, 'th'));
  const search = query.trim().toLocaleLowerCase('th');
  const filtered = scenarios.filter(scenario => (!level || scenario.level === level)
    && (!category || tags(scenario).includes(category))
    && [scenario.title, scenario.slug, ...tags(scenario).map(tag => labels[tag] ?? tag)]
      .some(text => text.toLocaleLowerCase('th').includes(search)));
  const groups = levels.map(level => ({ level, items: filtered.filter(scenario => scenario.level === level) })).filter(group => group.items.length);
  const selected = scenarios.find(scenario => scenario.slug === value);
  return <div className="grid min-w-0 gap-4">
    <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
      <InputGroup>
        <InputGroupInput aria-label="ค้นหาโจทย์" placeholder="ค้นหาโจทย์ เช่น ลอดห่วง" value={query} onChange={event => setQuery(event.target.value)} />
        <InputGroupAddon><Search /></InputGroupAddon>
      </InputGroup>
      <NativeSelect className="w-full" aria-label="กรองตามระดับโจทย์" value={level} onChange={event => setLevel(event.target.value)}>
        <NativeSelectOption value="">ทุกระดับ</NativeSelectOption>
        {levels.map(level => <NativeSelectOption key={level} value={level}>{level}</NativeSelectOption>)}
      </NativeSelect>
      <NativeSelect className="w-full" aria-label="กรองตามประเภทภารกิจ" value={category} onChange={event => setCategory(event.target.value)}>
        <NativeSelectOption value="">ทุกประเภท</NativeSelectOption>
        {categories.map(category => <NativeSelectOption key={category} value={category}>{labels[category] ?? category}</NativeSelectOption>)}
      </NativeSelect>
    </div>
    <p className="text-sm text-muted-foreground" aria-live="polite">พบ {filtered.length.toLocaleString('th-TH')} โจทย์</p>
    <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="grid min-w-0 content-start gap-5">
        {groups.length ? groups.map(group => {
          const limit = expanded[group.level] ?? (level ? 6 : 2);
          return <section key={group.level} aria-label={`โจทย์ระดับ${group.level}`} className="grid gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">{group.level}</h3>
              <Badge variant="secondary">{group.items.length.toLocaleString('th-TH')} โจทย์</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">{group.items.slice(0, limit).map(scenario => <Card key={scenario.slug} size="sm" className={cn('gap-2 overflow-hidden squircle-2xl py-0', scenario.slug === value && 'ring-2 ring-brand-blue')}>
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
          </Card>)}</div>
            {group.items.length > limit && <Button type="button" className="justify-self-start" variant="outline"
              onClick={() => setExpanded(previous => ({ ...previous, [group.level]: limit + 6 }))}>ดูโจทย์ระดับ{group.level}เพิ่ม</Button>}
          </section>;
        }) : <Empty><EmptyHeader><EmptyTitle>ไม่พบโจทย์</EmptyTitle><EmptyDescription>ลองเปลี่ยนคำค้น ระดับ หรือประเภทภารกิจ</EmptyDescription></EmptyHeader></Empty>}
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
