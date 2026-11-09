'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronRight, Keyboard, Layers, Lock, Menu, PanelRightClose, PlugZap, X } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { View } from './AssemblyDrone';
import { PartDialog } from './PartDialog';
import { labels, kindOf, prerequisites, sockets, whiteArm, type Kind } from './mounts';
import { partById, partGroups, type PartId } from './data';
import { WebGLNotice, useWebGL } from './webgl';

// Canvas ต้องสร้างฝั่งเบราว์เซอร์เท่านั้น (ไม่รอ SSR) ไม่งั้น R3F ปิด root ซ้อนตอน hydrate
const Workshop = dynamic(() => import('./AssemblyDrone').then(module => module.Workshop), { ssr: false });

const button = 'inline-flex min-h-10 items-center justify-center gap-2 squircle-xl border border-line bg-surface px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-45 aria-pressed:bg-emphasis aria-pressed:text-emphasis-foreground';
const views: { id: View; label: string; key: string }[] = [
  { id: 'free', label: 'อิสระ', key: '1' },
  { id: 'top', label: 'ด้านบน', key: '2' },
  { id: 'front', label: 'ด้านหน้า', key: '3' },
  { id: 'rear', label: 'ด้านหลัง', key: '4' },
  { id: 'bottom', label: 'ใต้ท้อง', key: '5' },
];
/** ลำดับที่แนะนำตอนประกอบ (ตามคู่มือหน้า 04–06) ชิ้นแรกที่ "พร้อมใส่" จะถูกเสนอเป็นขั้นต่อไป */
const ORDER: Kind[] = ['beam', 'bolt', 'bracket', 'pin', 'leg', 'leglock', 'motor', 'mscrew', 'battery', 'plug'];
const COACH_KEY = 'parts-coach-v1';

export function PartsLab() {
  const gl = useWebGL();
  const [crashed, setCrashed] = useState(false);
  const [assemble, setAssemble] = useState(false);
  const [powered, setPowered] = useState(false);
  const [view, setView] = useState<View>('free');
  const [lid, setLid] = useState(0);
  const [part, setPart] = useState<PartId | null>(null);
  const [focus, setFocus] = useState<PartId | null>(null);
  const [fitted, setFitted] = useState<string[]>([]);
  const [held, setHeld] = useState<Kind | null>(null);
  const [motorType, setMotorType] = useState<'white' | 'black'>('white');
  const [turn, setTurn] = useState(0);
  const [remove, setRemove] = useState(false);
  const [manual, setManual] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(true);
  const [hint, setHint] = useState('');
  const dragPoint = useRef<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const panelScroll = useRef<HTMLDivElement>(null);
  const no3d = gl === 'none' || crashed;

  useEffect(() => {
    setPanelOpen(window.innerWidth >= 640);
    try { if (localStorage.getItem(COACH_KEY) === '0') setCoachOpen(false); } catch { /* ไม่มี storage ก็ขึ้นทุกครั้ง */ }
  }, []);
  function setCoach(open: boolean) {
    setCoachOpen(open);
    try { localStorage.setItem(COACH_KEY, open ? '1' : '0'); } catch { /* ไม่เป็นไร */ }
  }
  // ข้อความช่วยตอนประกอบสำคัญกว่าความสะดวก: มีข้อความใหม่ก็เปิดกล่องให้อ่าน
  useEffect(() => { if (hint) setCoachOpen(true); }, [hint]);

  function toggleLid() {
    const next = lid ? 0 : 1;
    setLid(next);
    setView(next ? 'inner' : 'free');
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || part || manual) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === '?' || (event.key === '/' && event.shiftKey)) { event.preventDefault(); setShortcuts(true); return; }
      if (shortcuts) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < views.length) { setView(views[index].id); return; }
      const key = event.key.toLowerCase();
      if (key === 'e') { setAssemble(false); setHeld(null); setRemove(false); }
      if (key === 'a') { setAssemble(true); setHeld(null); setRemove(false); }
      if (key === 'l' && !assemble) toggleLid();
      if (key === 'p' && !assemble) setPart('ports');
      if (key === 'm') setManual(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function place(id: string) {
    if (remove) {
      if (fitted.some(other => prerequisites(other).includes(id))) { setHint('ถอดชิ้นที่ยึดทับอยู่ก่อน แล้วลองอีกครั้ง'); return; }
      setFitted(old => old.filter(value => value !== id));
      if (id === 'plug' || id === 'battery') setPowered(false);
      setHint(id === 'plug' ? 'ถอดหัวแบตแล้ว เครื่องดับแล้ว' : 'ถอดกลับแล้ว');
      return;
    }
    const kind = kindOf(id);
    if (kind !== held || fitted.includes(id) || !prerequisites(id).every(required => fitted.includes(required))) {
      setHint('เลือกชิ้นจากถาด แล้วแตะเครื่องหมาย + ที่ตรงกับชิ้นนั้น'); return;
    }
    if (kind === 'motor' && whiteArm(id) !== (motorType === 'white')) {
      setHint(motorType === 'white' ? 'ปลั๊กขาวต้องอยู่มุมที่มีจุดขาว' : 'ปลั๊กดำต้องอยู่มุมที่ไม่มีจุดขาว'); return;
    }
    if (turn && !['bolt', 'mscrew'].includes(kind)) { setHint('แนวชิ้นยังไม่ตรง หมุนกลับเป็น 0° แล้วลองใหม่'); return; }
    setFitted(old => [...old, id]);
    const stillOpen = sockets.some(socket => kindOf(socket) === kind && socket !== id && !fitted.includes(socket));
    if (!stillOpen) setHeld(null);
    setHint(id === 'battery' ? 'วางแบตแล้ว จับหัวสายที่อยู่กับแบตไปเสียบพอร์ตไฟ' : id === 'plug' ? 'เสียบแบตแล้ว กดเปิดเครื่องได้' : kind === 'motor' ? 'ติดตั้งชุดมอเตอร์ครบทั้งสาย ปลั๊ก ใบพัด และกรงครอบแล้ว' : stillOpen ? 'ติดตั้งแล้ว แตะ + จุดถัดไปได้เลย' : 'ติดตั้งครบชนิดนี้แล้ว เลือกชิ้นต่อไปได้');
  }

  function pick(kind: Kind, type?: 'white' | 'black') {
    setHeld(kind); setRemove(false);
    if (kind === 'motor' && type) setMotorType(type);
    if (kind === 'mscrew') setView('bottom');
    if (window.innerWidth < 640) setPanelOpen(false);
    if (kind !== held) setTurn(0);
    const ready = sockets.some(id => kindOf(id) === kind && !fitted.includes(id) && (!type || whiteArm(id) === (type === 'white')) && prerequisites(id).every(required => fitted.includes(required)));
    setHint(ready ? kind === 'mscrew' ? 'มุมมองพลิกลงใต้โดรนแล้ว · แตะปุ่ม + ขนาดใหญ่ตรงหัวน็อตบนคาน 11 รู' : kind === 'motor' ? type === 'white' ? 'ชุดทวนเข็มใส่ได้เฉพาะมุมที่มีจุดสีขาว' : 'ชุดตามเข็มใส่ได้เฉพาะมุมที่มีจุดสีดำ' : kind === 'leglock' ? 'พิน 32054 ล็อกแกนขา เป็นคนละชิ้นกับพิน 2780 ที่คาน 3 รู' : kind === 'pin' ? 'พิน 2780 ล็อกคาน 3 รูที่รูที่สาม นับจากด้านมอเตอร์' : 'หมุนหาจุด + แล้วแตะหรือลากชิ้นไปวาง' : lockedReason(kind) ?? 'ใส่ชิ้นส่วนก่อนหน้าให้ครบ แล้วจุดวางจะปรากฏ');
  }

  function selectMode(value: boolean) {
    setAssemble(value); setHeld(null); setRemove(false); setHint(''); setFocus(null);
    if (panelScroll.current) panelScroll.current.scrollTop = 0;
    if (!value) setPowered(false);
    else if (lid) { setLid(0); setView('free'); }
  }

  const remaining = (kind: Kind) => sockets.filter(id => kindOf(id) === kind && !fitted.includes(id)).length;
  const readyIds = (kind: Kind) => sockets.filter(id => kindOf(id) === kind && !fitted.includes(id) && prerequisites(id).every(required => fitted.includes(required)));
  const motorRemaining = (type: 'white' | 'black') => sockets.filter(id => kindOf(id) === 'motor' && whiteArm(id) === (type === 'white') && !fitted.includes(id)).length;
  /** ชนิดนี้ยังเหลือแต่ใส่ไม่ได้ เพราะขาดชิ้นก่อนหน้า → บอกว่าขาดอะไร */
  function lockedReason(kind: Kind, type?: 'white' | 'black') {
    const open = sockets.filter(id => kindOf(id) === kind && !fitted.includes(id) && (!type || whiteArm(id) === (type === 'white')));
    if (!open.length || open.some(id => prerequisites(id).every(required => fitted.includes(required)))) return null;
    const missing = prerequisites(open[0]).find(required => !fitted.includes(required));
    return missing ? `ใส่ ${labels[kindOf(missing)]} ก่อน` : null;
  }
  const nextKind = ORDER.find(kind => readyIds(kind).length > 0);
  const assemblyComplete = sockets.every(id => fitted.includes(id));
  const status = assemble
    ? hint || (assemblyComplete ? 'ประกอบโดรนครบแล้ว ไปทดลองเขียนโค้ดต่อได้เลย' : 'ทำตามการ์ด “ขั้นต่อไป” ในแผงขวา หรือเลือกชิ้นจากถาดเองก็ได้')
    : lid === 2 ? 'ชี้ที่บอร์ดเพื่อดูชื่อ คลิกเพื่ออ่านรายละเอียด กด “วาง Nano กลับ” เมื่อดูเสร็จ'
      : lid === 1 ? 'เปิดฝาแล้ว ชี้ที่บอร์ดเพื่อดูชื่อ คลิก Nano เพื่ออ่าน หรือกด “ยก Nano ดู FC” เพื่อดูบอร์ดข้างล่าง'
        : 'ชี้ที่ชิ้นส่วนบนโดรนเพื่อดูชื่อ · คลิกเพื่ออ่านรายละเอียด · ลากเพื่อหมุนลำ';

  function trayButton(kind: Kind, title: string, image: string, count: number, type?: 'white' | 'black') {
    const selected = held === kind && (kind !== 'motor' || motorType === type);
    const locked = count > 0 ? lockedReason(kind, type) : null;
    return <button key={type ?? kind} type="button" disabled={!count} aria-pressed={selected} className={'touch-none overflow-hidden squircle-xl border border-line bg-surface-2 text-left transition-colors hover:bg-canvas aria-pressed:border-brand-blue aria-pressed:bg-brand-blue/10 disabled:opacity-40 ' + (locked ? 'opacity-70' : '')} onClick={() => pick(kind, type)} onPointerDown={event => { pick(kind, type); start.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (start.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 5) dragPoint.current = { x: event.clientX, y: event.clientY }; }} onPointerCancel={() => { dragPoint.current = null; start.current = null; }} onPointerUp={event => { if (dragPoint.current) { const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-mount]'); if (target?.dataset.mount) place(target.dataset.mount); else setHint('ยังไม่ตรงจุดยึด หมุนดูแล้วแตะ + อีกครั้ง'); } dragPoint.current = null; start.current = null; }}><span className="grid h-20 place-items-center bg-canvas"><img src={`/parts-previews/${image}.png`} alt="" className="h-19 w-24 object-contain" draggable={false} /></span><span className="block px-2 py-1.5 text-xs font-bold leading-4">{title} <span className="text-muted-foreground">×{count}</span>{locked && <span className="mt-0.5 flex items-center gap-1 font-medium text-muted-foreground"><Lock className="size-3" aria-hidden />{locked}</span>}</span></button>;
  }

  const partItem = (id: PartId) => {
    const item = partById[id];
    return <li key={id}><button type="button" onClick={() => setPart(id)} onPointerEnter={() => setFocus(id)} onPointerLeave={() => setFocus(null)} onFocus={() => setFocus(id)} onBlur={() => setFocus(null)} aria-current={focus === id || undefined} className="flex min-h-12 w-full items-center gap-3 squircle-xl border border-line bg-surface-2 px-3 text-left transition-colors hover:border-brand-blue hover:bg-canvas aria-[current]:border-brand-blue aria-[current]:bg-canvas focus-visible:outline-2 focus-visible:outline-brand-blue"><span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-5">{item.name}</span><span className="block text-xs leading-4 text-muted-foreground">{item.label}</span></span><ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden /></button></li>;
  };

  const dialogs = <>
    <Dialog open={shortcuts} onOpenChange={setShortcuts}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"><DialogTitle>คีย์ลัดหน้าโต๊ะสำรวจ</DialogTitle><p className="text-sm text-muted-foreground">ใช้เมื่อไม่ได้พิมพ์ในช่องข้อมูล กด <kbd>?</kbd> เพื่อเปิดหน้านี้อีกครั้ง</p><div className="mt-3 grid gap-2">{[...views.map(item => [item.key, `มุมกล้อง ${item.label}`]), ['E', 'โหมดสำรวจ'], ['A', 'ลองประกอบ'], ['L', 'เปิดหรือปิดฝาในโหมดสำรวจ'], ['P', 'เปิดรายละเอียดพอร์ต'], ['M', 'เปิดภาพคู่มือ'], ['?', 'หน้ารวมคีย์ลัด']].map(([key, description]) => <div key={key} className="flex items-center justify-between gap-4 border-b border-line py-2 text-sm"><span>{description}</span><kbd className="min-w-9 squircle-xl border border-line bg-surface-2 px-2 py-1 text-center font-mono font-bold">{key}</kbd></div>)}</div></DialogContent></Dialog>
    <Dialog open={manual} onOpenChange={setManual}><DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-3xl"><DialogTitle>ภาพประกอบจากคู่มือ RCSA EDU</DialogTitle>{['1-motors', '2-attach', '3-battery'].map((page, index) => <img key={page} src={`/docs/manual-assembly-${page}.webp`} alt={['การประกอบมอเตอร์กับคาน', 'การยึดแขนเข้าลำตัว', 'ตำแหน่งแบตเตอรี่'][index]} className="w-full" />)}</DialogContent></Dialog>
    <PartDialog key={part || 'closed'} open={part !== null} partId={part} onOpenChange={open => { if (!open) setPart(null); }} onSelectPart={setPart} />
  </>;

  // ไม่มี WebGL: ยังอ่านเรื่องชิ้นส่วนได้ครบจากรายการ ส่วนลองประกอบต้องใช้ 3 มิติ
  if (no3d) {
    return <div className="parts-workbench h-dvh overflow-y-auto px-4 pb-12 pt-20 sm:px-8 sm:pt-24">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold text-brand-blue">RCSA EDU · ชิ้นส่วนโดรน</p>
        <h1 className="text-2xl font-extrabold sm:text-3xl">ชิ้นส่วนโดรน</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">อ่านหน้าที่ของแต่ละชิ้นได้ตามปกติ ส่วนโมเดล 3 มิติกับโหมดลองประกอบต้องเปิดในเบราว์เซอร์ที่มี WebGL</p>
        <div className="mt-4 max-w-xl"><WebGLNotice /></div>
        {partGroups.map(group => <section key={group.title} className="mt-8"><div className="flex items-baseline justify-between gap-3"><h2 className="text-lg font-extrabold">{group.title}</h2><span className="text-xs text-muted-foreground">{group.hint}</span></div><ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{group.ids.map(id => { const item = partById[id]; return <li key={id}><button type="button" onClick={() => setPart(id)} className="grid h-full w-full content-start gap-1 squircle-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-brand-blue hover:bg-surface-2"><span className="text-xs font-semibold text-brand-blue">{item.english}</span><span className="text-base font-bold leading-6">{item.name}</span><span className="text-sm leading-6 text-muted-foreground">{item.role}</span></button></li>; })}</ul></section>)}
      </div>
      {dialogs}
    </div>;
  }

  const stageInset = 'absolute inset-y-0 left-0 ' + (panelOpen ? 'right-0 sm:right-[25rem]' : 'right-0');

  return <div className="parts-workbench relative h-dvh overflow-hidden">
    <div className={stageInset}>
      {gl === 'ok' && <Workshop powered={powered} onLead={() => pick('plug')} assemble={assemble} view={view} lid={lid} installed={fitted} held={held} motorType={motorType} turn={turn} remove={remove} dragPoint={dragPoint} onMount={place} focusPart={focus} onCrash={() => setCrashed(true)} onPart={(id) => { if (id === 'cover' && lid === 0) toggleLid(); else setPart(id); }} />}
    </div>

    <div className={stageInset + ' pointer-events-none z-10'}>
      <div className="absolute inset-x-0 bottom-3 flex justify-center px-3 sm:bottom-5">
        <div role="toolbar" aria-label="มุมกล้องและฝาครอบ" className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 squircle-2xl border border-line bg-surface/95 p-1 shadow-lg backdrop-blur-sm">
          {views.map(item => <button key={item.id} type="button" aria-pressed={view === item.id} onClick={() => setView(item.id)} title={`มุม${item.label} · กด ${item.key}`} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 squircle-xl px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2 aria-pressed:bg-emphasis aria-pressed:text-emphasis-foreground">{item.label}<kbd className="hidden text-xs font-normal opacity-60 md:inline">{item.key}</kbd></button>)}
          {!assemble && <>
            <span className="mx-1 hidden h-6 w-px shrink-0 bg-line sm:block" aria-hidden />
            <button type="button" aria-pressed={lid > 0} onClick={toggleLid} title="เปิดหรือปิดฝาครอบ · กด L" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 squircle-xl px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2 aria-pressed:bg-brand-blue aria-pressed:text-background max-sm:w-full max-sm:justify-center"><Layers className="size-4" aria-hidden />{lid ? 'ปิดฝา' : 'เปิดฝาดูข้างใน'}<kbd className="hidden text-xs font-normal opacity-60 md:inline">L</kbd></button>
          </>}
        </div>
      </div>
    </div>

    <div className={'pointer-events-none absolute left-3 right-3 top-16 z-10 items-start justify-between gap-2 sm:left-6 sm:right-auto sm:top-20 ' + (panelOpen ? 'hidden sm:flex' : 'flex')}>
      <div className="pointer-events-auto max-w-[min(26rem,calc(100vw-1.5rem))] squircle-2xl border border-line bg-surface/95 px-4 py-3 text-foreground shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-brand-blue">RCSA EDU · โต๊ะสำรวจ 3D</p><h1 className="text-base font-extrabold leading-6 sm:text-lg">{assemble ? 'ลองประกอบโดรน' : 'สำรวจชิ้นส่วนโดรน'}</h1></div>
          <button type="button" onClick={() => setCoach(!coachOpen)} aria-expanded={coachOpen} aria-label={coachOpen ? 'ซ่อนคำแนะนำ' : 'แสดงคำแนะนำ'} className="-mr-1 grid size-9 shrink-0 place-items-center squircle-xl text-muted-foreground hover:bg-surface-2 hover:text-foreground">{coachOpen ? <X className="size-4" aria-hidden /> : <ChevronRight className="size-4 rotate-90" aria-hidden />}</button>
        </div>
        {coachOpen && <p role="status" className="mt-1.5 text-sm leading-6">{status}</p>}
      </div>
      {!panelOpen && <button type="button" onClick={() => setPanelOpen(true)} className={button + ' pointer-events-auto shrink-0 whitespace-nowrap shadow-lg'}><Menu className="size-4" aria-hidden /> {held ? `ถือ ${labels[held]}` : 'เครื่องมือ'}</button>}
    </div>

    {panelOpen && <aside aria-label="เครื่องมือสำรวจและประกอบโดรน" className="absolute bottom-3 right-3 top-16 z-20 flex w-[min(24rem,calc(100%-1.5rem))] flex-col overflow-hidden squircle-2xl border border-line bg-surface/95 text-foreground shadow-2xl backdrop-blur-md sm:bottom-4 sm:right-4 sm:top-20">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5"><div className="grid min-w-0 flex-1 grid-cols-2 gap-1 squircle-xl bg-surface-2 p-1"><button type="button" className={button} aria-pressed={!assemble} onClick={() => selectMode(false)}>สำรวจ <kbd className="hidden text-xs font-normal opacity-60 sm:inline">E</kbd></button><button type="button" className={button} aria-pressed={assemble} onClick={() => selectMode(true)}>ลองประกอบ <kbd className="hidden text-xs font-normal opacity-60 sm:inline">A</kbd></button></div><button type="button" onClick={() => setPanelOpen(false)} aria-label="ซ่อนแผงเครื่องมือ" className="grid size-10 shrink-0 place-items-center squircle-xl border border-line hover:bg-surface-2"><PanelRightClose className="size-4" aria-hidden /></button></div>
      <div ref={panelScroll} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
        {!assemble ? <>
          {lid > 0 && <section className="space-y-2 squircle-xl border border-brand-blue/40 bg-brand-blue/10 p-3"><p className="text-sm font-bold">กำลังดูข้างใน</p><p className="text-xs leading-5 text-muted-foreground">กรงและใบพัดจางลงเพื่อให้เห็นบอร์ด</p><div className="grid grid-cols-2 gap-2"><button type="button" className={button + ' text-xs'} onClick={() => setPart('nano')}>ดู Arduino Nano</button>{lid === 1 ? <button type="button" className={button + ' text-xs'} onClick={() => setLid(2)}>ยก Nano ดู FC</button> : <button type="button" className={button + ' text-xs'} onClick={() => setLid(1)}>วาง Nano กลับ</button>}</div><button type="button" className={button + ' w-full'} onClick={toggleLid}>ปิดฝา กลับสู่โดรนทั้งลำ</button></section>}
          <section aria-label="ชิ้นส่วนทั้งหมด"><h2 className="text-sm font-bold">ชิ้นส่วนในชุดนี้</h2><p className="mt-0.5 text-xs leading-5 text-muted-foreground">ชี้ที่รายการ ชิ้นนั้นจะสว่างบนโมเดล · คลิกเพื่ออ่านรายละเอียด</p>{partGroups.map(group => <div key={group.title} className="mt-3"><div className="flex items-baseline justify-between gap-2"><h3 className="text-xs font-bold">{group.title}</h3><span className="text-xs text-muted-foreground">{group.hint}</span></div><ul className="mt-1.5 space-y-1.5">{group.ids.map(partItem)}</ul></div>)}</section>
          {lid === 0 && <section className="space-y-2 squircle-xl border border-line bg-surface-2 p-3"><p className="text-sm font-bold">อยากดูบอร์ดข้างใน?</p><p className="text-xs leading-5 text-muted-foreground">เปิดฝาครอบลำตัว กล้องจะเลื่อนลงมองชั้นใน กรงใบพัดจะจางลงไม่ให้บัง</p><button type="button" className={button + ' w-full'} onClick={toggleLid}><Layers className="size-4" aria-hidden /> เปิดฝาดูข้างใน</button></section>}
        </> : <>
          <section className="space-y-2 squircle-xl border border-line bg-surface-2 p-3"><div className="flex items-center justify-between"><h2 className="text-sm font-bold">ความคืบหน้า</h2><strong className="text-sm">{fitted.length}/{sockets.length} จุด</strong></div><div className="h-2 overflow-hidden squircle-xl bg-line"><div className="h-full bg-brand-blue transition-[width]" style={{ width: `${100 * fitted.length / sockets.length}%` }} /></div></section>
          {nextKind && !assemblyComplete && <section className="space-y-2 squircle-xl border border-brand-blue/40 bg-brand-blue/10 p-3" aria-label="ขั้นต่อไป"><p className="text-xs font-bold text-brand-blue">ขั้นต่อไป</p><p className="text-sm font-bold leading-5">{labels[nextKind]}</p><p className="text-xs leading-5 text-muted-foreground">{nextKind === 'plug' ? 'จับหัวสายที่ห้อยจากแบตไปเสียบพอร์ตไฟด้านหลัง' : `ใส่ได้อีก ${readyIds(nextKind).length} จุด · รวมเหลือ ${remaining(nextKind)} จุด`}</p><button type="button" className={button + ' w-full bg-emphasis text-emphasis-foreground hover:opacity-90'} aria-pressed={held === nextKind} onClick={() => pick(nextKind, nextKind === 'motor' ? (whiteArm(readyIds('motor')[0]) ? 'white' : 'black') : undefined)}>{held === nextKind ? 'ถืออยู่ · แตะ + บนโมเดล' : 'หยิบชิ้นนี้'}</button></section>}
          <section className="space-y-2"><div className="flex items-center justify-between"><h2 className="text-sm font-bold">ถาดชิ้นส่วน</h2><span className="text-xs text-muted-foreground">หยิบแล้วใส่บนโมเดล</span></div><div className="grid grid-cols-2 gap-2">{(Object.keys(labels) as Kind[]).filter(kind => kind !== 'plug').flatMap(kind => kind === 'motor' ? [trayButton('motor', 'ชุดมอเตอร์ · ตามเข็ม', 'motor-cw', motorRemaining('black'), 'black'), trayButton('motor', 'ชุดมอเตอร์ · ทวนเข็ม', 'motor-ccw', motorRemaining('white'), 'white')] : [trayButton(kind, labels[kind], kind, remaining(kind))])}</div></section>
          {held && !['plug', 'motor', 'pin', 'leglock'].includes(held) && <button type="button" className={button + ' w-full'} onClick={() => setTurn(value => (value + 1) % 4)}>หมุนชิ้นที่ถือ · {turn * 90}°</button>}
          {assemblyComplete && <section role="status" className="space-y-3 squircle-xl border border-brand-blue/40 bg-brand-blue/10 p-4"><div><p className="text-xs font-bold text-brand-blue">ประกอบสำเร็จ</p><h3 className="mt-1 text-lg font-extrabold">โดรนพร้อมแล้ว</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">ต่อไปลองเขียนโปรแกรมควบคุม แล้วสั่งให้โดรนทำภารกิจแรก</p></div><Link href="/simulator" className={button + ' w-full bg-emphasis text-emphasis-foreground hover:opacity-90'}>ไปฝึกเขียนโค้ด</Link></section>}
          <div className="grid grid-cols-2 gap-2"><button type="button" className={button} aria-pressed={remove} onClick={() => { setRemove(!remove); setHeld(null); setHint(remove ? 'เลือกชิ้นจากถาด' : 'แตะชิ้นที่ติดตั้งเพื่อถอด'); }}>ถอดชิ้นส่วน</button><button type="button" className={button} disabled={!fitted.includes('plug')} aria-pressed={powered} onClick={() => { setPowered(!powered); setHint(powered ? 'ปิดเครื่องแล้ว' : 'ไฟสถานะติด เครื่องพร้อมทำงาน'); }}><PlugZap className="size-4" aria-hidden />{powered ? 'ปิดเครื่อง' : 'เปิดเครื่อง'}</button></div>
        </>}
        <div className="grid grid-cols-2 gap-2 border-t border-line pt-3"><button type="button" className={button} onClick={() => setManual(true)}><BookOpen className="size-4" aria-hidden /> ภาพคู่มือ</button><button type="button" className={button} onClick={() => setShortcuts(true)}><Keyboard className="size-4" aria-hidden /> คีย์ลัด ?</button></div>
      </div>
    </aside>}

    {dialogs}
  </div>;
}
