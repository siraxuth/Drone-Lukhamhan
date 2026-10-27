import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Crown, Medal } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { isTopServer, LEAGUES, leagueOf, nextLeague } from '@/learn/board-utils';
import { loadBoard, type BoardId, type BoardRow } from '@/learn/board';
import { isTier, TIERS, TIER_IDS, type Tier } from '@/learn/daily';
import { loadLearner } from '@/learn/server';
import { BoardSettings } from './BoardSettings';
import { shareMetadata } from '@/lib/og';

const title = 'อันดับผู้เรียนและภารกิจโดรน';
const description = 'ดูอันดับคะแนนรวม คะแนนรายสัปดาห์ และผลภารกิจประจำวันของผู้เรียน';
export const metadata: Metadata = { title, description, ...shareMetadata({ title, description, path: '/learn/leaderboard' }) };
export const dynamic = 'force-dynamic';

const TABS: Array<{ id: BoardId; label: string; unit: string; blurb: string }> = [
  { id: 'xp', label: 'XP รวม', unit: 'XP', blurb: 'XP สะสมทั้งหมดจากการจบหน่วยเรียนและภารกิจรายวัน' },
  { id: 'week', label: 'สัปดาห์นี้', unit: 'XP', blurb: 'XP ที่ได้ตั้งแต่เช้าวันจันทร์ (เวลาไทย) รีเซ็ตทุกสัปดาห์ ทุกคนมีโอกาสเริ่มใหม่' },
  { id: 'daily', label: 'ภารกิจวันนี้', unit: 'คะแนน', blurb: 'คะแนนภารกิจรายวันของวันนี้ ถ้าคะแนนเท่ากัน คนที่ใช้เวลาบินน้อยกว่าอยู่สูงกว่า' },
  { id: 'hard', label: 'ด่านยาก', unit: 'วัน', blurb: 'จำนวนวันที่ผ่านภารกิจรายวันระดับยากได้ตลอดกาล' },
];

const sec = (ms: number | null | undefined) => (ms == null ? '' : `${(ms / 1000).toFixed(1)} วิ`);
const MEDAL = ['text-amber-500', 'text-slate-400', 'text-orange-600'];

function Row({ r, unit, board }: { r: BoardRow; unit: string; board: BoardId }) {
  const top = board === 'xp' && isTopServer(r.rank, r.xp);
  return (
    <li className={`flex items-center gap-3 squircle-xl border px-3 py-2.5 sm:px-4 ${r.me ? 'border-brand-blue bg-brand-blue/10' : 'border-line bg-surface'}`}>
      <span className={`grid size-9 shrink-0 place-items-center text-lg font-extrabold ${r.rank <= 3 ? MEDAL[r.rank - 1] : 'text-muted-foreground'}`}>{r.rank <= 3 ? <Medal className="size-6" aria-label={`อันดับ ${r.rank}`} /> : r.rank}</span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-bold leading-snug">
          <span className="truncate">{r.name}{r.me ? ' (ฉัน)' : ''}</span>
          {top && <span className="inline-flex items-center gap-1 squircle-xl bg-brand-red px-2 py-0.5 text-xs font-extrabold text-background"><Crown className="size-3" aria-hidden /> Top Server</span>}
          <span className={`squircle-xl px-2 py-0.5 text-xs font-semibold ${r.leagueTone}`}>{r.league}</span>
        </p>
        {board === 'daily' && <p className="text-sm text-muted-foreground">{r.extra}{r.time != null ? ` · บิน ${sec(r.time)}` : ''}</p>}
      </div>
      <p className="shrink-0 text-right text-xl font-extrabold leading-tight">{r.value} <span className="text-sm font-semibold text-muted-foreground">{unit}</span></p>
    </li>
  );
}

/** อันดับ: XP รวม / สัปดาห์นี้ / ภารกิจวันนี้ / ด่านยาก · แสดงเฉพาะชื่อที่ผู้เรียนตั้งเอง (ไม่แสดงอีเมล) ซ่อนชื่อตัวเองได้ */
export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ board?: string; tier?: string }> }) {
  const session = await requireUser();
  if (!session) redirect('/login?next=/learn/leaderboard');
  const sp = await searchParams;
  const board: BoardId = TABS.some((t) => t.id === sp.board) ? (sp.board as BoardId) : 'xp';
  const tier: Tier = sp.tier && isTier(sp.tier) ? sp.tier : 'easy';
  const [data, { profile }] = await Promise.all([loadBoard(board, session.user.id, tier), loadLearner(session.user)]);
  const tab = TABS.find((t) => t.id === board) as (typeof TABS)[number];
  const league = leagueOf(profile.xp), next = nextLeague(profile.xp);

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 pb-32 pt-28 sm:px-6">
      <header className="grid gap-2">
        <Link href="/learn" className="w-fit text-base font-semibold text-brand-blue underline underline-offset-4">← เส้นทางเรียน</Link>
        <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">อันดับ</h1>
        <p className="text-lg leading-8 text-muted-foreground">ใครเรียนถึงไหน ทำภารกิจยากได้ไหม แข่งกับตัวเองและเพื่อนในชมรมได้ที่นี่ แสดงเฉพาะชื่อที่ตั้งเอง ไม่แสดงอีเมล</p>
      </header>

      <nav aria-label="เลือกตารางอันดับ" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.id} href={`/learn/leaderboard?board=${t.id}`} aria-current={board === t.id ? 'page' : undefined} className={`inline-flex h-11 items-center squircle-xl border px-4 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${board === t.id ? 'border-brand-blue bg-brand-blue/10 text-brand-blue' : 'border-line bg-surface hover:bg-surface-2'}`}>{t.label}</Link>
        ))}
      </nav>
      {board === 'daily' && (
        <div role="group" aria-label="ระดับภารกิจ" className="flex gap-1.5">
          {TIER_IDS.map((t) => <Link key={t} href={`/learn/leaderboard?board=daily&tier=${t}`} aria-current={tier === t ? 'true' : undefined} className={`inline-flex h-9 items-center squircle-xl border px-3.5 text-sm font-semibold ${tier === t ? 'border-brand-blue bg-brand-blue text-background' : 'border-line bg-surface hover:bg-surface-2'}`}>{TIERS[t].label}</Link>)}
        </div>
      )}
      <p className="text-base text-muted-foreground">{tab.blurb}</p>

      {data.me && (
        <p role="status" className="squircle-xl border border-brand-blue/40 bg-brand-blue/5 px-4 py-3 text-base">
          อันดับของฉัน: <b>#{data.me.rank}</b>{data.me.hidden ? ' (ถ้าแสดงชื่อ)' : ''} · {data.me.value} {tab.unit}{data.me.hidden ? ' · ชื่อคุณซ่อนอยู่ ไม่อยู่ในตาราง เห็นอันดับนี้คนเดียว' : ''}
        </p>
      )}

      {data.rows.length === 0 ? (
        <p className="squircle-2xl border border-dashed border-line p-8 text-center text-lg text-muted-foreground">ยังไม่มีใครในตารางนี้ เป็นคนแรกได้เลย</p>
      ) : (
        <ol className="grid gap-2" aria-label={`ตารางอันดับ ${tab.label}`}>{data.rows.map((r) => <Row key={r.userId} r={r} unit={tab.unit} board={board} />)}</ol>
      )}
      {data.total > data.rows.length && <p className="text-center text-sm text-muted-foreground">แสดง {data.rows.length} อันดับแรกจากทั้งหมด {data.total} คน</p>}

      <section aria-labelledby="leagues" className="grid gap-3 squircle-2xl border border-line bg-surface p-4 sm:p-5">
        <h2 id="leagues" className="font-display text-xl font-extrabold">ระดับนักบิน</h2>
        <p className="text-base text-muted-foreground">คุณอยู่ระดับ <b className="text-foreground">{league.name}</b> ({profile.xp} XP){next ? ` · อีก ${next.need} XP ถึง “${next.league.name}”` : ' · สูงสุดแล้ว'}</p>
        <ul className="flex flex-wrap gap-2">{LEAGUES.map((l) => <li key={l.id} className={`squircle-xl px-3 py-1.5 text-sm font-semibold ${l.tone} ${l.id === league.id ? 'ring-2 ring-brand-blue' : ''}`}>{l.name} · {l.min}+</li>)}</ul>
        <p className="text-sm text-muted-foreground">Top Server = 10 อันดับแรกของ XP รวมที่อยู่ระดับ “ปรมาจารย์” (800 XP) ขึ้นไป</p>
      </section>

      <BoardSettings displayName={profile.displayName} showOnBoard={profile.showOnBoard} />
    </main>
  );
}
