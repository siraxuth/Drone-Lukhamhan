'use client';

import { useMemo, useRef, useState } from 'react';
import { Copy, Flag, Target as TargetIcon, Trash2, Circle, Disc3, MousePointer2, RectangleVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BaseStartLayer, ScenePlanLayer } from '@/field/ScenePlan';
import { baseAt, cellName, OBJECT_LABEL, PATTERNS, startOf, type BaseSpec, type ScenarioConfig, type SceneObject } from '@/lib/scenarios';
import { currentSeason } from '@/rules';

const SNAPS = [{ v: 0, label: 'อิสระ' }, { v: 0.25, label: '25 ซม.' }, { v: 0.5, label: '50 ซม.' }, { v: 1, label: '1 ม. (กลางช่อง)' }];
const ADD: Array<{ type: SceneObject['type']; Icon: typeof Flag }> = [
  { type: 'waypoint', Icon: Flag }, { type: 'hoop', Icon: RectangleVertical }, { type: 'platform', Icon: Disc3 }, { type: 'balloon', Icon: Circle }, { type: 'target', Icon: TargetIcon },
];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const HEADINGS = [{ yaw: 0, label: 'เหนือ', arrow: '↑' }, { yaw: 90, label: 'ตะวันออก', arrow: '→' }, { yaw: 180, label: 'ใต้', arrow: '↓' }, { yaw: 270, label: 'ตะวันตก', arrow: '←' }];
const BASE_MODES: Array<{ mode: BaseSpec['mode']; label: string; text: string }> = [
  { mode: 'start', label: 'ฐานอยู่ที่จุดเริ่ม', text: 'โดรนเริ่มบนแท่นเขียว ลงจอดกลับที่เดิมแล้วหยุดเวลา (แบบสนามแข่งจริง)' },
  { mode: 'custom', label: 'ฐานอยู่ที่อื่น', text: 'โดรนเริ่มที่จุดหนึ่ง แต่ต้องไปลงบนแท่นเขียวอีกที่ (ลากแท่นเขียวบนแผนผัง)' },
  { mode: 'none', label: 'ไม่มีฐาน', text: 'ไม่มีแท่น โดรนเริ่มบนพื้น ลงจอดตรงไหนก็จบภารกิจและหยุดเวลา' },
];
const round2 = (v: number) => Math.round(v * 100) / 100;

function Num({ label, value, onChange, step = 1, min, max, unit, placeholder }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; step?: number; min?: number; max?: number; unit?: string; placeholder?: string }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-muted-foreground">{label}{unit && <span> ({unit})</span>}</span>
      <Input type="number" inputMode="decimal" step={step} min={min} max={max} value={value ?? ''} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} className="h-10 text-base" />
    </label>
  );
}

/**
 * ตัวจัดการสนามแบบลากวาง: เลือกลายสนาม (สนามจริง/กริด 5×5/พื้นว่าง) แล้ววางจุดผ่าน ห่วง แท่น ลูกโป่ง เป้า
 * ลากบนแผนผังเพื่อย้าย (ยึดติดช่องได้) หรือกดลูกศรบนคีย์บอร์ด · ผลลัพธ์ส่งเป็น JSON ใน input ชื่อ config
 */
export function ScenarioEditor({ initial }: { initial: ScenarioConfig }) {
  const [cfg, setCfg] = useState<ScenarioConfig>(initial);
  const [sel, setSel] = useState<string | null>(null);
  const [snap, setSnap] = useState(0.5);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<string | null>(null); // id วัตถุ หรือ '__start' / '__base'
  const standard = cfg.pattern === 'standard';
  const selected = cfg.objects.find((o) => o.id === sel) ?? null;

  const patch = (id: string, p: Partial<SceneObject>) => setCfg((c) => ({ ...c, objects: c.objects.map((o) => (o.id === id ? ({ ...o, ...p } as SceneObject) : o)) }));
  const st = startOf(cfg);
  const baseMode = cfg.base?.mode ?? 'start';
  const bp = baseAt(cfg);
  /** ย้ายจุดเริ่ม: ถ้าฐานอยู่ที่จุดเริ่มก็ย้ายตามไปเอง */
  const setStart = (p: Partial<{ x: number; y: number; yaw: number }>) => setCfg((c) => ({ ...c, start: { ...startOf(c), ...p } }));
  const setBase = (mode: BaseSpec['mode']) => setCfg((c) => ({ ...c, base: mode === 'custom' ? { mode, x: c.base?.x ?? 2, y: c.base?.y ?? -2 } : { mode } }));
  const snapV = (v: number) => (snap ? Math.round(v / snap) * snap : v);

  const add = (type: SceneObject['type']) => {
    const n = cfg.objects.filter((o) => o.type === type).length + 1;
    let id = `${OBJECT_LABEL[type]} ${n}`;
    while (cfg.objects.some((o) => o.id === id)) id += '+';
    const base = { id, x: clamp(((n - 1) % 5) - 2 + (type === 'hoop' ? 0.5 : 0), -4.5, 4.5), y: clamp(1 + Math.floor((n - 1) / 5), -4.5, 4.5) };
    const orderNext = Math.max(0, ...cfg.objects.map((o) => (o.type === 'waypoint' ? o.order ?? 0 : 0))) + 1;
    const o: SceneObject =
      type === 'waypoint' ? { ...base, type, order: orderNext, points: 10 }
      : type === 'hoop' ? { ...base, type, yaw: 0, size: 1, points: 15 }
      : type === 'platform' ? { ...base, type, r: 0.5 }
      : type === 'balloon' ? { ...base, type, z: 145 }
      : { ...base, type, cz: 140, r: 50 };
    setCfg((c) => ({ ...c, objects: [...c.objects, o] }));
    setSel(id);
  };
  const remove = (id: string) => { setCfg((c) => ({ ...c, objects: c.objects.filter((o) => o.id !== id) })); setSel(null); };
  const duplicate = (o: SceneObject) => {
    let id = `${o.id} สำเนา`;
    while (cfg.objects.some((x) => x.id === id)) id += '+';
    setCfg((c) => ({ ...c, objects: [...c.objects, { ...o, id, x: clamp(o.x + 0.5, -4.8, 4.8), y: clamp(o.y + 0.5, -4.8, 4.8), order: undefined } as SceneObject] }));
    setSel(id);
  };

  const toField = (e: React.PointerEvent | PointerEvent) => {
    const el = svg.current!;
    const m = el.getScreenCTM()!.inverse();
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return { x: pt.x, y: -pt.y }; // กลุ่มวาดใช้ scale(1,-1)
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = toField(e);
    const q = { x: round2(clamp(snapV(p.x), -4.8, 4.8)), y: round2(clamp(snapV(p.y), -4.8, 4.8)) };
    if (drag.current === '__start') { setStart(q); return; }
    if (drag.current === '__base') { setCfg((c) => ({ ...c, base: { mode: 'custom', ...q } })); return; }
    patch(drag.current, { x: round2(clamp(snapV(p.x), -4.8, 4.8)), y: round2(clamp(snapV(p.y), -4.8, 4.8)) });
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (!selected) return;
    const step = snap || 0.1;
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (d[e.key]) { e.preventDefault(); patch(selected.id, { x: round2(clamp(selected.x + d[e.key][0], -4.8, 4.8)), y: round2(clamp(selected.y + d[e.key][1], -4.8, 4.8)) }); }
    if (e.key === 'Delete' || e.key === 'Backspace') { if ((e.target as HTMLElement).tagName === 'INPUT') return; e.preventDefault(); remove(selected.id); }
  };

  const dup = useMemo(() => cfg.objects.find((o, i) => cfg.objects.findIndex((x) => x.id === o.id) !== i)?.id, [cfg.objects]);
  const wps = cfg.objects.filter((o) => o.type === 'waypoint');

  return (
    <div className="grid gap-5">
      <input type="hidden" name="config" value={JSON.stringify(cfg)} />

      <div className="grid gap-4 md:grid-cols-2">
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-base font-medium">ลายสนาม</legend>
          <div className="grid gap-2">
            {PATTERNS.map((p) => (
              <label key={p.id} className={`flex cursor-pointer items-start gap-3 squircle-xl border p-3 transition-colors ${cfg.pattern === p.id ? 'border-brand-blue bg-brand-blue/10' : 'border-line hover:bg-surface-2'}`}>
                <input type="radio" name="pattern-ui" checked={cfg.pattern === p.id} onChange={() => setCfg((c) => ({ ...c, pattern: p.id }))} className="mt-1.5 accent-[var(--brand-blue)]" />
                <span><span className="block text-base font-bold">{p.label}</span><span className="block text-sm text-muted-foreground">{p.text}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="grid content-start gap-2">
          <legend className="mb-1 text-base font-medium">กติกาและคำสั่งที่ใช้ (ประเภทแข่ง)</legend>
          <div className="grid gap-2">
            {currentSeason.events.map((e) => (
              <label key={e.id} className={`flex cursor-pointer items-center gap-3 squircle-xl border p-3 transition-colors ${cfg.event === e.id ? 'border-brand-blue bg-brand-blue/10' : 'border-line hover:bg-surface-2'}`}>
                <input type="radio" name="event-ui" checked={cfg.event === e.id} onChange={() => setCfg((c) => ({ ...c, event: e.id }))} className="accent-[var(--brand-blue)]" />
                <span className="text-base font-bold">{e.short}</span>
                <span className="text-sm text-muted-foreground">{e.id === 'mission' ? 'ปล่อยบอล' : e.id === 'aviation' ? 'ลูกโป่ง' : 'ยิงเป้า'}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {standard && <p className="squircle-xl bg-amber-500/10 px-4 py-3 text-base text-amber-800 dark:text-amber-200">สนามแข่งจริงมีแท่น ลูกโป่ง เป้า ตามกติกาอยู่แล้ว ที่เพิ่มได้คือ <b>จุดผ่าน</b> และ <b>ห่วง</b> เท่านั้น อยากวางแท่น ลูกโป่ง เป้า เองให้เลือกกริดหรือพื้นว่าง</p>}

      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="เพิ่มวัตถุ">
        <span className="mr-1 text-base font-medium">เพิ่มลงสนาม:</span>
        {ADD.map(({ type, Icon }) => {
          const off = standard && type !== 'waypoint' && type !== 'hoop';
          return <Button key={type} type="button" variant="outline" className="h-10 px-3 text-base" disabled={off} onClick={() => add(type)}><Icon className="size-4" /> {OBJECT_LABEL[type]}</Button>;
        })}
        <label className="ml-auto flex items-center gap-2 text-base">ยึดติด
          <select value={snap} onChange={(e) => setSnap(Number(e.target.value))} className="h-10 squircle-xl border border-input bg-transparent px-2 text-base">
            {SNAPS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
        <div>
          <svg ref={svg} viewBox="-5.4 -5.4 10.8 10.8" tabIndex={0} onKeyDown={onKey} onPointerMove={onMove} onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}
            onPointerDown={(e) => { if (e.target === e.currentTarget || (e.target as SVGElement).dataset.bg) setSel(null); }}
            className="aspect-square w-full touch-none squircle-2xl border border-line bg-[#171b26] outline-none focus-visible:border-brand-blue" role="application" aria-label="แผนผังสนาม ลากวัตถุเพื่อย้าย หรือเลือกแล้วกดลูกศร">
            <g transform="scale(1,-1)">
              <rect data-bg="1" x={-5} y={-5} width={10} height={10} rx={0.3} fill="#212839" stroke="#ffffff" strokeOpacity={0.18} strokeWidth={0.08} />
              {[-4, -3, -2, -1, 1, 2, 3, 4].map((g) => (
                <g key={g} stroke="#ffffff" strokeOpacity={0.08} strokeWidth={0.02}><line x1={g} y1={-5} x2={g} y2={5} /><line x1={-5} y1={g} x2={5} y2={g} /></g>
              ))}
              {standard && [[-2.5, 2.5], [2.5, 2.5], [-2.5, -2.5], [2.5, -2.5]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={0.5} fill="#1d3fae" opacity={0.5} />)}
              <ScenePlanLayer pattern={cfg.pattern} objects={cfg.objects} selected={sel} />
              <BaseStartLayer cfg={cfg} showStart={!standard} selected={sel === '__start'} />
              {!standard && (
                <circle cx={st.x} cy={st.y} r={0.6} fill="transparent" style={{ cursor: 'grab' }}
                  onPointerDown={(e) => { e.stopPropagation(); setSel('__start'); drag.current = '__start'; (e.currentTarget as Element).setPointerCapture?.(e.pointerId); svg.current?.focus(); }} />
              )}
              {!standard && baseMode === 'custom' && bp && (
                <rect x={bp.x - 0.75} y={bp.y - 0.75} width={1.5} height={1.5} fill="transparent" style={{ cursor: 'grab' }}
                  onPointerDown={(e) => { e.stopPropagation(); drag.current = '__base'; (e.currentTarget as Element).setPointerCapture?.(e.pointerId); svg.current?.focus(); }} />
              )}
              {cfg.objects.map((o) => (
                <circle key={o.id} cx={o.x} cy={o.y} r={0.55} fill="transparent" style={{ cursor: 'grab' }}
                  onPointerDown={(e) => { e.stopPropagation(); setSel(o.id); drag.current = o.id; (e.currentTarget as Element).setPointerCapture?.(e.pointerId); svg.current?.focus(); }} />
              ))}
            </g>
            <g fontSize={0.34} fill="#cbd5e1" textAnchor="middle"><text x={0} y={-4.6}>เหนือ ↑ (โดรนหันหน้าไปทางนี้)</text><text x={0} y={5.05}>ใต้ — ที่ผู้แข่งขันยืน</text></g>
          </svg>
          <p className="mt-2 text-sm text-muted-foreground">ลากวัตถุเพื่อย้าย · เลือกแล้วกดลูกศรเพื่อขยับ · Delete เพื่อลบ · สี่เหลี่ยมดำ+ลูกศรแดง = โดรน (ลากได้) · สี่เหลี่ยมเขียว = ฐาน{cfg.pattern === 'grid5' && ' · กริดชื่อช่อง A1–E5'}</p>
        </div>

        <div className="grid content-start gap-4">
          {!standard ? (
            <div className="grid gap-4 squircle-2xl border border-line bg-surface p-4">
              <div className="grid gap-2">
                <p className="text-base font-bold">1. โดรนเริ่มที่ไหน</p>
                <p className="text-sm text-muted-foreground">ลากสี่เหลี่ยมดำบนแผนผัง หรือกรอกตำแหน่ง แล้วเลือกว่าหัวโดรนหันไปทางไหน</p>
                <div className="grid grid-cols-2 gap-3">
                  <Num label="ซ้าย-ขวา (x)" unit="ม." step={0.25} min={-4.8} max={4.8} value={st.x} onChange={(v) => setStart({ x: clamp(v ?? 0, -4.8, 4.8) })} />
                  <Num label="หน้า-หลัง (y)" unit="ม." step={0.25} min={-4.8} max={4.8} value={st.y} onChange={(v) => setStart({ y: clamp(v ?? 0, -4.8, 4.8) })} />
                </div>
                <div role="radiogroup" aria-label="ทิศหัวโดรน" className="grid grid-cols-4 gap-2">
                  {HEADINGS.map((h) => (
                    <button key={h.yaw} type="button" role="radio" aria-checked={st.yaw === h.yaw} onClick={() => setStart({ yaw: h.yaw })}
                      className={`grid min-h-12 place-items-center squircle-xl border px-1 py-1.5 text-sm transition-colors ${st.yaw === h.yaw ? 'border-brand-blue bg-brand-blue/10 font-bold' : 'border-line hover:bg-surface-2'}`}>
                      <span className="text-lg leading-none">{h.arrow}</span>{h.label}
                    </button>
                  ))}
                </div>
                <Button type="button" variant="outline" className="h-10 justify-self-start px-3 text-base" onClick={() => setStart({ x: 0, y: 0 })}>วางกลางสนาม</Button>
              </div>
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-base font-bold">2. ฐาน (แท่นลงจอด) อยู่ไหน</legend>
                {BASE_MODES.map((m) => (
                  <label key={m.mode} className={`flex cursor-pointer items-start gap-3 squircle-xl border p-3 transition-colors ${baseMode === m.mode ? 'border-brand-blue bg-brand-blue/10' : 'border-line hover:bg-surface-2'}`}>
                    <input type="radio" name="base-ui" checked={baseMode === m.mode} onChange={() => setBase(m.mode)} className="mt-1.5 accent-[var(--brand-blue)]" />
                    <span><span className="block text-base font-bold">{m.label}</span><span className="block text-sm text-muted-foreground">{m.text}</span></span>
                  </label>
                ))}
                {baseMode === 'custom' && bp && (
                  <div className="grid grid-cols-2 gap-3">
                    <Num label="ฐาน ซ้าย-ขวา (x)" unit="ม." step={0.25} min={-4.8} max={4.8} value={bp.x} onChange={(v) => setCfg((c) => ({ ...c, base: { mode: 'custom', x: clamp(v ?? 0, -4.8, 4.8), y: bp.y } }))} />
                    <Num label="ฐาน หน้า-หลัง (y)" unit="ม." step={0.25} min={-4.8} max={4.8} value={bp.y} onChange={(v) => setCfg((c) => ({ ...c, base: { mode: 'custom', x: bp.x, y: clamp(v ?? 0, -4.8, 4.8) } }))} />
                  </div>
                )}
              </fieldset>
            </div>
          ) : (
            <p className="squircle-xl bg-surface-2 px-4 py-3 text-sm text-muted-foreground">สนามแข่งจริงเริ่มและลงจอดที่ฐานกลางสนามเสมอ ถ้าอยากย้ายจุดเริ่มหรือไม่มีฐาน ให้เลือกกริดหรือพื้นว่าง</p>
          )}
          {selected ? (
            <div className="grid gap-3 squircle-2xl border border-brand-blue/50 bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-bold">{OBJECT_LABEL[selected.type]}</p>
                <div className="flex gap-1.5">
                  <Button type="button" variant="outline" className="h-9 px-3" onClick={() => duplicate(selected)}><Copy className="size-4" /> ทำซ้ำ</Button>
                  <Button type="button" variant="outline" className="h-9 px-3 text-brand-red" onClick={() => remove(selected.id)}><Trash2 className="size-4" /> ลบ</Button>
                </div>
              </div>
              <label className="grid gap-1 text-sm"><span className="text-muted-foreground">ชื่อ (ใช้อ้างในผลคะแนน)</span>
                <Input value={selected.id} onChange={(e) => { const v = e.target.value; patch(selected.id, { id: v }); setSel(v); }} className="h-10 text-base" /></label>
              {dup && <p className="text-sm text-brand-red">ชื่อ "{dup}" ซ้ำ ต้องไม่ซ้ำกัน</p>}
              <div className="grid grid-cols-2 gap-3">
                <Num label="ตำแหน่ง ซ้าย-ขวา (x)" unit="ม." step={0.25} min={-5} max={5} value={selected.x} onChange={(v) => patch(selected.id, { x: clamp(v ?? 0, -5, 5) })} />
                <Num label="ตำแหน่ง หน้า-หลัง (y)" unit="ม." step={0.25} min={-5} max={5} value={selected.y} onChange={(v) => patch(selected.id, { y: clamp(v ?? 0, -5, 5) })} />
              </div>
              {cfg.pattern === 'grid5' && Math.abs(selected.x) <= 2.5 && Math.abs(selected.y) <= 2.5 && <p className="text-sm text-muted-foreground">อยู่ช่อง <b>{cellName(selected.x, selected.y)}</b></p>}
              {selected.type === 'waypoint' && (
                <div className="grid grid-cols-2 gap-3">
                  <Num label="ลำดับ (ว่าง = ไม่บังคับลำดับ)" value={selected.order} min={1} onChange={(v) => patch(selected.id, { order: v })} />
                  <Num label="คะแนน" value={selected.points ?? 10} min={0} onChange={(v) => patch(selected.id, { points: v ?? 0 })} />
                  <Num label="รัศมีที่นับว่าผ่าน" unit="ซม." value={selected.r ?? 45} min={10} onChange={(v) => patch(selected.id, { r: v })} />
                  <span />
                  <Num label="ความสูงต่ำสุด" unit="ซม." value={selected.zMin ?? 45} min={0} onChange={(v) => patch(selected.id, { zMin: v })} />
                  <Num label="ความสูงสูงสุด" unit="ซม." value={selected.zMax ?? 250} min={0} onChange={(v) => patch(selected.id, { zMax: v })} />
                </div>
              )}
              {selected.type === 'hoop' && (
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <p className="text-sm text-muted-foreground">หมุนห่วง (ทิศที่โดรนลอดผ่าน)</p>
                    <div role="radiogroup" aria-label="หมุนห่วง" className="grid grid-cols-4 gap-2">
                      {[{ v: 0, l: 'เหนือ-ใต้', a: '↕' }, { v: 45, l: 'เฉียง 45°', a: '⤢' }, { v: 90, l: 'ตะวันออก-ตก', a: '↔' }, { v: 135, l: 'เฉียง 135°', a: '⤡' }].map((d) => (
                        <button key={d.v} type="button" role="radio" aria-checked={((((selected.yaw ?? 0) % 180) + 180) % 180) === d.v} onClick={() => patch(selected.id, { yaw: d.v })}
                          className={`grid min-h-12 place-items-center squircle-xl border px-1 py-1.5 text-sm transition-colors ${((((selected.yaw ?? 0) % 180) + 180) % 180) === d.v ? 'border-brand-blue bg-brand-blue/10 font-bold' : 'border-line hover:bg-surface-2'}`}>
                          <span className="text-lg leading-none">{d.a}</span>{d.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Num label="องศาที่หมุน (กรอกเองได้)" unit="องศา" step={15} value={selected.yaw ?? 0} onChange={(v) => patch(selected.id, { yaw: v ?? 0 })} />
                    <Num label="ความกว้างช่อง" unit="ม." step={0.1} min={0.3} value={selected.size ?? 1} onChange={(v) => patch(selected.id, { size: v })} />
                    <Num label="ขอบล่างของช่องสูงจากพื้น" unit="ซม." value={selected.zMin ?? 55} min={0} onChange={(v) => patch(selected.id, { zMin: v })} />
                    <Num label="ขอบบนของช่องสูงจากพื้น" unit="ซม." value={selected.zMax ?? 150} min={0} onChange={(v) => patch(selected.id, { zMax: v })} />
                    <Num label="คะแนนที่ลอดผ่าน" value={selected.points ?? 15} min={0} onChange={(v) => patch(selected.id, { points: v ?? 0 })} />
                  </div>
                  <p className="squircle-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">ห่วงมีเสา คานบน-ล่าง และฐานตั้งพื้นจริง โดรนต้องผ่านกลางช่องตามความสูงที่ตั้ง ถ้าเฉี่ยวเสาหรือคานโดรนจะตกและจบภารกิจ</p>
                </div>
              )}
              {selected.type === 'platform' && <Num label="รัศมีแท่น" unit="ม." step={0.1} min={0.2} value={selected.r ?? 0.5} onChange={(v) => patch(selected.id, { r: v })} />}
              {selected.type === 'balloon' && <Num label="ความสูงลูกโป่ง" unit="ซม." value={selected.z ?? 145} onChange={(v) => patch(selected.id, { z: v })} />}
              {selected.type === 'target' && (
                <div className="grid grid-cols-2 gap-3">
                  <Num label="ความสูงกึ่งกลางเป้า" unit="ซม." value={selected.cz ?? 140} onChange={(v) => patch(selected.id, { cz: v })} />
                  <Num label="รัศมีเป้า" unit="ซม." value={selected.r ?? 50} onChange={(v) => patch(selected.id, { r: v })} />
                </div>
              )}
            </div>
          ) : (
            <div className="grid place-items-center gap-2 squircle-2xl border border-dashed border-line p-8 text-center text-base text-muted-foreground">
              <MousePointer2 className="size-6" aria-hidden />
              กดวัตถุบนแผนผังเพื่อแก้รายละเอียด หรือกด "เพิ่มลงสนาม" ด้านบน
            </div>
          )}

          <div className="grid gap-1.5">
            <p className="flex items-center justify-between text-base font-medium"><span>วัตถุในสนาม ({cfg.objects.length})</span>
              {cfg.objects.length > 0 && <button type="button" className="text-sm text-brand-red hover:underline" onClick={() => { if (confirm('ลบวัตถุทั้งหมดในสนาม?')) { setCfg((c) => ({ ...c, objects: [] })); setSel(null); } }}>ลบทั้งหมด</button>}</p>
            <ul className="grid max-h-60 gap-1 overflow-y-auto">
              {cfg.objects.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => setSel(o.id)} className={`flex w-full items-center justify-between gap-2 squircle-xl px-3 py-1.5 text-left text-base ${o.id === sel ? 'bg-brand-blue/12 font-bold' : 'hover:bg-surface-2'}`}>
                    <span className="truncate">{o.id}</span><span className="shrink-0 text-sm text-muted-foreground">{OBJECT_LABEL[o.type]}{o.type === 'waypoint' && o.order ? ` #${o.order}` : ''} · ({o.x}, {o.y})</span>
                  </button>
                </li>
              ))}
              {cfg.objects.length === 0 && <li className="px-3 py-2 text-base text-muted-foreground">ยังไม่มีวัตถุ ผู้เรียนจะเห็นสนามเปล่า</li>}
            </ul>
            {wps.length > 1 && <p className="text-sm text-muted-foreground">จุดผ่านที่มีเลขลำดับ ต้องบินผ่านตามลำดับ ถ้าข้ามจะไม่นับ</p>}
          </div>
        </div>
      </div>
      <Label className="sr-only">การตั้งค่าสนามถูกส่งไปกับปุ่มบันทึก</Label>
    </div>
  );
}
