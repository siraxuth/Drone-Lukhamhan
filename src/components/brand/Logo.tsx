import Image from 'next/image';
import { cn } from '@/lib/utils';

/** โลโก้ชมรมโดรน โรงเรียนลือคำหาญวารินชำราบ (public/brand/logo*.webp) */
export function Logo({ className, withText = true, size = 36 }: { className?: string; withText?: boolean; size?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 font-display font-semibold', className)}>
      <Image src="/brand/logo-sm.webp" alt="" width={size} height={size} className="shrink-0" priority />
      {withText && <span className="whitespace-nowrap leading-tight">ชมรมโดรน <span className="hidden text-muted-foreground sm:inline">ลือคำหาญฯ</span></span>}
    </span>
  );
}
