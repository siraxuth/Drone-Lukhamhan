import assert from 'node:assert/strict';
import { test } from 'node:test';
import { POST } from '../src/app/api/simulator/phone/route';

async function createPair(requestUrl: string, headers: Record<string, string>) {
  const response = await POST(new Request(requestUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ op: 'create' }),
  }));
  assert.equal(response.status, 200);
  return response.json();
}

test('pairing replaces the proxy port with the public HTTPS origin', async () => {
  const internal = 'http://web:3000/api/simulator/phone';
  const expected = 'https://drone.dekgp.com/simulator/controller';
  const variants: Record<string, string>[] = [
    { host: 'drone.dekgp.com', 'x-forwarded-proto': 'https' },
    { host: 'web:3000', 'x-forwarded-host': 'drone.dekgp.com', 'x-forwarded-proto': 'https' },
    { host: 'web:3000', origin: 'https://drone.dekgp.com' },
  ];
  for (const headers of variants) {
    const pair = await createPair(internal, headers);
    assert.deepEqual(pair.addresses, [expected]);
    assert.equal(pair.url, `${expected}#${pair.code}`);
  }
});

test('pairing keeps the port when visiting a LAN server directly', async () => {
  const pair = await createPair('http://localhost:3000/api/simulator/phone', {
    host: '192.168.1.12:3098',
  });
  const expected = 'http://192.168.1.12:3098/simulator/controller';
  assert.deepEqual(pair.addresses, [expected]);
  assert.equal(pair.url, `${expected}#${pair.code}`);
});
