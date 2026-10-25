'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Download, File as FileIcon, FileCode2, FolderOpen } from 'lucide-react';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';

type Item = { name: string; role: string };
const ALL: Item[] = [
  { name: 'drone_sanam5.ino', role: 'ไฟล์หลัก: setup() / loop() ตัวกระจายโหมด' },
  { name: 'mode_config.hpp', role: 'เลือกโหมดบินบรรทัดเดียว' },
  { name: 'config.hpp', role: 'ค่าคงที่: ความสูง ms/cm เซอร์โว หมุนตัว' },
  { name: 'Drone_Mission.ino', role: 'โหมด 1: ปล่อยบอล/เจาะ/ยิง' },
  { name: 'Aviation_Mastery.ino', role: 'โหมด 2: Aviation Mastery' },
  { name: 'Drone_Innovation_Challenge.ino', role: 'โหมด 3: Innovation Challenge' },
  { name: 'shooting.ino', role: 'ยิงลูกดอก' },
  { name: 'poke_controls.ino', role: 'เจาะลูกโป่ง' },
  { name: 'poke_controls.h', role: 'ประกาศฟังก์ชันเจาะ' },
  { name: 'Servo.ino', role: 'ปล่อยบอล ส่งพัลส์เซอร์โว' },
  { name: 'Servo_Degree.ino', role: 'แปลงองศาเป็นพัลส์' },
  { name: 'Test_ball.ino', role: 'ฟังก์ชันทดสอบ (ไม่มีโหมดเรียก)' },
  { name: 'DroneEasy.hpp', role: 'คลาส DroneEasy (ประกาศ)' },
  { name: 'DroneEasy.cpp', role: 'drone.* เรียก pArduino อีกที' },
  { name: 'protocol.hpp', role: 'คลาส Arduino (ประกาศ)' },
  { name: 'protocol.cpp', role: 'pArduino-> คุย I2C กับ FC' },
  { name: 'LegacyActions.hpp', role: 'ประกาศฟังก์ชัน .ino ให้ .cpp เรียก' },
  { name: 'README.ino', role: 'คำอธิบายในรูปคอมเมนต์' },
];
const BASE = '/downloads/drone_sanam5/';

type State = { status: 'loading' } | { status: 'ok'; code: string } | { status: 'error' };

/** เลือกไฟล์ในโปรเจกต์ drone_sanam5 แล้วอ่านโค้ดจริงได้เลย (ดึงไฟล์เมื่อกดครั้งแรก แล้วจำไว้) */
export function ProjectFiles() {
  const [name, setName] = useState(ALL[0].name);
  const [state, setState] = useState<State>({ status: 'loading' });
  const [copied, setCopied] = useState(false);
  const cache = useRef(new Map<string, string>());
  const panel = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLElement>(null);
  const cur = ALL.find((f) => f.name === name)!;

  const load = useCallback(async (n: string) => {
    const hit = cache.current.get(n);
    if (hit !== undefined) { setState({ status: 'ok', code: hit }); return; }
    setState({ status: 'loading' });
    try {
      const res = await fetch(BASE + encodeURIComponent(n));
      if (!res.ok) throw new Error(String(res.status));
      const code = await res.text();
      cache.current.set(n, code);
      setState((s) => (s.status === 'loading' ? { status: 'ok', code } : s));
    } catch { setState({ status: 'error' }); }
  }, []);

  useEffect(() => { void load(name); }, [name, load]);
  useEffect(() => { setCopied(false); }, [name]);

  const copy = async () => {
    if (state.status !== 'ok') return;
    try { await navigator.clipboard.writeText(state.code); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* คลิปบอร์ดไม่ได้ ก็ไม่เป็นไร */ }
  };
  const select = (n: string) => {
    setName(n);
    // มือถือ: ต้นไม้อยู่บนโค้ดอยู่ล่าง → เลื่อนลงไปที่โค้ดให้เลย
    if (window.matchMedia('(max-width: 1023px)').matches) setTimeout(() => editor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    panel.current?.querySelector('.fd-scroll-container')?.scrollTo({ top: 0 });
  };
  const lines = state.status === 'ok' ? state.code.split('\n').length : null;

  return (
    // หน้าต่างเดียวแบบ VS Code: ต้นไม้ไฟล์ + แท็บ + โค้ด + แถบสถานะ อยู่ในกรอบเดียวกัน
    <div ref={section} className="not-prose my-6 scroll-mt-20 overflow-hidden squircle-2xl border border-line bg-surface shadow-sm" role="group" aria-label="ตัวดูโค้ดโปรเจกต์ drone_sanam5">
      <div className="grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        {/* EXPLORER */}
        <nav aria-label="ไฟล์ในโปรเจกต์" className="flex max-h-60 min-w-0 flex-col overflow-x-hidden border-b border-line bg-surface-2/60 lg:max-h-none lg:border-b-0 lg:border-e">
          <p className="px-4 py-2 text-xs font-semibold tracking-wider text-muted-foreground">EXPLORER</p>
          <div role="tree" aria-label="drone_sanam5" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-2 [scrollbar-width:thin] lg:max-h-[30rem]">
            <p className="flex min-h-8 items-center gap-1.5 px-3 text-sm font-semibold text-foreground"><ChevronDown className="size-4 text-muted-foreground" aria-hidden /><FolderOpen className="size-4 text-brand-blue" aria-hidden /> drone_sanam5</p>
            <ul role="group" className="grid">
              {ALL.map((f) => {
                const on = f.name === name;
                return (
                  <li key={f.name} role="none">
                    <button type="button" role="treeitem" aria-selected={on} onClick={() => select(f.name)} title={f.role}
                      className={`flex min-h-9 w-full items-center gap-2 ps-9 pe-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-blue ${on ? 'bg-brand-blue/15 text-foreground' : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'}`}>
                      <FileIcon className={`size-4 shrink-0 ${on ? 'text-brand-blue' : ''}`} aria-hidden />
                      <span className="truncate font-mono text-sm">{f.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* EDITOR */}
        <section ref={editor} aria-label={`โค้ดไฟล์ ${name}`} className="flex min-w-0 scroll-mt-20 flex-col">
          <p className="flex items-center gap-2 truncate border-b border-line bg-surface-2/60 px-4 py-2 text-sm text-muted-foreground"><FileCode2 className="size-4 shrink-0 text-brand-blue" aria-hidden /><span className="truncate"><span className="font-mono font-semibold text-foreground">{name}</span> <span className="ms-1">· {cur.role}</span></span></p>

          <div ref={panel} className="min-h-40" aria-live="polite">
            {state.status === 'ok' && (
              <DynamicCodeBlock key={name} lang="cpp" code={state.code} codeblock={{ className: 'my-0 rounded-none border-0 bg-transparent shadow-none', allowCopy: false, 'data-line-numbers': true, viewportProps: { className: 'max-h-[26rem] lg:max-h-[30rem]' } }} />
            )}
            {state.status === 'loading' && <p className="px-4 py-10 text-center text-muted-foreground">กำลังโหลดไฟล์…</p>}
            {state.status === 'error' && (
              <p className="px-4 py-10 text-center text-muted-foreground">โหลดไฟล์ไม่ได้ ลองกดอีกครั้ง หรือ <a className="text-brand-blue underline" href="/downloads/drone_sanam5.zip">ดาวน์โหลดทั้งชุด (.zip)</a></p>
            )}
          </div>
        </section>
      </div>

      {/* แถบสถานะล่างสุด */}
      <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line bg-surface-2/60 px-3 py-1 text-xs text-muted-foreground">
        <span>{lines ? `${lines} บรรทัด` : '…'} · C++ · UTF-8</span>
        <span className="flex items-center gap-1">
          <button type="button" onClick={copy} disabled={state.status !== 'ok'} className="inline-flex min-h-8 items-center gap-1 rounded px-2 hover:bg-muted hover:text-foreground disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-brand-blue">
            {copied ? <Check className="size-3.5 text-emerald-500" aria-hidden /> : <Copy className="size-3.5" aria-hidden />} {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
          </button>
          <a href={BASE + encodeURIComponent(name)} download={name} className="inline-flex min-h-8 items-center gap-1 rounded px-2 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand-blue">
            <Download className="size-3.5" aria-hidden /> ดาวน์โหลด
          </a>
        </span>
      </footer>
    </div>
  );
}
