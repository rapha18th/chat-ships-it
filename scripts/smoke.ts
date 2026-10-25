import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
const base = process.env.SMOKE_URL || 'http://localhost:4310';
async function act(action: string, extra: Record<string, string> = {}) {
  const r = await fetch(`${base}/api/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.ADMIN_TOKEN ? { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` } : {}),
    },
    body: JSON.stringify({ action, ...extra }),
  });
  assert.ok(r.ok, `${action}: ${await r.text()}`);
}
const state = async () => await (await fetch(`${base}/api/state`)).json();
assert.ok((await fetch(base)).ok);
assert.equal((await (await fetch(`${base}/api/health`)).json()).ok, true);
const ws = new WebSocket(base.replace('http', 'ws') + '/ws');
await new Promise<void>((resolve, reject) => {
  ws.once('message', (raw) => {
    assert.equal(JSON.parse(raw.toString()).type, 'state');
    resolve();
  });
  ws.once('error', reject);
});
ws.close();
const rejected = await fetch(`${base}/api/action`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
  body: JSON.stringify({ action: 'stop' }),
});
assert.equal(rejected.status, 403);
await act('stop');
await act('seed');
await act('vote');
const initial = await state();
await act('cast', { id: initial.proposals[1].id });
await act('lock');
await act('bet', { choice: 'ship' });
await act('build');
let result;
for (let i = 0; i < 20; i++) {
  result = await state();
  if (result.phase === 'shipped' || result.phase === 'failed') break;
  await new Promise((r) => setTimeout(r, 100));
}
assert.equal(result.phase, 'shipped');
assert.equal(result.active.id, 'gravity-betrayal');
assert.equal(result.gates.length, 4);
await act('rollback');
assert.equal((await state()).active.id, 'orbital');
await act('stop');
await act('seed');
console.log(
  'PASS: HTTP, WebSocket snapshot, cross-origin denial, vote, confidence, gate, ship, rollback, kill switch.',
);
