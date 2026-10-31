import { loadFont } from '@remotion/google-fonts/NotoSansThai';

/** ฟอนต์เดียวกับเว็บ (Noto Sans Thai) */
export const { fontFamily } = loadFont('normal', { weights: ['400', '600', '800'], subsets: ['thai', 'latin'] });

/** สีจากโทเคนของเว็บ (src/app/globals.css) แปลง oklch เป็น hex แล้ว */
export const C = {
  canvas: '#f9fafb',
  surface: '#ffffff',
  surface2: '#f2f4f5',
  line: '#dcdee0',
  fg: '#1c1f25',
  muted: '#5e646c',
  blue: '#006fd7',
  red: '#de0040',
  dark: '#27272a',
  darkSurface: '#303033',
  darkLine: '#424245',
  blueOnDark: '#40befd',
  amber: '#d97706',
  emerald: '#059669',
} as const;

export const FPS = 30;
export const mono = '"JetBrains Mono", "DejaVu Sans Mono", ui-monospace, monospace';
