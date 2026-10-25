import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Bytes } from './Bytes';
import { MsPerCmCalc, ServoCalc, ThrustCalc } from './Calculators';
import { CmdDemo } from './demo/CmdDemo';
import { Figure } from './Figure';
import { ProjectFiles } from './ProjectFiles';
import { TryInSimulator } from './TryInSimulator';
import { Waveform } from './Waveform';
import { advancedFigures } from './figures/advanced';
import { arduinoFigures } from './figures/arduino';
import { codeFigures } from './figures/code';
import { competeFigures } from './figures/compete';
import { electronicsFigures } from './figures/electronics';
import { mechanismsFigures } from './figures/mechanisms';
import { physicsFigures } from './figures/physics';
import { startFigures } from './figures/start';

/** ชุดการ์ดทางเลือกของหน้าแรกบทเรียน: ใหญ่ อ่านง่าย มีลูกศรบอกว่ากดได้ */
function Cards({ children }: { children: React.ReactNode }) {
  return <div className="not-prose my-6 grid gap-3 sm:grid-cols-2">{children}</div>;
}
function Card({ title, href, children }: { title: string; href?: string; children?: React.ReactNode }) {
  const body = (
    <>
      <span className="block text-lg font-bold leading-snug text-foreground">{title}</span>
      {children && <span className="mt-1.5 block text-base leading-7 text-muted-foreground [&_code]:squircle-xl [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_p]:m-0">{children}</span>}
      {href && <span className="mt-3 inline-flex items-center gap-1.5 text-base font-semibold text-brand-blue">เปิดอ่าน <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden /></span>}
    </>
  );
  const cls = 'group block squircle-2xl border border-line bg-surface p-5 transition-colors';
  return href ? <Link href={href} className={`${cls} hover:border-brand-blue hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue`}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** ทุกคอมโพเนนต์ที่เรียกใช้ใน .mdx ได้โดยไม่ต้อง import */
export function getMDXComponents(extra?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Cards, Card,
    Accordion, Accordions, File, Files, Folder, Step, Steps, Tab, Tabs,
    Figure, ProjectFiles, CmdDemo, Bytes, Waveform, TryInSimulator, ThrustCalc, MsPerCmCalc, ServoCalc,
    ...startFigures, ...physicsFigures, ...electronicsFigures, ...arduinoFigures,
    ...codeFigures, ...mechanismsFigures, ...competeFigures, ...advancedFigures,
    ...extra,
  } as MDXComponents;
}
