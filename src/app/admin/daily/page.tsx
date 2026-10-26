import { ScenePreview } from '@/field/ScenePlan';
import { db } from '@/lib/db';
import { getMission, TIER_IDS, TIERS } from '@/learn/daily';
import { dayKey } from '@/learn/path';
import { PageHead } from '../ui';

export const dynamic = 'force-dynamic';

const TH = new Intl.DateTimeFormat('th-TH', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' });

/** ตรวจภารกิจรายวัน 7 วันข้างหน้า: ด่านทุกวันสร้างจากวันที่และรันเฉลยผ่านก่อนเผยแพร่ หน้านี้แสดงผลนั้นพร้อมโค้ดเฉลย (เห็นเฉพาะแอดมิน/ครู) และจำนวนผู้เล่นวันนี้ */
export default async function AdminDailyPage() {
  const today = dayKey();
  const days = Array.from({ length: 7 }, (_, i) => dayKey(new Date(Date.now() + i * 86_400_000)));
  const stats = await db.dailyRun.groupBy({ by: ['tier'], where: { day: today }, _count: { _all: true }, _sum: { attempts: true } });
  const solved = await db.dailyRun.groupBy({ by: ['tier'], where: { day: today, solved: true }, _count: { _all: true } });
  return (
    <>
      <PageHead title="ภารกิจรายวัน" desc="ด่านสร้างอัตโนมัติจากวันที่ (ได้ด่านเดิมเสมอ) และทุกด่านผ่านการรันโค้ดเฉลยได้คะแนนเต็มก่อนเผยแพร่" />
      <section aria-label="วันนี้" className="grid gap-3 sm:grid-cols-3">
        {TIER_IDS.map((t) => {
          const s = stats.find((x) => x.tier === t), v = solved.find((x) => x.tier === t);
          return <div key={t} className="squircle-2xl border border-line bg-surface p-4"><p className="text-sm text-muted-foreground">วันนี้ · ระดับ{TIERS[t].label}</p><p className="text-2xl font-extrabold">{s?._count._all ?? 0} คนลอง · {v?._count._all ?? 0} คนผ่าน</p><p className="text-sm text-muted-foreground">ส่งรวม {s?._sum.attempts ?? 0} ครั้ง</p></div>;
        })}
      </section>
      <div className="grid gap-4">
        {days.map((day) => (
          <section key={day} aria-label={day} className="grid gap-2">
            <h2 className="text-lg font-bold">{TH.format(new Date(`${day}T12:00:00+07:00`))} <span className="font-normal text-muted-foreground">{day}{day === today ? ' · วันนี้' : ''}</span></h2>
            <div className="grid gap-3 md:grid-cols-3">
              {TIER_IDS.map((tier) => {
                const m = getMission(day, tier);
                return (
                  <details key={tier} className="group squircle-2xl border border-line bg-surface p-3">
                    <summary className="flex cursor-pointer list-none items-center gap-3">
                      <ScenePreview config={m.config} className="size-16 shrink-0 squircle-xl" />
                      <span className="min-w-0"><span className="block truncate text-base font-bold">{TIERS[tier].label} · {m.title}</span><span className="block text-sm text-muted-foreground">เต็ม {m.max} · เฉลยบิน {(m.solutionTimeMs / 1000).toFixed(0)} วินาที</span></span>
                    </summary>
                    <ol className="mt-3 list-decimal pl-5 text-sm leading-6">{m.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                    <pre className="mt-3 max-h-64 overflow-auto squircle-xl bg-surface-2 p-3 font-mono text-xs leading-5"><code>{m.solution}</code></pre>
                  </details>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
