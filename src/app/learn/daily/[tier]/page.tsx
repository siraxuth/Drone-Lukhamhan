import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getMission, isTier, TIERS } from '@/learn/daily';
import { dayKey } from '@/learn/path';
import { DailyPlayer } from './DailyPlayer';

export const metadata: Metadata = { title: 'ภารกิจรายวัน' };
export const dynamic = 'force-dynamic';

export default async function DailyMissionPage({ params }: { params: Promise<{ tier: string }> }) {
  const { tier } = await params;
  if (!isTier(tier)) notFound();
  const session = await requireUser();
  if (!session) redirect(`/login?next=/learn/daily/${tier}`);
  const day = dayKey();
  const m = getMission(day, tier);
  const run = await db.dailyRun.findUnique({ where: { userId_day_tier: { userId: session.user.id, day, tier } } });
  // ไม่ส่งโค้ดเฉลยไปไคลเอนต์ (เลือกเฉพาะฟิลด์ที่แสดง)
  return (
    <DailyPlayer
      tier={tier}
      tierLabel={TIERS[tier].label}
      mission={{ title: m.title, steps: m.steps, config: m.config, max: m.max, xp: m.xp, starter: m.starter, referenceMs: m.solutionTimeMs }}
      best={run ? { score: run.bestScore, timeMs: run.bestTimeMs, solved: run.solved, attempts: run.attempts, code: run.bestCode } : null}
    />
  );
}
