import { Figure } from './Figure';

/** สื่อบทเรียนโดรนแปรอักษรอยู่ใน R2 ที่ drone_lukhamhan/lessons/lettering/ */
const BASE = `${process.env.R2_PUBLIC_URL ?? 'https://cdn.dekgp.com'}/drone_lukhamhan/lessons/lettering`;

/** คลิปสอน: โหลดเมื่อกดเล่น (preload none) มีภาพปกให้เห็นก่อน ไฟล์ต้นทางมีเฉพาะภาพหน้าจอ ไม่มีเสียง */
export function LessonVideo({ name, caption, loop }: { name: string; caption: string; loop?: boolean }) {
  return (
    <figure className="not-prose my-8">
      <div className="overflow-hidden squircle-3xl border border-line bg-black">
        <video
          className="aspect-video w-full"
          controls
          playsInline
          preload="none"
          loop={loop}
          poster={`${BASE}/${name}-poster.webp`}
          src={`${BASE}/${name}.mp4`}
          aria-label={caption}
        />
      </div>
      <figcaption className="mt-3 px-1 text-base leading-7 text-muted-foreground">คลิป: {caption}</figcaption>
    </figure>
  );
}

/** ภาพหน้าจอ Blender จาก R2 (ไฟล์ .webp) ใช้แทน Figure ที่ต้องใส่ URL เต็ม */
export function LessonImage({ name, caption, ext = 'webp', ...rest }: { name: string; caption: string; ext?: 'webp' | 'gif'; width?: number; height?: number; narrow?: boolean; alt?: string }) {
  const src = `${BASE}/${name}.${ext}`;
  if (ext === 'gif') {
    return (
      <figure className="not-prose my-8">
        <div className="overflow-hidden squircle-3xl border border-line bg-surface p-3 sm:p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={rest.alt ?? caption} loading="lazy" className="h-auto w-full squircle-2xl" />
        </div>
        <figcaption className="mt-3 px-1 text-base leading-7 text-muted-foreground">{caption}</figcaption>
      </figure>
    );
  }
  return <Figure src={src} caption={caption} {...rest} />;
}
