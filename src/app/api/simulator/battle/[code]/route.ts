import type { NextRequest } from 'next/server';
import { actorFor, failure, readAction, remember, response } from '@/battle/http';
import { act, actionInput, roomView } from '@/battle/server';

type Context = { params: Promise<{ code: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { code } = await params;
  if (!/^[0-9A-F]{8}$/.test(code)) return response({ error: 'รหัสห้องไม่ถูกต้อง' }, 404);
  try {
    const query = request.nextUrl.searchParams;
    return response(await roomView(code, await actorFor(request, code), query.get('replay'), Number(query.get('at') ?? 0)));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  const { code } = await params;
  if (!/^[0-9A-F]{8}$/.test(code)) return response({ error: 'รหัสห้องไม่ถูกต้อง' }, 404);
  try {
    const parsed = actionInput.safeParse(await readAction(request));
    if (!parsed.success) return response({ error: 'ข้อมูลไม่ครบ หรือโค้ดยาวเกินกำหนด' }, 400);
    const actor = await actorFor(request, code);
    const result = await act(code, actor, parsed.data);
    const { token, ...data } = result as typeof result & { token?: string };
    return token ? remember(response(data), code, token, actor.watchOnly) : response(data);
  } catch (error) {
    return failure(error);
  }
}
