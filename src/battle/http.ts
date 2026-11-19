import 'server-only';

import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { RuleError } from './rules';
import { cookieName } from './server';

export async function actorFor(request: NextRequest, code = '') {
  const watchOnly = !!code && request.nextUrl.searchParams.get('role') === 'watch';
  if (watchOnly) return { userId: null, watchOnly, token: request.cookies.get(cookieName(code, true))?.value };
  const session = await getSession();
  return { userId: session?.user.id ?? null, token: code ? request.cookies.get(cookieName(code))?.value : undefined };
}

export async function readAction(request: NextRequest) {
  const origin = request.headers.get('origin');
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0].trim() ?? request.headers.get('host');
  if (origin && (!/^https?:\/\//.test(origin) || new URL(origin).host !== forwarded)) throw new RuleError('คำขอมาจากนอกเว็บไซต์', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new RuleError('ส่งข้อมูลเป็น JSON', 400);
  const reader = request.body?.getReader();
  if (!reader) throw new RuleError('ไม่มีข้อมูล', 400);
  const decoder = new TextDecoder();
  let size = 0, body = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 100_000) {
      await reader.cancel();
      throw new RuleError('ข้อมูลยาวเกินไป', 413);
    }
    body += decoder.decode(value, { stream: true });
  }
  try { return JSON.parse(body + decoder.decode()) as unknown; }
  catch { throw new RuleError('อ่านข้อมูลที่ส่งมาไม่ได้', 400); }
}

export function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export function remember(result: NextResponse, code: string, token: string, watchOnly = false) {
  result.cookies.set(cookieName(code, watchOnly), token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 180,
    path: `/api/simulator/battle/${code}`,
  });
  return result;
}

export function failure(error: unknown) {
  if (error instanceof RuleError) return response({ error: error.message }, error.status);
  console.error('Battle request failed', error instanceof Error ? error.message : 'unknown error');
  return response({ error: 'ติดต่อระบบห้องแข่งไม่ได้ ลองใหม่อีกครั้ง' }, 503);
}
