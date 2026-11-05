// Capture the current homepage UI for the promo video.
// Usage: bun scripts/capture-landing.ts [baseUrl]
import puppeteer from 'puppeteer-core';

const base = process.argv[2] ?? 'http://localhost:3000';
const chrome = process.env.CHROME_PATH ?? '/usr/bin/google-chrome-stable';
const browser = await puppeteer.launch({ executablePath: chrome, args: ['--no-sandbox', '--hide-scrollbars'] });
const scenes = ['lift', 'rotors', 'pitch', 'roll', 'yaw', 'mixing', 'pid'];
const variants = [
  { suffix: 'desktop', width: 1920, height: 1080, dpr: 1 },
  { suffix: 'mobile', width: 540, height: 960, dpr: 2 },
];
const hide = `nextjs-portal, [data-nextjs-toast], button[aria-label="ดูวิธีใช้หน้านี้"] { display:none!important } html { scroll-behavior:auto!important }`;

for (const v of variants) {
  const page = await browser.newPage();
  await page.setViewport({ width: v.width, height: v.height, deviceScaleFactor: v.dpr, isMobile: v.suffix === 'mobile', hasTouch: v.suffix === 'mobile' });
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('theme', 'dark');
      for (const k of ['home', 'docs', 'learn', 'simulator', 'field']) localStorage.setItem(`tour-v1:${k}`, '1');
    } catch {}
  });
  await page.goto(`${base}?notour=1`, { waitUntil: 'networkidle2', timeout: 120_000 });
  await page.addStyleTag({ content: hide });
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  await new Promise((r) => setTimeout(r, 3000));

  const snap = async (name: string, y: number) => {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await new Promise((r) => setTimeout(r, 900));
    await page.screenshot({ path: `public/img/home-${name}-${v.suffix}.webp`, type: 'webp', quality: 86 });
    console.log(`saved home-${name}-${v.suffix}.webp`);
  };
  const sectionTop = async (selector: string) => page.$eval(selector, (el) => Math.round(el.getBoundingClientRect().top + window.scrollY));
  const captureTargets = async (selector: string, names: string[]) => {
    const count = await page.$$eval(selector, (els) => els.length);
    for (let i = 0; i < Math.min(count, names.length); i++) {
      const top = await page.$$eval(selector, (els, index) => Math.round(els[index].getBoundingClientRect().top + window.scrollY), i);
      await snap(names[i], Math.max(0, top - v.height * 0.28));
    }
  };

  await snap('hero', 0);
  const slice = v.height * 7 / 8;
  for (let i = 0; i < scenes.length; i++) await snap(`how-${scenes[i]}`, slice * (i + 1) + slice * 0.45);

  await captureTargets('#about a[href]', ['about-learn', 'about-code', 'about-simulator', 'about-field', 'about-works']);
  await captureTargets('#events a', ['event-mission', 'event-aviation', 'event-innovation']);
  await snap('lettering', (await sectionTop('#lettering')) + v.height * 0.18);
  await captureTargets('#showcase a[href^="/works/"]', ['work-1', 'work-2', 'work-3']);
  await snap('field', (await sectionTop('#field')) + v.height * 0.16);
  await snap('join', (await sectionTop('#join')) + v.height * 0.12);
  await snap('closing', (await sectionTop('[data-pose="closing"]')) + v.height * 0.1);
  await snap('makers', (await sectionTop('#makers')) + v.height * 0.08);
  await snap('footer', (await sectionTop('footer')) + v.height * 0.06);

  for (const route of ['simulator', 'field']) {
    await page.goto(`${base}/${route}?notour=1`, { waitUntil: 'networkidle2', timeout: 120_000 });
    await page.addStyleTag({ content: hide });
    await new Promise((r) => setTimeout(r, 2500));
    await page.screenshot({ path: `public/img/home-${route}-page-${v.suffix}.webp`, type: 'webp', quality: 86 });
    console.log(`saved home-${route}-page-${v.suffix}.webp`);
  }
  await page.close();
}

await browser.close();
