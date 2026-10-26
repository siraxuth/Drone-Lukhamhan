import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * ด่านแรกของ /learn: ไม่มีคุกกี้ session → ไปหน้า login แล้วกลับมาที่หน้าเดิม
 * (ตรวจแค่การมีคุกกี้ เพื่อความเร็ว การตรวจจริงอยู่ที่ layout ของ /learn ฝั่งเซิร์ฟเวอร์)
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const url = new URL('/login', request.url);
  url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/learn/:path*'] };
