import { Marquee } from '@/components/ui/marquee';

/** แถบข้อความยักษ์วิ่งต่อเนื่อง คั่นระหว่างส่วน (ตกแต่งอย่างเดียว ไม่ใช่เนื้อหา) · ซ้ายสุดและขวาสุดเบลอแล้วค่อยๆ เลือนหาย */
export function Ribbon({ words, reverse = false }: { words: string[]; reverse?: boolean }) {
  const edge = 'pointer-events-none absolute inset-y-0 z-10 w-[14%] min-w-16 backdrop-blur-[10px]';
  return (
    <div aria-hidden className="relative z-10 my-8 select-none overflow-hidden sm:my-14 [mask-image:linear-gradient(to_right,transparent,black_14%,black_86%,transparent)]">
      <Marquee reverse={reverse} repeat={3} className="[--duration:38s] [--gap:2.5rem]">
        {words.map((w, i) => (
          <span key={w + i} className={`font-display text-6xl font-extrabold tracking-tight sm:text-8xl ${i % 2 ? 'text-brand-blue' : 'text-transparent [-webkit-text-stroke:2px_var(--foreground)]'}`}>{w}</span>
        ))}
      </Marquee>
      {/* เบลอเข้มที่ขอบ จางลงเข้าหากลาง */}
      <div className={`${edge} left-0 [mask-image:linear-gradient(to_right,black,transparent)]`} />
      <div className={`${edge} right-0 [mask-image:linear-gradient(to_left,black,transparent)]`} />
    </div>
  );
}
