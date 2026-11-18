'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CodeEditor } from '@/components/CodeEditor';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { BattleField, TapePlayer } from './BattleField';
import { BattleRequestError, battleApi, battleRequest, flightLabel, seconds } from './client';
import { deadline, MAX_CODE, START_WINDOW } from './rules';
import { CLOCKS, FORMATS, type RoomView, type Tape } from './types';
import type { compileBattle } from './flight';

type ActionResult = { compile?: ReturnType<typeof compileBattle>; tape?: Tape; savedAt?: number; deleted?: boolean };
const emptyCode = { draft: '', key: null as number | null };

export function BattleRoom({ code, initialRole }: { code: string; initialRole: 'pilot' | 'watch' }) {
  const router = useRouter();
  const url = `${battleApi}/${code}`;
  const [room, setRoom] = useState<RoomView | null>(null);
  const [joinNeeded, setJoinNeeded] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState(initialRole);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState('');
  const [compile, setCompile] = useState<ActionResult['compile']>();
  const [practice, setPractice] = useState<Tape>();
  const [practiceSerial, setPracticeSerial] = useState(0);
  const [editor, setEditor] = useState(emptyCode);
  const [pair, setPair] = useState(['', '']);
  const [replay, setReplay] = useState('');
  const [replayAt, setReplayAt] = useState(0);
  const [split, setSplit] = useState(50);
  const [mobileField, setMobileField] = useState(0);
  const [confirm, setConfirm] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clock, setClock] = useState(0);
  const dirty = useRef(false);
  const current = useRef<RoomView | null>(null);
  const saving = useRef(false);
  const acknowledged = useRef(0);
  const editorRef = useRef(editor);

  const refresh = useCallback(async () => {
    try {
      const query = replay ? '?' + new URLSearchParams({ replay, at: String(replayAt) }) : '';
      const data = await battleRequest<RoomView>(url + query);
      if (current.current && data.serverNow < current.current.serverNow) return;
      current.current = data;
      setRoom(data);
      setJoinNeeded(false);
      setConnection('');
      if ((!dirty.current || !data.me.canEdit) && data.me.savedAt >= acknowledged.current) {
        if (!data.me.canEdit) dirty.current = false;
        const next = { draft: data.me.draft, key: data.me.key };
        editorRef.current = next;
        setEditor(previous => previous.draft === next.draft && previous.key === next.key ? previous : next);
      }
      setClock(data.serverNow);
    } catch (error) {
      if (error instanceof BattleRequestError && error.status === 403) setJoinNeeded(true);
      else setConnection(error instanceof Error ? error.message : 'เชื่อมต่อห้องไม่ได้');
    }
  }, [replay, replayAt, url]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      await refresh();
      if (cancelled) return;
      const state = current.current;
      const active = state?.status === 'active';
      timer = setTimeout(poll, active ? 650 : 1800);
    }
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [refresh]);

  useEffect(() => {
    if (!room) return;
    const origin = performance.now();
    const timer = setInterval(() => setClock(room.serverNow + performance.now() - origin), 200);
    return () => clearInterval(timer);
  }, [room]);

  const editable = room?.me.canEdit ?? false;
  const savingDeadline = room ? deadline(room) : null;
  useEffect(() => {
    if (!editable || !dirty.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const flush = async () => {
      if (cancelled || !dirty.current) return;
      if (saving.current) { timer = setTimeout(flush, 150); return; }
      saving.current = true;
      const original = editorRef.current;
      try {
        const saved = await battleRequest<ActionResult>(url, { action: 'save', ...original });
        acknowledged.current = Math.max(acknowledged.current, saved.savedAt ?? 0);
        if (original === editorRef.current) dirty.current = false;
      } catch (error) {
        setError(error instanceof Error ? error.message : 'บันทึกโค้ดไม่สำเร็จ');
        if (!cancelled && !(error instanceof BattleRequestError && error.status === 409)) timer = setTimeout(flush, 2000);
      } finally { saving.current = false; }
    };
    timer = setTimeout(flush, savingDeadline !== null && savingDeadline - Date.now() < 2000 ? 0 : 450);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [editor, editable, savingDeadline, url]);

  function edit(next: typeof editor) {
    if (next.draft.length > MAX_CODE) {
      setError('โค้ดยาวเกิน 20,000 ตัวอักษร');
      return;
    }
    dirty.current = true;
    editorRef.current = next;
    setEditor(next);
    setCompile(undefined);
  }

  async function send(action: object) {
    setPending(true);
    setError('');
    try {
      const result = await battleRequest<ActionResult>(url, action);
      if (result.compile) setCompile(result.compile);
      if (result.savedAt !== undefined) acknowledged.current = Math.max(acknowledged.current, result.savedAt);
      if (result.tape) { setPractice(result.tape); setPracticeSerial(serial => serial + 1); }
      if (result.deleted) { router.replace('/battle'); return; }
      if (!('action' in action) || action.action !== 'compile') await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'ทำรายการไม่สำเร็จ');
    } finally { setPending(false); }
  }

  async function join(event: FormEvent) {
    event.preventDefault();
    await send({ action: 'join', name, role });
  }

  if (!room) return <Card className="mx-auto grid max-w-md gap-4 squircle-3xl p-5">
    <h1 className="text-xl font-bold">ห้องแข่ง {code}</h1>
    {joinNeeded ? <form onSubmit={join} className="grid gap-3">
      <Field><FieldLabel htmlFor="battle-member-name">ชื่อในห้อง</FieldLabel><Input id="battle-member-name" required maxLength={36} value={name} onChange={event => setName(event.target.value)} /></Field>
      <Field><FieldLabel htmlFor="battle-member-role">เข้ามาทำอะไร</FieldLabel><NativeSelect id="battle-member-role" className="w-full" value={role} onChange={event => setRole(event.target.value === 'pilot' ? 'pilot' : 'watch')}><NativeSelectOption value="pilot">ลงแข่ง</NativeSelectOption><NativeSelectOption value="watch">ดูสด</NativeSelectOption></NativeSelect></Field>
      <Button type="submit" disabled={pending}>เข้าร่วม</Button>
    </form> : <p role="status" className="text-muted-foreground">{connection || 'กำลังเปิดห้อง…'}</p>}
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <Link href={`/login?next=/battle/${code}`} className="text-sm underline">ล็อกอินเพื่อกลับด้วยบัญชีเดิมหรือแข่งเก็บแต้ม</Link>
    <Link href="/battle" className="underline">กลับหน้า Battle</Link>
  </Card>;

  const host = room.owner === room.me.id;
  const match = room.active;
  const seat = match?.seats.find(seat => seat.member === room.me.id);
  const until = deadline(room);
  const writing = room.prepAt === null ? null : (room.me.stoppedAt ?? Math.min(clock, until ?? clock)) - room.prepAt;
  const available = room.status === 'active' && seat?.opensAt != null && clock >= seat.opensAt && clock < seat.opensAt + START_WINDOW && seat.startedAt === null && seat.endsAt === null;
  const readyForPair = room.members.filter(member => member.role === 'pilot' && member.ready);
  const memberName = (id: string) => room.members.find(member => member.id === id)?.name ?? 'ผู้แข่ง';
  const final = room.settings.format === 'final';
  const awards = ['ชนะเลิศ', 'รองชนะเลิศอันดับ 1', 'รองชนะเลิศอันดับ 2', 'ชมเชย', 'ชมเชย'];
  const bothFields = room.settings.flight === 'parallel' && match?.seats.length === 2;
  const showing = bothFields ? match.seats : match?.seats.filter(seat => seat.startedAt !== null && seat.endsAt === null).slice(0, 1)
    ?? [];
  const fallback = match?.seats.find(seat => seat.opensAt !== null && seat.endsAt === null) ?? match?.seats.at(-1);
  const fields = showing.length ? showing : fallback ? [fallback] : [];
  const maxReplay = Math.max(...Object.values(room.playback).map(tape => tape.duration), 0);

  return <div className="grid gap-4">
    <Card className="grid gap-3 squircle-3xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Link href="/battle" className="text-sm underline">ห้องแข่งโดรน</Link><h1 className="text-2xl font-bold">{room.scenario.title}</h1></div>
        <Button variant="outline" onClick={async () => {
          try { await navigator.clipboard.writeText(location.href); setCopied(true); }
          catch { setError('คัดลอกไม่ได้ ใช้รหัสห้องด้านล่างเพื่อเชิญเพื่อนได้'); }
        }}>{copied ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์ห้อง'}</Button>
      </div>
      <p className="text-sm">รหัส <b className="font-mono">{code}</b> · {FORMATS[room.settings.format]} · {flightLabel[room.settings.flight]} · {CLOCKS[room.settings.clock]}</p>
      <p className="text-sm text-muted-foreground">ระดับ {({ easy: 'ง่าย', medium: 'ปานกลาง', hard: 'ยาก' })[room.settings.difficulty]} · ไฟเพดาน {room.settings.ceilingLights.some(Boolean) ? 'เปิด' : 'ปิด'} · ไฟมุม {room.settings.lights.filter(light => light.enabled).length} ดวง · ทดลองได้ {room.settings.practices} รอบ</p>
      {room.me.role === 'watch' && until !== null && clock < until && room.status === 'active' &&
        <p className="tabular-nums text-sm">ช่วงเขียนโค้ดเหลือ {seconds(until - clock)}</p>}
      {room.scenario.briefHtml && <Collapsible>
        <CollapsibleTrigger render={<Button variant="outline" size="sm" />}>อ่านโจทย์และเกณฑ์ให้คะแนน</CollapsibleTrigger>
        <CollapsibleContent className="rich mt-2" dangerouslySetInnerHTML={{ __html: room.scenario.briefHtml }} />
      </Collapsible>}
      {room.settings.clock === 'stopwatch' && <p className="text-sm text-muted-foreground">กดหยุดเพื่อล็อกโค้ด ถ้าคะแนนเท่ากัน คนที่เขียนเสร็จก่อนจะได้เปรียบ</p>}
      {room.settings.ranked && <p className="text-sm">กดพร้อมเพื่อยืนยันเก็บแต้ม Battle เมื่อผู้แข่งทั้งคู่ล็อกอิน</p>}
      <p className="text-sm text-muted-foreground">ถ้าเจ้าของเก็บห้อง สมาชิกที่อยู่ในห้องจะเปิดดูโค้ดที่ส่งแข่งย้อนหลังได้</p>
      {connection && <p role="status">กำลังเชื่อมต่อใหม่ · {connection}</p>}
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    </Card>

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <main className="grid min-w-0 content-start gap-4">
        {room.status === 'closed' && <Alert><AlertDescription>เจ้าของปิดห้องแล้ว</AlertDescription></Alert>}
        {match?.wheelAt != null && clock < match.wheelAt + 2200 && <Card className="flex flex-row flex-wrap items-center gap-4 squircle-3xl p-4" role="status">
          <div aria-hidden className="relative">
            <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 text-sm">▼</div>
            <div className="grid size-24 grid-rows-2 overflow-hidden rounded-full border-2 border-line motion-safe:animate-spin">
              {[...match.seats].sort((a, b) => memberName(a.member).localeCompare(memberName(b.member), 'th')).map((seat, index) =>
                <div key={seat.member} className={`grid min-w-0 place-items-center truncate px-2 text-xs ${index ? 'bg-emphasis text-emphasis-foreground' : 'bg-surface-2'}`}>{memberName(seat.member)}</div>)}
            </div>
          </div>
          กงล้อสุ่มลำดับบิน
        </Card>}
        {match?.wheelAt != null && clock >= match.wheelAt + 2200 && <p className="text-sm">ลำดับบิน · {match.seats.map(seat => memberName(seat.member)).join(' → ')}</p>}
        {match && room.status !== 'closed' && <>
          <div className="grid grid-cols-2 gap-2">
            {match.seats.map((seat, index) => <Button key={seat.member} variant={mobileField === index ? 'default' : 'outline'} onClick={() => setMobileField(index)} className="lg:pointer-events-none">
              {memberName(seat.member)} · {room.playback[seat.member]?.score ?? seat.result?.score ?? 0} คะแนน
            </Button>)}
          </div>
          {bothFields && <div className="hidden items-center gap-3 text-sm lg:flex"><span id="battle-split">แบ่งหน้าจอซ้าย–ขวา</span><Slider className="max-w-40" aria-labelledby="battle-split" min={30} max={70} value={[split]} onValueChange={value => setSplit(typeof value === "number" ? value : value[0])} /></div>}
          <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,var(--battle-left))_minmax(0,1fr)]" style={bothFields ? { '--battle-left': `${split}%` } as React.CSSProperties : { gridTemplateColumns: 'minmax(0,1fr)' }}>
            {fields.map((seat, index) => <div key={seat.member} className={bothFields && mobileField !== index ? 'hidden min-w-0 lg:block' : 'min-w-0'}>
              <BattleField scenario={room.scenario} settings={room.settings} flight={room.playback[seat.member]} title={memberName(seat.member)} />
            </div>)}
          </div>
        </>}
        {room.me.role === 'pilot' && room.status !== 'closed' && room.status !== 'archived' && <Card className="grid min-w-0 gap-3 squircle-3xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">โค้ดของคุณ</h2>
            <p className="text-sm tabular-nums">
              {writing !== null && `เขียนไป ${seconds(writing)} · `}
              {room.me.stoppedAt === null && until !== null && `เหลือ ${seconds(until - clock)} · `}
              ทดลองได้อีก {Math.max(0, room.settings.practices - room.me.practices)} รอบ
            </p>
          </div>
          {room.me.canEdit ? <CodeEditor value={editor.draft} onChange={code => edit({ ...editor, draft: code })} label="โค้ด Battle" rows={11} showQuick={false} />
            : room.prepAt !== null ? <pre className="max-h-48 overflow-auto whitespace-pre-wrap squircle-xl bg-surface-2 p-3 text-xs">{editor.draft || 'ยังไม่มีโค้ด'}</pre>
              : <p className="text-sm text-muted-foreground">รอเจ้าของเริ่มจับเวลาเขียนโค้ด</p>}
          {compile?.keys.length ? <Field><FieldLabel htmlFor="battle-key">ปุ่มที่ให้รัน</FieldLabel><NativeSelect id="battle-key" className="w-full" disabled={!room.me.canEdit} value={editor.key ?? ''} onChange={event => edit({ ...editor, key: event.target.value ? Number(event.target.value) : null })}>
            <NativeSelectOption value="">ใช้ KEY ตัวแรก</NativeSelectOption>{compile.keys.map(key => <NativeSelectOption key={key.key} value={key.key}>KEY {key.key} · {key.functionName}()</NativeSelectOption>)}
          </NativeSelect></Field> : null}
          <div className="flex flex-wrap gap-2">
            {room.prepAt !== null && <Button variant="outline" disabled={pending} onClick={() => void send({ action: 'compile', ...editor })}>ตรวจโค้ด</Button>}
            {room.prepAt !== null && <Button variant="outline" disabled={pending || !room.me.canPractice} onClick={() => void send({ action: 'practice', id: crypto.randomUUID(), ...editor })}>ทดลองบิน</Button>}
            {room.me.canEdit && room.settings.clock !== 'fixed' && <Button disabled={pending} onClick={() => void send({ action: 'stop', ...editor })}>{room.settings.clock === 'stopwatch' ? 'หยุดเวลาเขียนและล็อก' : 'เขียนเสร็จแล้ว ล็อกโค้ด'}</Button>}
            {available && <Button disabled={pending} onClick={() => void send({ action: 'start', matchId: match!.id })}>เริ่มบิน · {seconds(seat!.opensAt! + START_WINDOW - clock)}</Button>}
          </div>
          {compile && <div role="status" className={compile.ok ? 'text-sm' : 'text-sm text-destructive'}>
            {compile.ok ? 'โค้ดผ่านการตรวจแล้ว' : <ul className="list-disc pl-5">{compile.errors.map(error => <li key={error}>{error}</li>)}</ul>}
          </div>}
          {room.me.stoppedAt !== null && <p className="text-sm text-muted-foreground">ล็อกโค้ดแล้ว {available ? 'กดเริ่มเมื่อพร้อม' : 'รอคิวบินหรือดูผลได้'}</p>}
          {practice && <TapePlayer key={practiceSerial} tape={practice} title="สนามซ้อมของคุณ" scenario={room.scenario} settings={room.settings} />}
        </Card>}
        {room.status === 'archived' && <Card className="grid min-w-0 gap-3 squircle-3xl p-4 sm:p-5">
          <h2 className="font-bold">ดูย้อนหลัง</h2>
          <Field><FieldLabel htmlFor="battle-replay">เที่ยวบิน</FieldLabel><NativeSelect id="battle-replay" className="w-full" value={replay || match?.id || ''} onChange={event => { setReplay(event.target.value); setReplayAt(0); }}>
            {room.history.map((item, index) => <NativeSelectOption key={item.id} value={item.id}>รอบ {index + 1} · {item.seats.map(seat => memberName(seat.member)).join(' / ')}</NativeSelectOption>)}
          </NativeSelect></Field>
          {maxReplay > 0 && <div className="grid gap-2"><span id="battle-replay-time">เวลาในเที่ยวบิน {seconds(replayAt)}</span><Slider aria-labelledby="battle-replay-time" min={0} max={maxReplay} step={100} value={[replayAt]} onValueChange={value => {
            if (match) setReplay(match.id);
            setReplayAt(typeof value === "number" ? value : value[0]);
          }} /></div>}
          {match?.seats.map(seat => <Collapsible key={seat.member}><CollapsibleTrigger render={<Button variant="outline" size="sm" />}>{memberName(seat.member)} · โค้ดที่ใช้แข่ง</CollapsibleTrigger><CollapsibleContent><pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap squircle-xl bg-surface-2 p-3 text-xs">{seat.code || 'ไม่มีโค้ดที่ส่ง'}</pre></CollapsibleContent></Collapsible>)}
        </Card>}
      </main>

      <aside className="grid min-w-0 content-start gap-4">
        <Card className="grid min-w-0 gap-3 squircle-3xl p-4 sm:p-5">
          <h2 className="font-bold">คนในห้อง</h2>
          <ul className="divide-y divide-line">{room.members.map(member => <li key={member.id} className="flex justify-between gap-2 py-2 text-sm"><span className="break-all">{member.name}{member.id === room.owner ? ' · เจ้าของ' : ''}</span><span>{member.role === 'watch' ? 'ดูสด' : member.ready ? 'พร้อม' : 'รอพร้อม'}</span></li>)}</ul>
          {room.status === 'lobby' && room.me.role === 'pilot' && <Button disabled={pending} onClick={() => void send({ action: 'ready', value: !room.me.ready })}>{room.me.ready ? 'ยกเลิกพร้อม' : 'พร้อมแข่ง'}</Button>}
          {host && (room.status === 'lobby' || (room.settings.format === 'pairs' && room.status === 'active' && match?.finishedAt != null)) && <>
            {room.settings.format === 'pairs' && pair.map((id, index) => <Field key={index}><FieldLabel htmlFor={`battle-pair-${index}`}>ผู้แข่งคนที่ {index + 1}</FieldLabel><NativeSelect id={`battle-pair-${index}`} className="w-full" value={id} onChange={event => setPair(previous => previous.map((value, slot) => slot === index ? event.target.value : value))}>
              <NativeSelectOption value="">เลือกจากคนที่พร้อม</NativeSelectOption>{readyForPair.map(item => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}
            </NativeSelect></Field>)}
            <Button disabled={pending} onClick={() => void send({ action: 'begin', ...(room.settings.format === 'pairs' ? { pair } : {}) })}>{room.prepAt === null ? 'เปิดเวลาเขียนโค้ด' : 'เรียกคู่ถัดไป'}</Button>
          </>}
        </Card>
        {!!room.queue.length && <Card className="grid min-w-0 gap-2 squircle-3xl p-4 sm:p-5">
          <h2 className="font-bold">คิวถัดไป</h2>
          <ol className="grid gap-1 text-sm">{room.queue.map((entry, index) =>
            <li key={entry.join(':')}>{index + 1}. {entry.map(memberName).join(' พบ ')}</li>)}</ol>
        </Card>}
        {!!room.standings.length && <Card className="grid min-w-0 gap-2 squircle-3xl p-4 sm:p-5">
          <h2 className="font-bold">ผลการแข่งขัน</h2>
          <ol className="divide-y divide-line">{room.standings.map(row => <li key={row.member} className="py-2 text-sm">
            <b>{row.rank}. {memberName(row.member)}</b>{final && room.status !== 'active' && awards[row.rank - 1] && <div>{awards[row.rank - 1]}</div>}
            <div>{row.finish.score} คะแนน · {row.finish.dnf ? 'บินไม่จบ' : seconds(row.finish.totalMs)}</div>
            {room.settings.clock === 'stopwatch' && <div>เขียนโค้ด {seconds(row.finish.writingMs)}</div>}
            {row.finish.exitMs !== null && <div>ออกจากฐาน {seconds(row.finish.exitMs)}</div>}
          </li>)}</ol>
          {match?.rating && <p className="text-sm">{match.seats.map((seat, i) => `${memberName(seat.member)} ${match.rating![i] >= 0 ? '+' : ''}${match.rating![i]}`).join(' · ')}</p>}
        </Card>}
        {host && <Card className="grid min-w-0 gap-2 squircle-3xl p-4 sm:p-5">
          <h2 className="font-bold">จัดการห้อง</h2>
          {match?.finishedAt != null && room.status !== 'archived' && <Button variant="outline" disabled={pending} onClick={() => void send({ action: 'archive' })}>เก็บห้องและผลย้อนหลัง</Button>}
          {room.status !== 'closed' && room.status !== 'archived' && <Button variant="outline" disabled={pending} onClick={() => void send({ action: 'close' })}>ปิดห้อง</Button>}
          <Button variant="outline" onClick={() => setShowDelete(!showDelete)}>ลบห้อง</Button>
          {showDelete && <form className="grid gap-2" onSubmit={event => { event.preventDefault(); void send({ action: 'delete', confirm }); }}>
            <Field><FieldLabel htmlFor="battle-confirm">พิมพ์ {code} เพื่อยืนยัน</FieldLabel><Input id="battle-confirm" value={confirm} onChange={event => setConfirm(event.target.value.toUpperCase())} /></Field>
            <Button variant="destructive" disabled={pending || confirm !== code}>ยืนยันลบห้องและโค้ด</Button>
          </form>}
        </Card>}
      </aside>
    </div>
  </div>;
}
