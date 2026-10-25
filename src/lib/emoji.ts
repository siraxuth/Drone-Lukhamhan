/**
 * Facebook/Messenger ฝังอิโมจิเป็นแท็ก <img alt="🎉" src=".../emoji.php/..."> ตอนคัดลอก
 * ถ้าปล่อยไว้ ตัวแก้ข้อความจะนับเป็นรูปภาพ (ได้ภาพเล็กๆ แทนตัวอิโมจิ)
 * ฟังก์ชันนี้แปลงกลับเป็นตัวอักษรอิโมจิจริงจากค่า alt · รูปจริงของผู้ใช้ไม่ถูกแตะ
 * (ไม่มี dependency ใช้ได้ทั้งฝั่งเบราว์เซอร์และเซิร์ฟเวอร์)
 */
const EMOJI_ONLY = /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Regional_Indicator}‍️⃣\s0-9#*]+$/u;
const NON_ASCII = /[^\x00-\x7f]/;

export function emojiImgToText(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const alt = /\balt\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ?? /\balt\s*=\s*'([^']*)'/i.exec(tag)?.[1];
    if (!alt || alt.length > 24 || !NON_ASCII.test(alt) || !EMOJI_ONLY.test(alt)) return tag;
    return alt.replace(/&amp;/g, '&');
  });
}
