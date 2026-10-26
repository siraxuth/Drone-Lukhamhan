'use client';

import { useMemo, useRef, useState } from 'react';
import { COMMANDS, KNOWN, canon, type Cmd } from '@/flight/commands';

const LINE = 24; // px ต่อบรรทัด (leading-6)

/** ไฮไลต์: คอมเมนต์ · ชื่อคำสั่งที่รู้จัก (น้ำเงิน) · ชื่อที่ไม่รู้จัก (ขีดเส้นแดง) · ตัวเลข · เครื่องหมาย */
function highlight(code: string) {
  // ชื่อฟังก์ชันที่ผู้ใช้เขียนเอง (void ชื่อ()) ไม่ต้องขีดเส้นแดง
  const defined = new Set([...code.matchAll(/\bvoid\s+(\w+)/g)].map((m) => m[1]));
  return code.split('\n').map((line, i) => {
    const ci = line.indexOf('//');
    const body = ci >= 0 ? line.slice(0, ci) : line;
    const comment = ci >= 0 ? line.slice(ci) : '';
    const out: React.ReactNode[] = [];
    const re = /([A-Za-z_]\w*)(?=\s*\()|(\b\d+(?:\.\d+)?\b)|([();,])|(\s+)|([^\s();,]+)/g;
    let m: RegExpExecArray | null, k = 0;
    while ((m = re.exec(body))) {
      if (m[1]) {
        const known = KNOWN.has(canon(m[1])) || defined.has(m[1]) || m[1] === 'drone';
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
export function CodeEditor({ value, onChange, rows = 14, name, label = 'โค้ด', fill = false, commands = COMMANDS }: { value: string; onChange: (v: string) => void; rows?: number; name?: string; label?: string; fill?: boolean; /** รายการคำสั่งตามโหมดการเขียน (ดู commandsFor) */ commands?: Cmd[] }) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const pre = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const [sugg, setSugg] = useState<Sugg[]>([]);
  const [sel, setSel] = useState(0);
  const [caret, setCaret] = useState({ line: 0, col: 0 });

  const lines = useMemo(() => value.split('\n').length, [value]);
  const html = useMemo(() => highlight(value), [value]);

  const place = (raw: string, from: number, to: number) => {
    const text = raw;
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
    const list = commands.filter((c) => canon(c.name).startsWith(cw) && canon(c.name) !== cw)
      .concat(commands.filter((c) => !canon(c.name).startsWith(cw) && canon(c.name).includes(cw) && cw.length >= 2))
      .slice(0, 7);
    setSugg(list.map((cmd) => ({ cmd, word: w, start: pos - w.length })));
    setSel(0);
  };

  /** Esc ครั้งเดียวปล่อยกับดัก Tab: กด Tab ต่อไปจะย้ายโฟกัสออกจากช่องโค้ด (เพื่อผู้ใช้คีย์บอร์ด) */
  const escaped = useRef(false);
  const IND = '  ';

  /**
   * แก้ข้อความด้วย execCommand เพื่อให้ Ctrl+Z / Ctrl+Y ย้อนทำของเบราว์เซอร์ใช้ได้เหมือนพิมพ์เอง
   * (ถ้าเบราว์เซอร์ไม่รองรับ ตกไปใช้ onChange ปกติ) แล้ววางเคอร์เซอร์/ช่วงที่เลือกตามที่ระบุ
   */
  const edit = (el: HTMLTextAreaElement, from: number, to: number, text: string, selFrom: number, selTo = selFrom) => {
    el.focus();
    el.setSelectionRange(from, to);
    let ok = false;
    try { ok = text === '' ? (to > from ? document.execCommand('delete') : true) : document.execCommand('insertText', false, text); } catch { ok = false; }
    if (!ok) { onChange(el.value.slice(0, from) + text + el.value.slice(to)); }
    const set = () => { el.setSelectionRange(selFrom, selTo); update(el.value, selTo); };
    set();
    requestAnimationFrame(set);
  };

  /** ช่วงบรรทัดที่เลือก (ไม่นับบรรทัดสุดท้ายถ้าการเลือกจบที่ต้นบรรทัด เหมือน VS Code) */
  const lineRange = (v: string, ss: number, se: number) => {
    const ls = v.lastIndexOf('\n', ss - 1) + 1;
    const end = se > ss && v[se - 1] === '\n' ? se - 1 : se;
    const nl = v.indexOf('\n', end);
    return { ls, le: nl < 0 ? v.length : nl };
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return; // กำลังพิมพ์ไทย/IME
    if (sugg.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => (s + 1) % sugg.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => (s - 1 + sugg.length) % sugg.length); return; }
      if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); const s = sugg[sel]; place(s.cmd.insert, s.start, s.start + s.word.length); return; }
      if (e.key === 'Escape') { e.preventDefault(); setSugg([]); return; }
    }
    const el = e.currentTarget;
    const v = el.value, ss = el.selectionStart, se = el.selectionEnd;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key;

    if (key === 'Escape') { escaped.current = true; return; }
    if (key === 'Tab' && escaped.current && !e.shiftKey) { escaped.current = false; return; }
    escaped.current = false;

    // ---- เยื้อง: Tab / Shift+Tab / Ctrl+] / Ctrl+[ ----
    const wantIndent = (key === 'Tab' && !e.shiftKey && !mod) || (mod && key === ']');
    const wantOutdent = (key === 'Tab' && e.shiftKey) || (mod && key === '[');
    if (wantIndent || wantOutdent) {
      e.preventDefault();
      const multi = v.slice(ss, se).includes('\n');
      if (wantIndent && !multi && !(mod && key === ']')) { edit(el, ss, se, IND, ss + IND.length); return; }
      const { ls, le } = lineRange(v, ss, se);
      const lines = v.slice(ls, le).split('\n');
      if (wantIndent) {
        edit(el, ls, le, lines.map((l) => IND + l).join('\n'), ss + IND.length, se + IND.length * lines.length);
      } else {
        let first = 0, total = 0;
        const out = lines.map((l, i) => {
          const m = /^( {1,2}|\t)/.exec(l); const n = m ? m[0].length : 0;
          if (i === 0) first = n; total += n; return l.slice(n);
        });
        edit(el, ls, le, out.join('\n'), Math.max(ls, ss - first), Math.max(ls, se - total));
      }
      return;
    }

    // ---- Enter: คงการเยื้อง · เปิดปีกกาแล้วเยื้องเพิ่ม · Ctrl+Enter เพิ่มบรรทัดล่าง · Ctrl+Shift+Enter เพิ่มบรรทัดบน ----
    if (key === 'Enter' && !e.altKey) {
      e.preventDefault();
      const { ls, le } = lineRange(v, ss, ss);
      const indent = /^[ \t]*/.exec(v.slice(ls, le))![0];
      if (mod) {
        if (e.shiftKey) edit(el, ls, ls, indent + '\n', ls + indent.length);
        else edit(el, le, le, '\n' + indent, le + 1 + indent.length);
        return;
      }
      const prev = v[ss - 1], next = v[se];
      if (prev === '{' && next === '}') edit(el, ss, se, `\n${indent}${IND}\n${indent}`, ss + 1 + indent.length + IND.length);
      else if (prev === '{') edit(el, ss, se, `\n${indent}${IND}`, ss + 1 + indent.length + IND.length);
      else edit(el, ss, se, '\n' + indent, ss + 1 + indent.length);
      return;
    }

    // ---- คอมเมนต์บรรทัด: Ctrl+/ ----
    if (mod && (key === '/' || key === '?')) {
      e.preventDefault();
      const { ls, le } = lineRange(v, ss, se);
      const lines = v.slice(ls, le).split('\n');
      const all = lines.every((l) => l.trim() === '' || /^\s*\/\//.test(l));
      const col = Math.min(...lines.filter((l) => l.trim()).map((l) => /^\s*/.exec(l)![0].length), 1e9);
      let d0 = 0, dAll = 0;
      const out = lines.map((l, i) => {
        if (l.trim() === '') return l;
        let nl: string;
        if (all) nl = l.replace(/^(\s*)\/\/ ?/, '$1'); else nl = l.slice(0, col) + '// ' + l.slice(col);
        const d = nl.length - l.length; if (i === 0) d0 = d; dAll += d; return nl;
      });
      edit(el, ls, le, out.join('\n'), Math.max(ls, ss + d0), ss === se ? Math.max(ls, ss + d0) : se + dAll);
      return;
    }

    // ---- ย้าย/คัดลอกบรรทัด: Alt+↑↓ · Shift+Alt+↑↓ ----
    if (e.altKey && !mod && (key === 'ArrowUp' || key === 'ArrowDown')) {
      e.preventDefault();
      const { ls, le } = lineRange(v, ss, se);
      const block = v.slice(ls, le);
      if (e.shiftKey) {
        if (key === 'ArrowDown') edit(el, le, le, '\n' + block, ss + block.length + 1, se + block.length + 1);
        else edit(el, ls, ls, block + '\n', ss, se);
        return;
      }
      if (key === 'ArrowUp') {
        if (ls === 0) return;
        const pls = v.lastIndexOf('\n', ls - 2) + 1, prev = v.slice(pls, ls - 1);
        edit(el, pls, le, block + '\n' + prev, ss - prev.length - 1, se - prev.length - 1);
      } else {
        if (le >= v.length) return;
        const nle = (() => { const i = v.indexOf('\n', le + 1); return i < 0 ? v.length : i; })();
        const nxt = v.slice(le + 1, nle);
        edit(el, ls, nle, nxt + '\n' + block, ss + nxt.length + 1, se + nxt.length + 1);
      }
      return;
    }

    // ---- ลบบรรทัด: Ctrl+Shift+K · เลือกบรรทัด: Ctrl+L ----
    if (mod && e.shiftKey && (key === 'K' || key === 'k')) {
      e.preventDefault();
      const { ls, le } = lineRange(v, ss, se);
      if (le < v.length) edit(el, ls, le + 1, '', ls);
      else if (ls > 0) edit(el, ls - 1, le, '', ls - 1);
      else edit(el, ls, le, '', 0);
      return;
    }
    if (mod && !e.shiftKey && (key === 'l' || key === 'L')) {
      e.preventDefault();
      const { ls, le } = lineRange(v, ss, se);
      el.setSelectionRange(ls, Math.min(v.length, le + 1));
      return;
    }

    // ---- Ctrl+D: เลือกคำ แล้วกดซ้ำเพื่อไปที่คำเดียวกันถัดไป · Ctrl+S กันเบราว์เซอร์เปิดหน้าบันทึก ----
    if (mod && !e.shiftKey && (key === 'd' || key === 'D')) {
      e.preventDefault();
      if (ss === se) {
        let a = ss, b = ss;
        while (a > 0 && /\w/.test(v[a - 1])) a--;
        while (b < v.length && /\w/.test(v[b])) b++;
        el.setSelectionRange(a, b);
      } else {
        const word = v.slice(ss, se);
        let i = v.indexOf(word, se); if (i < 0) i = v.indexOf(word);
        if (i >= 0) { el.setSelectionRange(i, i + word.length); const line = v.slice(0, i).split('\n').length - 1; const top = line * LINE; if (top < el.scrollTop || top > el.scrollTop + el.clientHeight - LINE * 2) el.scrollTop = Math.max(0, top - el.clientHeight / 2); }
      }
      return;
    }
    if (mod && (key === 's' || key === 'S')) { e.preventDefault(); return; }

    if (mod || e.altKey) return;

    // ---- วงเล็บ/เครื่องหมายคำพูดคู่: พิมพ์เปิดแล้วปิดให้ · พิมพ์ปิดซ้ำข้ามไป · ลบเปิดแล้วลบปิดให้ ----
    const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
    if (key === 'Backspace' && ss === se && ss > 0 && PAIRS[v[ss - 1]] === v[ss]) {
      e.preventDefault(); edit(el, ss - 1, ss + 1, '', ss - 1); return;
    }
    if (key in PAIRS) {
      const close = PAIRS[key];
      if (ss !== se) { e.preventDefault(); edit(el, ss, se, key + v.slice(ss, se) + close, ss + 1, se + 1); return; }
      const next = v[ss] ?? '', prev = v[ss - 1] ?? '';
      if ((key === '"' || key === "'") && next === key) { e.preventDefault(); el.setSelectionRange(ss + 1, ss + 1); return; }
      const quoteInWord = (key === '"' || key === "'") && /[\w]/.test(prev);
      if (!quoteInWord && (next === '' || /[\s)\]};,]/.test(next))) { e.preventDefault(); edit(el, ss, ss, key + close, ss + 1); return; }
      return;
    }
    if ((key === ')' || key === ']' || key === '}') && ss === se && v[ss] === key) { e.preventDefault(); el.setSelectionRange(ss + 1, ss + 1); return; }
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
    <div className={fill ? 'flex h-full min-h-0 flex-col' : 'grid gap-2'}>
      <div className={`flex flex-wrap gap-1.5 ${fill ? 'border-b border-line bg-surface-2/40 px-3 py-2' : ''}`} role="group" aria-label="แทรกคำสั่งที่ใช้บ่อย">
        <span className="mr-1 self-center text-sm text-muted-foreground">แทรกเร็ว:</span>
        {commands.filter((c) => c.quick).map((c) => (
          <button key={c.name} type="button" onClick={() => insertQuick(c)} title={c.desc} className="min-h-8 squircle-xl border border-line bg-surface-2 px-2.5 font-mono text-sm font-semibold text-blue-700 transition-colors hover:bg-muted dark:text-sky-300">{c.insert.replace(/\[\[|\]\]/g, '').replace(/\(.*\);$/, '()')}</button>
        ))}
      </div>

      <div className={`relative grid grid-cols-[auto_minmax(0,1fr)] overflow-hidden bg-[#fbfbfd] font-mono text-sm leading-6 dark:bg-[#10131a] ${fill ? 'min-h-0 flex-1' : 'squircle-2xl border border-line focus-within:border-brand-blue'}`}>
        <div aria-hidden className="select-none overflow-hidden border-r border-line bg-surface-2/60 px-2 py-3 text-right text-zinc-400" style={fill ? undefined : { minHeight: rows * LINE + 24 }}>
          <div style={{ transform: `translateY(${-scroll.top}px)` }}>{Array.from({ length: Math.max(lines, rows) }, (_, i) => <div key={i} className="h-6">{i + 1}</div>)}</div>
        </div>
        <div className="relative min-w-0 overflow-hidden" style={fill ? undefined : { height: rows * LINE + 24 }}>
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
              style={{ top: Math.min((caret.line + 1) * LINE + 12 - scroll.top + 2, fill ? 9999 : rows * LINE - 8), left: Math.min(12 + caret.col * 8.4 - scroll.left, 120) }}>
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
