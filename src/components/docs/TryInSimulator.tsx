import Link from 'next/link';
import { Plane } from 'lucide-react';

/** ปุ่มเปิดโปรแกรมตัวอย่างในตัวจำลอง · program = id ใน src/flight/programs.ts (mission-t, mission-warm, aviation-all, innovation-four) */
export function TryInSimulator({ program = 'mission-t', children = 'ลองรันในตัวจำลอง' }: { program?: string; children?: React.ReactNode }) {
  return (
    <Link href={`/simulator?p=${program}`} target="_blank" className="not-prose my-4 inline-flex min-h-11 items-center gap-2 squircle-xl bg-brand-blue px-4 text-base font-semibold text-white hover:opacity-90">
      <Plane className="size-5" aria-hidden /> {children}
    </Link>
  );
}
