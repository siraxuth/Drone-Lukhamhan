'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';

/** สลับโหมดสว่าง/มืด ผูกกับ next-themes (Fumadocs ใช้ตัวเดียวกัน) */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="inline-block size-9" aria-hidden />;
  return (
    <AnimatedThemeToggler
      className={className}
      duration={600}
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      onThemeChange={setTheme}
      aria-label="สลับโหมดสว่าง/มืด"
    />
  );
}
