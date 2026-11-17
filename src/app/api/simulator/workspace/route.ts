import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { readWorkspace } from '@/flight/workspace';

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบเพื่อซิงก์ข้ามอุปกรณ์' }, { status: 401 });
  const text = await request.text();
  if (text.length > 1_000_000) return NextResponse.json({ error: 'ข้อมูลมากเกินไป' }, { status: 413 });
  let payload: unknown;
  try { payload = JSON.parse(text); } catch { return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 }); }
  const data = readWorkspace(payload);
  if (!data) return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  await db.simulatorWorkspace.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, data },
    update: { data },
  });
  return NextResponse.json({ ok: true });
}
