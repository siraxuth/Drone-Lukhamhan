import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import type { MDXComponents } from 'mdx/types';
import { Bytes } from './Bytes';
import { MsPerCmCalc, ServoCalc, ThrustCalc } from './Calculators';
import { CmdDemo } from './demo/CmdDemo';
import { Figure } from './Figure';
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

/** ทุกคอมโพเนนต์ที่เรียกใช้ใน .mdx ได้โดยไม่ต้อง import */
export function getMDXComponents(extra?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Accordion, Accordions, File, Files, Folder, Step, Steps, Tab, Tabs,
    Figure, CmdDemo, Bytes, Waveform, TryInSimulator, ThrustCalc, MsPerCmCalc, ServoCalc,
    ...startFigures, ...physicsFigures, ...electronicsFigures, ...arduinoFigures,
    ...codeFigures, ...mechanismsFigures, ...competeFigures, ...advancedFigures,
    ...extra,
  } as MDXComponents;
}
