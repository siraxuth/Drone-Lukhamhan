/** แปลงลิงก์ YouTube ทุกแบบ (watch, youtu.be, shorts, live, embed) เป็นรหัสวิดีโอ · ไม่ใช่ YouTube คืน null */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else id = u.pathname.match(/^\/(?:shorts|live|embed|v)\/([^/?]+)/)?.[1] ?? null;
    }
    return id && /^[\w-]{6,15}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
