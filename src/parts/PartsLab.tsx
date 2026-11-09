'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Keyboard, Menu, PanelRightClose, PlugZap, Rotate3D } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Workshop, type View } from './AssemblyDrone';
import { PartDialog } from './PartDialog';
import { labels, kindOf, prerequisites, sockets, whiteArm, type Kind } from './mounts';
import { parts, type PartId } from './data';

const button = 'inline-flex min-h-10 items-center justify-center gap-2 squircle-xl border border-line bg-surface px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-45 aria-pressed:bg-emphasis aria-pressed:text-emphasis-foreground';
const views: { id: View; label: string; key: string }[] = [
  { id: 'free', label: 'อิสระ', key: '1' },
  { id: 'top', label: 'ด้านบน', key: '2' },
  { id: 'front', label: 'ด้านหน้า', key: '3' },
  { id: 'rear', label: 'ด้านหลัง', key: '4' },
  { id: 'bottom', label: 'ใต้ท้อง', key: '5' },
];
const partGroups: { title: string; ids: PartId[] }[] = [
  { title: 'ชิ้นที่มองเห็นจากภายนอก', ids: ['cover', 'motor', 'propeller', 'guard', 'frame', 'battery', 'camera', 'ports'] },
  { title: 'บอร์ดใต้ฝาครอบ', ids: ['nano', 'fc', 'esc'] },
  { title: 'เซ็นเซอร์ช่วยการบิน', ids: ['gyro', 'accel', 'barometer', 'lidar', 'flow'] },
];
export function PartsLab() {
  const [assemble, setAssemble] = useState(false);
  const [powered, setPowered] = useState(false);
  const [view, setView] = useState<View>('free');
  const [lid, setLid] = useState(0);
  const [part, setPart] = useState<PartId | null>(null);
  const [fitted, setFitted] = useState<string[]>([]);
  const [held, setHeld] = useState<Kind | null>(null);
  const [motorType, setMotorType] = useState<'white' | 'black'>('white');
  const [turn, setTurn] = useState(0);
  const [remove, setRemove] = useState(false);
  const [manual, setManual] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hint, setHint] = useState('');
  const dragPoint = useRef<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const panelScroll = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPanelOpen(window.innerWidth >= 640);
  }, []);

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
      if (key === 'l' && !assemble) setLid(value => value ? 0 : 1);
      if (key === 'p' && !assemble) setPart('ports');
      if (key === 'm') setManual(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [assemble, manual, part, shortcuts]);

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
    setHint(ready ? kind === 'mscrew' ? 'มุมมองพลิกลงใต้โดรนแล้ว · แตะปุ่ม + ขนาดใหญ่ตรงหัวน็อตบนคาน 11 รู' : kind === 'motor' ? type === 'white' ? 'ชุดทวนเข็มใส่ได้เฉพาะมุมที่มีจุดสีขาว' : 'ชุดตามเข็มใส่ได้เฉพาะมุมที่มีจุดสีดำ' : kind === 'leglock' ? 'พิน 32054 ล็อกแกนขา เป็นคนละชิ้นกับพิน 2780 ที่คาน 3 รู' : kind === 'pin' ? 'พิน 2780 ล็อกคาน 3 รูที่รูที่สาม นับจากด้านมอเตอร์' : 'หมุนหาจุด + แล้วแตะหรือลากชิ้นไปวาง' : 'ใส่ชิ้นส่วนก่อนหน้าให้ครบ แล้วจุดวางจะปรากฏ');
  }

  function selectMode(value: boolean) {
    setAssemble(value); setHeld(null); setRemove(false); setHint('');
    if (panelScroll.current) panelScroll.current.scrollTop = 0;
    if (!value) setPowered(false);
  }

  const remaining = (kind: Kind) => sockets.filter(id => kindOf(id) === kind && !fitted.includes(id)).length;
  const motorRemaining = (type: 'white' | 'black') => sockets.filter(id => kindOf(id) === 'motor' && whiteArm(id) === (type === 'white') && !fitted.includes(id)).length;
  const assemblyComplete = sockets.every(id => fitted.includes(id));
  const status = assemble ? hint || (assemblyComplete ? 'ประกอบโดรนครบแล้ว ไปทดลองเขียนโค้ดต่อได้เลย' : 'หยิบชิ้นจากถาด แล้วแตะ + ที่ตำแหน่งซึ่งพร้อมติดตั้ง') : lid === 2 ? 'แตะบอร์ดเพื่อเปิดรายละเอียด แล้วกดปิดฝาเมื่อต้องการกลับ' : lid === 1 ? 'แตะ Nano เพื่ออ่านรายละเอียด หรือกดยกบอร์ดเพื่อดู FC ด้านล่าง' : 'ชี้เพื่อดูชื่อชิ้นส่วน · แตะเพื่ออ่านรายละเอียด · ลากเพื่อหมุนลำ';

  function trayButton(kind: Kind, title: string, image: string, count: number, type?: 'white' | 'black') {
    const selected = held === kind && (kind !== 'motor' || motorType === type);
    return <button key={type ?? kind} type="button" disabled={!count} aria-pressed={selected} className="touch-none overflow-hidden squircle-xl border border-line bg-surface-2 text-left transition-colors hover:bg-canvas aria-pressed:border-brand-blue aria-pressed:bg-brand-blue/10 disabled:opacity-40" onClick={() => pick(kind, type)} onPointerDown={event => { pick(kind, type); start.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (start.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 5) dragPoint.current = { x: event.clientX, y: event.clientY }; }} onPointerCancel={() => { dragPoint.current = null; start.current = null; }} onPointerUp={event => { if (dragPoint.current) { const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-mount]'); if (target?.dataset.mount) place(target.dataset.mount); else setHint('ยังไม่ตรงจุดยึด หมุนดูแล้วแตะ + อีกครั้ง'); } dragPoint.current = null; start.current = null; }}><span className="grid h-20 place-items-center bg-canvas"><img src={`/parts-previews/${image}.png`} alt="" className="h-19 w-24 object-contain" draggable={false} /></span><span className="block px-2 py-1.5 text-xs font-bold leading-4">{title} <span className="text-muted-foreground">×{count}</span></span></button>;
  }

  return <div className="parts-workbench relative h-dvh overflow-hidden">
    <div className={'absolute inset-y-0 left-0 ' + (panelOpen ? 'right-0 sm:right-[25rem]' : 'right-0')}>
      <Workshop powered={powered} onLead={() => pick('plug')} assemble={assemble} view={view} lid={lid} installed={fitted} held={held} motorType={motorType} turn={turn} remove={remove} dragPoint={dragPoint} onMount={place} onPart={(id) => { if (id === 'cover' && lid === 0) setLid(1); else setPart(id); }} />
    </div>

    <div className={'pointer-events-none absolute left-3 right-3 top-16 z-10 items-start justify-between gap-2 sm:left-6 sm:right-auto sm:top-20 ' + (panelOpen ? 'hidden sm:flex' : 'flex')}>
      <div className="pointer-events-auto max-w-[min(26rem,70vw)] squircle-2xl border border-line bg-surface/95 px-4 py-3 text-foreground shadow-lg backdrop-blur-sm">
        <p className="text-xs font-semibold text-brand-blue">RCSA EDU · โต๊ะสำรวจ 3D</p>
        <h1 className="text-base font-extrabold leading-6 sm:text-lg">ชิ้นส่วนโดรนและลองประกอบ</h1>
        <p className="mt-1 hidden text-xs leading-5 text-muted-foreground sm:block">ชุดโดรนเพื่อการศึกษา · หมุนดู แตะชิ้นส่วน หรือหยิบไปประกอบ</p>
      </div>
      {!panelOpen && <button type="button" onClick={() => setPanelOpen(true)} className={button + ' pointer-events-auto shadow-lg'}><Menu className="size-4" aria-hidden /> {held ? `ถือ ${labels[held]}` : 'เครื่องมือ'}</button>}
    </div>

    <p role="status" className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[min(34rem,calc(100%-1.5rem))] squircle-xl border border-line bg-surface/95 px-4 py-2 text-xs leading-5 text-foreground shadow-md sm:bottom-5 sm:left-6">{status}</p>

    {panelOpen && <aside aria-label="เครื่องมือสำรวจและประกอบโดรน" className="absolute bottom-3 right-3 top-16 z-20 flex w-[min(24rem,calc(100%-1.5rem))] flex-col overflow-hidden squircle-2xl border border-line bg-surface/95 text-foreground shadow-2xl backdrop-blur-md sm:bottom-4 sm:right-4 sm:top-20">
      <div className="flex items-center justify-between border-b border-line px-4 py-3"><div><p className="text-xs font-semibold text-brand-blue">ห้องทดลอง</p><h2 className="text-base font-extrabold">{assemble ? 'ประกอบโดรน' : 'สำรวจโดรน'}</h2></div><button type="button" onClick={() => setPanelOpen(false)} aria-label="ซ่อนแผงเครื่องมือ" className="grid size-10 place-items-center squircle-xl border border-line hover:bg-surface-2"><PanelRightClose className="size-4" aria-hidden /></button></div>
      <div ref={panelScroll} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-1 squircle-xl bg-surface-2 p-1"><button type="button" className={button} aria-pressed={!assemble} onClick={() => selectMode(false)}>สำรวจ</button><button type="button" className={button} aria-pressed={assemble} onClick={() => selectMode(true)}>ลองประกอบ</button></div>

        <section aria-label="มุมกล้อง" className="space-y-2"><div className="flex items-center gap-2 text-sm font-bold"><Rotate3D className="size-4" aria-hidden /> หมุนดูจากมุมไหน</div><div className="grid grid-cols-5 gap-1">{views.map(item => <button key={item.id} type="button" aria-pressed={view === item.id} onClick={() => setView(item.id)} className="min-h-12 squircle-xl border border-line bg-surface-2 px-1 text-[11px] font-semibold hover:bg-canvas aria-pressed:bg-emphasis aria-pressed:text-emphasis-foreground"><span className="block">{item.label}</span><kbd className="text-[10px] opacity-60">{item.key}</kbd></button>)}</div></section>

        {!assemble ? <>
          <section className="space-y-2 squircle-xl border border-line bg-surface-2 p-3"><p className="text-sm font-bold">เปิดดูชั้นใน</p><p className="text-xs leading-5 text-muted-foreground">เปิดฝาแล้วแตะ Nano เพื่ออ่านรายละเอียด หรือยก Nano เพื่อดู FC ข้างใต้</p><button type="button" className={button + ' w-full'} onClick={() => setLid(lid ? 0 : 1)}>{lid ? 'ปิดฝา กลับสู่โดรนทั้งลำ' : 'เปิดฝาครอบลำตัว'}</button>{lid === 1 && <div className="grid grid-cols-2 gap-2"><button type="button" className={button + ' text-xs'} onClick={() => setPart('nano')}>ดู Arduino Nano</button><button type="button" className={button + ' text-xs'} onClick={() => setLid(2)}>ยก Nano ดู FC</button></div>}{lid === 2 && <button type="button" className={button + ' w-full'} onClick={() => setLid(1)}>วาง Nano กลับ</button>}</section>
          <section className="space-y-2"><div className="flex items-center justify-between"><h3 className="text-sm font-bold">ชิ้นส่วนที่อยากดู</h3><span className="text-xs text-muted-foreground">แตะแล้วเปิดโมเดลชิ้นเดียว</span></div><div className="space-y-1.5">{partGroups.map((group, index) => <details key={group.title} className="group squircle-xl border border-line bg-surface-2" open={index === 0}><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-xs font-bold [&::-webkit-details-marker]:hidden">{group.title}<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden /></summary><div className="grid grid-cols-2 gap-1.5 border-t border-line p-2">{group.ids.map(id => { const item = parts.find(part => part.id === id)!; return <button key={id} type="button" onClick={() => setPart(id)} className="min-h-10 squircle-xl border border-line bg-surface px-2 text-left text-xs font-semibold hover:bg-canvas">{item.name}</button>; })}</div></details>)}</div></section>
        </> : <>
          <section className="space-y-2 squircle-xl border border-line bg-surface-2 p-3"><div className="flex items-center justify-between"><h3 className="text-sm font-bold">สถานะการประกอบ</h3><strong className="text-sm">{fitted.length}/{sockets.length} จุด</strong></div><div className="h-2 overflow-hidden squircle-xl bg-line"><div className="h-full bg-brand-blue" style={{ width: `${100 * fitted.length / sockets.length}%` }} /></div><p className="text-xs leading-5 text-muted-foreground">เลือกชิ้นส่วนก่อน แล้วแตะเครื่องหมาย + ที่โมเดล ชิ้นที่พร้อมใส่จะมีจุดให้เลือก</p></section>
          <section className="space-y-2"><div className="flex items-center justify-between"><h3 className="text-sm font-bold">ถาดชิ้นส่วน</h3><span className="text-xs text-muted-foreground">หยิบแล้วใส่บนโมเดล</span></div><div className="grid grid-cols-2 gap-2">{(Object.keys(labels) as Kind[]).filter(kind => kind !== 'plug').flatMap(kind => kind === 'motor' ? [trayButton('motor', 'ชุดมอเตอร์ · ตามเข็ม', 'motor-cw', motorRemaining('black'), 'black'), trayButton('motor', 'ชุดมอเตอร์ · ทวนเข็ม', 'motor-ccw', motorRemaining('white'), 'white')] : [trayButton(kind, labels[kind], kind, remaining(kind))])}</div></section>
          {held && !['plug', 'motor', 'pin', 'leglock'].includes(held) && <button type="button" className={button + ' w-full'} onClick={() => setTurn(value => (value + 1) % 4)}>หมุนชิ้นที่ถือ · {turn * 90}°</button>}
          {assemblyComplete && <section role="status" className="space-y-3 squircle-xl border border-brand-blue/40 bg-brand-blue/10 p-4"><div><p className="text-xs font-bold text-brand-blue">ประกอบสำเร็จ</p><h3 className="mt-1 text-lg font-extrabold">โดรนพร้อมแล้ว 🎉</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">ต่อไปลองเขียนโปรแกรมควบคุม แล้วสั่งให้โดรนทำภารกิจแรก</p></div><Link href="/simulator" className={button + ' w-full bg-emphasis text-emphasis-foreground hover:opacity-90'}>ไปฝึกเขียนโค้ด</Link></section>}
          <div className="grid grid-cols-2 gap-2"><button type="button" className={button} aria-pressed={remove} onClick={() => { setRemove(!remove); setHeld(null); setHint(remove ? 'เลือกชิ้นจากถาด' : 'แตะชิ้นที่ติดตั้งเพื่อถอด'); }}>ถอดชิ้นส่วน</button><button type="button" className={button} disabled={!fitted.includes('plug')} aria-pressed={powered} onClick={() => { setPowered(!powered); setHint(powered ? 'ปิดเครื่องแล้ว' : 'ไฟสถานะติด เครื่องพร้อมทำงาน'); }}><PlugZap className="size-4" aria-hidden />{powered ? 'ปิดเครื่อง' : 'เปิดเครื่อง'}</button></div>
        </>}
        <div className="grid grid-cols-2 gap-2 border-t border-line pt-3"><button type="button" className={button} onClick={() => setManual(true)}><BookOpen className="size-4" aria-hidden /> ภาพคู่มือ</button><button type="button" className={button} onClick={() => setShortcuts(true)}><Keyboard className="size-4" aria-hidden /> คีย์ลัด ?</button></div>
      </div>
    </aside>}

    <Dialog open={shortcuts} onOpenChange={setShortcuts}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"><DialogTitle>คีย์ลัดหน้าโต๊ะสำรวจ</DialogTitle><p className="text-sm text-muted-foreground">ใช้เมื่อไม่ได้พิมพ์ในช่องข้อมูล กด <kbd>?</kbd> เพื่อเปิดหน้านี้อีกครั้ง</p><div className="mt-3 grid gap-2">{[...views.map(item => [item.key, `มุมกล้อง ${item.label}`]), ['E', 'โหมดสำรวจ'], ['A', 'ลองประกอบ'], ['L', 'เปิดหรือปิดฝาในโหมดสำรวจ'], ['P', 'เปิดรายละเอียดพอร์ต'], ['M', 'เปิดภาพคู่มือ'], ['?', 'หน้ารวมคีย์ลัด']].map(([key, description]) => <div key={key} className="flex items-center justify-between gap-4 border-b border-line py-2 text-sm"><span>{description}</span><kbd className="min-w-9 squircle-xl border border-line bg-surface-2 px-2 py-1 text-center font-mono font-bold">{key}</kbd></div>)}</div></DialogContent></Dialog>
    <Dialog open={manual} onOpenChange={setManual}><DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-3xl"><DialogTitle>ภาพประกอบจากคู่มือ RCSA EDU</DialogTitle>{['1-motors', '2-attach', '3-battery'].map((page, index) => <img key={page} src={`/docs/manual-assembly-${page}.webp`} alt={['การประกอบมอเตอร์กับคาน', 'การยึดแขนเข้าลำตัว', 'ตำแหน่งแบตเตอรี่'][index]} className="w-full" />)}</DialogContent></Dialog>
    <PartDialog key={part || 'closed'} open={part !== null} partId={part} onOpenChange={open => { if (!open) setPart(null); }} onSelectPart={setPart} />
  </div>;
}
