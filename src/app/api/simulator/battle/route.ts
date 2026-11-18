import type { NextRequest } from 'next/server';
import { actorFor, failure, readAction, remember, response } from '@/battle/http';
import { createInput, createRoom } from '@/battle/server';

export async function POST(request: NextRequest) {
  try {
    const parsed = createInput.safeParse(await readAction(request));
    if (!parsed.success) return response({ error: 'ตรวจชื่อ โจทย์ และตัวเลือกห้องอีกครั้ง' }, 400);
    const { code, token } = await createRoom(await actorFor(request), parsed.data);
    return remember(response({ code }, 201), code, token);
  } catch (error) {
    return failure(error);
  }
}
