'use client';

import { useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { emojiImgToText } from '@/lib/emoji';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { TableKit } from '@tiptap/extension-table';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Crop, Heading1, Heading2, Heading3, Highlighter, ImagePlus, Images, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2,
  Strikethrough, Table2, Trash2, Underline, Undo2, Unlink, Upload,
} from 'lucide-react';
import { MediaPickerDialog } from '@/components/image/MediaPickerDialog';
import { useCropFlow } from '@/components/image/useCropFlow';

/** รูปในเนื้อหา: เก็บขนาด (% ความกว้าง) และการจัดวางเป็น data-attribute (CSS ใน globals.css เป็นคนกำหนดค่าจริง) */
const RichImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-w': { default: '100', parseHTML: (el) => el.getAttribute('data-w') ?? '100', renderHTML: (a) => ({ 'data-w': a['data-w'] }) },
      'data-align': { default: 'left', parseHTML: (el) => el.getAttribute('data-align') ?? 'left', renderHTML: (a) => ({ 'data-align': a['data-align'] }) },
    };
  },
});

const imgFile = (f?: File | null) => (f && /^image\/(png|jpe?g|webp|avif|gif)$/.test(f.type) ? f : null);

/** ตัวแก้ข้อความแบบเห็นผลทันที (WYSIWYG) · รูป ตาราง จัดชิด ไฮไลต์ · ส่งค่าเป็น HTML ใน input ชื่อ `name` */
export function RichEditor({ name, initial = '', placeholder = 'พิมพ์เนื้อหาที่นี่…', minHeight = '14rem', id }: { name: string; initial?: string; placeholder?: string; minHeight?: string; id?: string }) {
  const [html, setHtml] = useState(initial);
  const [lib, setLib] = useState(false);
  const [status, setStatus] = useState('');
  const mode = useRef<'insert' | 'replace'>('insert');
  const ed = useRef<Editor | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const { start, dialog } = useCropFlow({
    folder: 'content', defaultAspect: 'orig', title: 'ครอบรูปในเนื้อหา', onStatus: setStatus,
    onUploaded: (src) => {
      const c = ed.current?.chain().focus();
      if (!c) return;
      if (mode.current === 'replace') c.updateAttributes('image', { src }).run();
      else c.setImage({ src, alt: '' }).run();
    },
  });
  const pick = (f: File) => { mode.current = 'insert'; start(f); };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true } }),
      Placeholder.configure({ placeholder }),
      RichImage.configure({ inline: false }),
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TableKit.configure({ table: { resizable: false } }),
    ],
    content: initial,
    editorProps: {
      // วางจาก Facebook: อิโมจิมาเป็น <img alt="🎉"> แปลงกลับเป็นตัวอักษรก่อน ไม่ให้กลายเป็นรูป
      transformPastedHTML: emojiImgToText,
      attributes: { id: id ?? '', class: 'rich min-h-[var(--min)] px-4 py-3 outline-none', style: `--min:${minHeight}`, 'aria-label': 'เนื้อหา' },
      handleDrop: (_v, e) => { const f = imgFile((e as DragEvent).dataTransfer?.files?.[0]); if (!f) return false; e.preventDefault(); pick(f); return true; },
      handlePaste: (_v, e) => { const f = imgFile((e as ClipboardEvent).clipboardData?.files?.[0]); if (!f) return false; e.preventDefault(); pick(f); return true; },
    },
    onCreate: ({ editor: e }) => { ed.current = e; },
    onUpdate: ({ editor: e }) => setHtml(e.isEmpty ? '' : e.getHTML()),
  });
  if (editor) ed.current = editor;

  return (
    <div className="squircle-2xl border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <input type="hidden" name={name} value={html} />
      <input ref={file} type="file" accept="image/webp,image/jpeg,image/png,image/avif,image/gif" hidden onChange={(e) => { const f = imgFile(e.target.files?.[0]); if (f) pick(f); e.target.value = ''; }} />
      {editor && (
        <Toolbar
          editor={editor}
          upload={() => file.current?.click()}
          library={() => { mode.current = 'insert'; setLib(true); }}
          recrop={() => { const src = editor.getAttributes('image').src as string | undefined; if (src) { mode.current = 'replace'; start(src); } }}
        />
      )}
      <EditorContent editor={editor} />
      {status && <p role="status" className="border-t border-line px-4 py-2 text-sm text-muted-foreground">{status}</p>}
      {dialog}
      <MediaPickerDialog open={lib} onOpenChange={setLib} uploadFolder="content" onPick={(src) => editor?.chain().focus().setImage({ src, alt: '' }).run()} />
    </div>
  );
}

function Toolbar({ editor, upload, library, recrop }: { editor: Editor; upload: () => void; library: () => void; recrop: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'), strike: e.isActive('strike'), mark: e.isActive('highlight'),
      h1: e.isActive('heading', { level: 1 }), h2: e.isActive('heading', { level: 2 }), h3: e.isActive('heading', { level: 3 }),
      ul: e.isActive('bulletList'), ol: e.isActive('orderedList'), quote: e.isActive('blockquote'), link: e.isActive('link'),
      left: e.isActive({ textAlign: 'left' }), center: e.isActive({ textAlign: 'center' }), right: e.isActive({ textAlign: 'right' }),
      image: e.isActive('image'), iw: String(e.getAttributes('image')['data-w'] ?? '100'), ia: String(e.getAttributes('image')['data-align'] ?? 'left'),
      table: e.isActive('table'), undo: e.can().undo(), redo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  const btn = (label: string, on: boolean, run: () => void, Icon: typeof Bold, disabled = false) => (
    <button key={label} type="button" aria-label={label} title={label} aria-pressed={on} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={run}
      className={`grid size-10 shrink-0 place-items-center squircle-xl transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40 ${on ? 'bg-brand-blue/15 text-brand-blue' : ''}`}>
      <Icon className="size-5" aria-hidden />
    </button>
  );
  const sep = (k: string) => <span key={k} className="mx-1 h-5 w-px bg-line" aria-hidden />;
  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('ลิงก์ (https://…)', prev ?? 'https://');
    if (url === null) return;
    if (url === '') c().extendMarkRange('link').unsetLink().run();
    else c().extendMarkRange('link').setLink({ href: url }).run();
  };
  const align = (a: 'left' | 'center' | 'right') => (s.image ? c().updateAttributes('image', { 'data-align': a }).run() : c().setTextAlign(a).run());
  const chip = (label: string, on: boolean, run: () => void) => (
    <button key={label} type="button" aria-pressed={on} onMouseDown={(e) => e.preventDefault()} onClick={run} className={`min-h-9 squircle-xl border px-2.5 text-sm ${on ? 'border-brand-blue bg-brand-blue/10 text-brand-blue' : 'border-line hover:bg-surface-2'}`}>{label}</button>
  );

  return (
    <div role="toolbar" aria-label="จัดรูปแบบข้อความ" className="border-b border-line">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5">
        {btn('ย้อนกลับ', false, () => c().undo().run(), Undo2, !s.undo)}
        {btn('ทำซ้ำ', false, () => c().redo().run(), Redo2, !s.redo)}
        {sep('a')}
        {btn('หัวข้อ 1', s.h1, () => c().toggleHeading({ level: 1 }).run(), Heading1)}
        {btn('หัวข้อ 2', s.h2, () => c().toggleHeading({ level: 2 }).run(), Heading2)}
        {btn('หัวข้อ 3', s.h3, () => c().toggleHeading({ level: 3 }).run(), Heading3)}
        {sep('b')}
        {btn('ตัวหนา', s.bold, () => c().toggleBold().run(), Bold)}
        {btn('ตัวเอียง', s.italic, () => c().toggleItalic().run(), Italic)}
        {btn('ขีดเส้นใต้', s.underline, () => c().toggleUnderline().run(), Underline)}
        {btn('ขีดฆ่า', s.strike, () => c().toggleStrike().run(), Strikethrough)}
        {btn('ไฮไลต์', s.mark, () => c().toggleHighlight().run(), Highlighter)}
        {sep('c')}
        {btn('ชิดซ้าย', s.image ? s.ia === 'left' : s.left, () => align('left'), AlignLeft)}
        {btn('กึ่งกลาง', s.image ? s.ia === 'center' : s.center, () => align('center'), AlignCenter)}
        {btn('ชิดขวา', s.image ? s.ia === 'right' : s.right, () => align('right'), AlignRight)}
        {sep('d')}
        {btn('รายการ', s.ul, () => c().toggleBulletList().run(), List)}
        {btn('รายการเรียงเลข', s.ol, () => c().toggleOrderedList().run(), ListOrdered)}
        {sep('e')}
        {btn('อ้างอิง', s.quote, () => c().toggleBlockquote().run(), Quote)}
        {btn('เส้นคั่น', false, () => c().setHorizontalRule().run(), Minus)}
        {sep('f')}
        {btn('อัปโหลดรูป (ครอบตัดก่อน)', false, upload, Upload)}
        {btn('เลือกรูปจากคลัง', false, library, Images)}
        {sep('g')}
        {btn('ใส่ลิงก์', s.link, setLink, Link2)}
        {btn('เอาลิงก์ออก', false, () => c().unsetLink().run(), Unlink, !s.link)}
        {sep('h')}
        {btn('แทรกตาราง', s.table, () => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), Table2)}
      </div>

      {s.image && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold"><ImagePlus className="size-4" aria-hidden /> รูปที่เลือก</span>
          {(['25', '50', '75', '100'] as const).map((w) => chip(`${w}%`, s.iw === w, () => c().updateAttributes('image', { 'data-w': w }).run()))}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={recrop} className="inline-flex min-h-9 items-center gap-1.5 squircle-xl border border-line px-2.5 text-sm hover:bg-surface"><Crop className="size-4" aria-hidden /> ครอบตัดใหม่</button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => c().deleteSelection().run()} className="inline-flex min-h-9 items-center gap-1.5 squircle-xl border border-line px-2.5 text-sm text-brand-red hover:bg-surface"><Trash2 className="size-4" aria-hidden /> เอารูปออก</button>
        </div>
      )}
      {s.table && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold"><Table2 className="size-4" aria-hidden /> ตาราง</span>
          {chip('+ แถวล่าง', false, () => c().addRowAfter().run())}
          {chip('+ แถวบน', false, () => c().addRowBefore().run())}
          {chip('+ คอลัมน์ขวา', false, () => c().addColumnAfter().run())}
          {chip('+ คอลัมน์ซ้าย', false, () => c().addColumnBefore().run())}
          {chip('ลบแถว', false, () => c().deleteRow().run())}
          {chip('ลบคอลัมน์', false, () => c().deleteColumn().run())}
          {chip('หัวตาราง', false, () => c().toggleHeaderRow().run())}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => c().deleteTable().run()} className="inline-flex min-h-9 items-center gap-1.5 squircle-xl border border-line px-2.5 text-sm text-brand-red hover:bg-surface"><Trash2 className="size-4" aria-hidden /> ลบตาราง</button>
        </div>
      )}
    </div>
  );
}
