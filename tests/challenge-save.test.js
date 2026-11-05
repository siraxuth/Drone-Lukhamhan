import { test, expect, mock } from 'bun:test';
let allowed = true;
let failWrite = false;
let written;
const challenge = {
  findUnique: async () => ({ slug: 'existing-url' }),
  findMany: async () => [{ slug: 'ball-drop' }],
  create: async ({ data }) => { if (failWrite) throw new Error('test database failure'); written = data; return { id: 'saved-id', ...data }; },
  update: async ({ data }) => { written = data; return { id: 'existing-id', ...data }; },
};
mock.module('../src/lib/db', () => ({ db: { challenge, project: {}, season: {}, section: {} } }));
mock.module('../src/lib/auth', () => ({ requireRole: async () => allowed ? { user: { role: 'ADMIN' } } : null, getSession: async () => null }));
mock.module('next/cache', () => ({ revalidatePath: () => {} }));
const { saveChallenge } = await import('../src/app/admin/actions');
function form() {
  const f = new FormData();
  for (const [key,value] of Object.entries({ title: 'ปล่อยบอล', level: 'โหดมาก', config: JSON.stringify({ pattern: 'blank', event: 'mission', objects: [] }), order: '0', starter: 'void setup() {}' })) f.set(key,value);
  return f;
}
test('save returns an error without writing when fields or config are invalid', async () => {
  const f = form(); f.set('title','');
  expect((await saveChallenge('new',f)).ok).toBe(false);
  const g = form(); g.set('config','not-json');
  expect((await saveChallenge('new',g)).ok).toBe(false);
  expect(written).toBeUndefined();
});
test('save generates a distinct translated URL, honours level and enables payload', async () => {
  const result = await saveChallenge('new',form());
  expect(result).toEqual({ ok: true, id: 'saved-id', slug: 'ball-drop-2', published: false });
  expect(written.level).toBe('โหดมาก');
  expect(written.config.requiresPayload).toBe(true);
  expect(written).not.toHaveProperty('seasonId');
});
test('editing preserves the existing public link and honours publishing', async () => {
  const f=form(); f.set('published','on');
  expect(await saveChallenge('existing-id',f)).toEqual({ ok:true, id:'existing-id', slug:'existing-url', published:true });
});
test('save reports database errors instead of redirecting or losing the form', async () => {
  failWrite=true;
  const result=await saveChallenge('new',form());
  failWrite=false;
  expect(result.ok).toBe(false);
  expect(result.error).toContain('บันทึกไม่สำเร็จ');
});
test('unauthorized saves are rejected', async () => {
  allowed=false;
  expect((await saveChallenge('new',form())).ok).toBe(false);
  allowed=true;
});
