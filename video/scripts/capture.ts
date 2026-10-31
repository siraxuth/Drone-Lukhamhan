// ถ่ายภาพหน้าจอเว็บไปใช้ในคลิป: bun scripts/capture.ts [baseUrl]
// ใช้ Chrome ในเครื่อง (ตั้ง CHROME_PATH ได้) · ซ่อนปุ่ม dev/ทัวร์ และบังคับธีมสว่าง
import puppeteer from 'puppeteer-core';

const base = process.argv[2] ?? 'http://localhost:3000';
const chrome = process.env.CHROME_PATH ?? '/usr/bin/google-chrome-stable';
const shots = [
  { path: '/docs', name: 'docs' },
  { path: '/docs/lettering', name: 'lettering' },
];
const sizes = [
  { suffix: 'desktop', width: 1440, height: 900, mobile: false },
  { suffix: 'mobile', width: 390, height: 844, mobile: true },
];
const hide = `nextjs-portal, [data-nextjs-toast], button[aria-label="ดูวิธีใช้หน้านี้"] { display: none !important; } * { scroll-behavior: auto !important; }`;

const browser = await puppeteer.launch({ executablePath: chrome, args: ['--no-sandbox', '--hide-scrollbars'] });
for (const s of sizes) {
  const page = await browser.newPage();
  await page.setViewport({ width: s.width, height: s.height, deviceScaleFactor: 2, isMobile: s.mobile, hasTouch: s.mobile });
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('theme', 'light');
      for (const k of ['home', 'docs', 'learn', 'simulator', 'field']) localStorage.setItem(`tour:${k}`, 'done');
    } catch {}
  });
  for (const shot of shots) {
    await page.goto(base + shot.path, { waitUntil: 'networkidle2', timeout: 120_000 });
    await page.addStyleTag({ content: hide });
    await new Promise((r) => setTimeout(r, 2500));
    const file = `public/img/${shot.name}-${s.suffix}.webp` as const;
    // มือถือถ่ายยาว 3 จอให้คลิปเลื่อนลงได้ · คอมถ่ายจอเดียว เพราะ sidebar ของ docs ติดอยู่กับจอ ถ่ายยาวแล้วจะหายไปหลังจอแรก
    const tall = s.mobile ? 3 : 1;
    await page.screenshot({ path: file, type: 'webp', quality: 88, clip: { x: 0, y: 0, width: s.width, height: s.height * tall }, captureBeyondViewport: tall > 1 });
    console.log('saved', file);
  }
  await page.close();
}
await browser.close();
