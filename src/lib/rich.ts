import sanitizeHtml from 'sanitize-html';
import { emojiImgToText } from './emoji';

const allowed: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'mark', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'colgroup', 'col'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'data-w', 'data-align'],
    p: ['style'], h1: ['style'], h2: ['style'], h3: ['style'],
    td: ['colspan', 'rowspan', 'data-colwidth'], th: ['colspan', 'rowspan', 'data-colwidth'],
  },
  allowedStyles: { '*': { 'text-align': [/^(left|center|right|justify)$/] } },
  allowedClasses: {},
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: { a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }) },
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** ข้อความเก่าที่เป็นตัวอักษรล้วน (ไม่มีแท็ก) → ย่อหน้า HTML · ที่เป็น HTML อยู่แล้วคืนตามเดิม */
export function toHtml(src: string): string {
  if (/<\/?[a-z][\s\S]*>/i.test(src)) return src;
  return src.split(/\n\s*\n/).filter((p) => p.trim()).map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
}

/** ทำความสะอาด HTML ก่อนบันทึกและก่อนแสดงผล (กัน script/ลิงก์อันตราย) */
export const clean = (html: string) => sanitizeHtml(emojiImgToText(toHtml(html)), allowed);

/** ตัดแท็กออกเหลือข้อความล้วน ใช้ทำคำสรุปบนการ์ด */
export const plain = (html: string) => sanitizeHtml(toHtml(html), { allowedTags: [], allowedAttributes: {} }).replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
