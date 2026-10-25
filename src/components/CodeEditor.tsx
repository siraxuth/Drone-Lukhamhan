'use client';

import { useMemo, useRef, useState } from 'react';
import { COMMANDS, KNOWN, canon, type Cmd } from '@/flight/commands';

const LINE = 24; // px ต่อบรรทัด (leading-6)

/** ไฮไลต์: คอมเมนต์ · ชื่อคำสั่งที่รู้จัก (น้ำเงิน) · ชื่อที่ไม่รู้จัก (ขีดเส้นแดง) · ตัวเลข · เครื่องหมาย */
function highlight(code: string) {
  return code.split('\n').map((line, i) => {
    const ci = line.indexOf('//');
    const body = ci >= 0 ? line.slice(0, ci) : line;
    const comment = ci >= 0 ? line.slice(ci) : '';
    const out: React.ReactNode[] = [];
    const re = /([A-Za-z_]\w*)(?=\s*\()|(\b\d+(?:\.\d+)?\b)|([();,])|(\s+)|([^\s();,]+)/g;
    let m: RegExpExecArray | null, k = 0;
    while ((m = re.exec(body))) {
      if (m[1]) {
        const known = KNOWN.has(canon(m[1])) || m[1] === 'drone';
        out.push(<span key={k++} className={known ? 'font-semibold text-blue-700 dark:text-sky-300' : 'underline decoration-red-500 decoration-wavy decoration-1 underline-offset-4 text-red-600 dark:text-red-300'}>{m[1]}</span>);
      } else if (m[2]) out.push(<span key={k++} className="font-semibold text-orange-600 dark:text-amber-300">{m[2]}</span>);
      else if (m[3]) out.push(<span key={k++} className="text-zinc-500 dark:text-zinc-400">{m[3]}</span>);
      else out.push(<span key={k++}>{m[0]}</span>);
    }
    if (comment) out.push(<span key={k++} className="italic text-emerald-700 dark:text-emerald-400/80">{comment}</span>);
    return <div key={i} className="min-h-6">{out.length ? out : '​'}</div>;
  });
}

type Sugg = { cmd: Cmd; word: string; start: number };

/**
 * ตัวแก้โค้ดของตัวจำลอง: ไฮไลต์สีตามชนิด · ชื่อคำสั่งผิดขีดเส้นแดง · พิมพ์แล้วมี suggestion (↑↓ เลือก, Tab/Enter ใส่, Esc ปิด)
 * ใต้ช่องมีปุ่มแทรกคำสั่งที่ใช้บ่อย ไม่ต้องพิมพ์เอง
 */
export function CodeEditor({ value, onChange, rows = 14, name, label = 'โค้ด' }: { value: string; onChange: (v: string) => void; rows?: number; name?: string; label?: string }) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const pre = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const [sugg, setSugg] = useState<Sugg[]>([]);
  const [sel, setSel] = useState(0);
  const [caret, setCaret] = useState({ line: 0, col: 0 });

  const lines = useMemo(() => value.split('\n').length, [value]);
  const html = useMemo(() => highlight(value), [value]);

  const place = (text: string, from: number, to: number) => {
    const m = /\[\[(.*?)\]\]/.exec(text);
    const plain = text.replace(/\[\[(.*?)\]\]/, '$1');
    const next = value.slice(0, from) + plain + value.slice(to);
    onChange(next);
    const selStart = m ? from + (m.index ?? 0) : from + plain.length;
    const selEnd = m ? selStart + m[1].length : selStart;
    requestAnimationFrame(() => { ta.current?.focus(); ta.current?.setSelectionRange(selStart, selEnd); });
    setSugg([]);
  };

  const update = (v: string, pos: number) => {
    const before = v.slice(0, pos);
    const lineIdx = before.split('\n').length - 1;
    setCaret({ line: lineIdx, col: before.length - before.lastIndexOf('\n') - 1 });
    const mm = /(?:^|[^\w.])([A-Za-z_]\w*)$/.exec(before);
    const inComment = before.slice(before.lastIndexOf('\n') + 1).includes('//');
    if (!mm || inComment) { setSugg([]); return; }
    const w = mm[1], cw = canon(w);
    const list = COMMANDS.filter((c) => canon(c.name).startsWith(cw) && canon(c.name) !== cw)
      .concat(COMMANDS.filter((c) => !canon(c.name).startsWith(cw) && canon(c.name).includes(cw) && cw.length >= 2))
      .slice(0, 7);
    setSugg(list.map((cmd) => ({ cmd, word: w, start: pos - w.length })));
    setSel(0);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!sugg.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => (s + 1) % sugg.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => (s - 1 + sugg.length) % sugg.length); }
    else if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); const s = sugg[sel]; place(s.cmd.insert, s.start, s.start + s.word.length); }
    else if (e.key === 'Escape') { e.preventDefault(); setSugg([]); }
  };

  const insertQuick = (c: Cmd) => {
    const el = ta.current;
    const pos = el?.selectionStart ?? value.length;
    const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
    const onBlank = value.slice(lineStart, pos).trim() === '';
    // แทรกเป็นบรรทัดใหม่เสมอ: ถ้าบรรทัดนี้ว่างใช้ที่เดิม ไม่ว่างขึ้นบรรทัดใหม่
    const prefix = onBlank ? '' : '\n';
    const indent = '';
    const text = prefix + indent + c.insert;
    place(text, pos, el?.selectionEnd ?? pos);
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="แทรกคำสั่งที่ใช้บ่อย">
        <span className="mr-1 self-center text-sm text-muted-foreground">แทรกเร็ว:</span>
        {COMMANDS.filter((c) => c.quick).map((c) => (
          <button key={c.name} type="button" onClick={() => insertQuick(c)} title={c.desc} className="min-h-8 squircle-xl border border-line bg-surface-2 px-2.5 font-mono text-sm font-semibold text-blue-700 transition-colors hover:bg-muted dark:text-sky-300">{c.sig.replace('(ซม.)', '()')}</button>
        ))}
      </div>

      <div className="relative grid grid-cols-[auto_minmax(0,1fr)] overflow-hidden squircle-2xl border border-line bg-[#fbfbfd] font-mono text-sm leading-6 focus-within:border-brand-blue dark:bg-[#10131a]">
        <div aria-hidden className="select-none border-r border-line bg-surface-2/60 px-2 py-3 text-right text-zinc-400" style={{ minHeight: rows * LINE + 24 }}>
          <div style={{ transform: `translateY(${-scroll.top}px)` }}>{Array.from({ length: Math.max(lines, rows) }, (_, i) => <div key={i} className="h-6">{i + 1}</div>)}</div>
        </div>
        <div className="relative min-w-0 overflow-hidden" style={{ height: rows * LINE + 24 }}>
          <div ref={pre} aria-hidden className="pointer-events-none absolute left-0 top-0 whitespace-pre p-3" style={{ transform: `translate(${-scroll.left}px, ${-scroll.top}px)` }}>{html}</div>
          <textarea
            ref={ta}
            name={name}
            aria-label={label}
            value={value}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            wrap="off"
            onChange={(e) => { onChange(e.target.value); update(e.target.value, e.target.selectionStart); }}
            onKeyDown={onKey}
            onKeyUp={(e) => { if (!['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) return; if (!sugg.length) update(e.currentTarget.value, e.currentTarget.selectionStart); }}
            onClick={(e) => update(e.currentTarget.value, e.currentTarget.selectionStart)}
            onBlur={() => setTimeout(() => setSugg([]), 120)}
            onScroll={(e) => setScroll({ top: e.currentTarget.scrollTop, left: e.currentTarget.scrollLeft })}
            className="absolute inset-0 size-full resize-none whitespace-pre bg-transparent p-3 font-mono text-sm leading-6 text-transparent caret-foreground outline-none selection:bg-brand-blue/25"
          />
          {sugg.length > 0 && (
            <ul role="listbox" aria-label="คำแนะนำคำสั่ง" className="absolute z-20 w-[min(22rem,calc(100%-1rem))] overflow-hidden squircle-xl border border-line bg-popover p-1 shadow-xl"
              style={{ top: Math.min((caret.line + 1) * LINE + 12 - scroll.top + 2, rows * LINE - 8), left: Math.min(12 + caret.col * 8.4 - scroll.left, 120) }}>
              {sugg.map((s, i) => (
                <li key={s.cmd.name} role="option" aria-selected={i === sel}
                  onMouseDown={(e) => { e.preventDefault(); place(s.cmd.insert, s.start, s.start + s.word.length); }}
                  className={`flex cursor-pointer flex-col px-2.5 py-1.5 ${i === sel ? 'bg-brand-blue/12' : ''}`}>
                  <span className="font-mono text-sm font-semibold text-blue-700 dark:text-sky-300">{s.cmd.sig}</span>
                  <span className="font-sans text-sm text-muted-foreground">{s.cmd.desc}</span>
                </li>
              ))}
              <li className="px-2.5 pb-1 pt-1 font-sans text-xs text-muted-foreground">↑↓ เลือก · Tab หรือ Enter ใส่ · Esc ปิด</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
