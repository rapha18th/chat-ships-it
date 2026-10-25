import 'dotenv/config';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { writeFile, mkdir } from 'node:fs/promises';
import type { HiveState } from '../packages/core/src/hive.ts';
const base = process.env.HIVE_URL || 'http://127.0.0.1:4311';
const health = await (await fetch(`${base}/api/health`)).json();
assert.equal(health.multiplayer, true);
const initial: HiveState = await (await fetch(`${base}/api/hive`)).json();
assert.equal(initial.enabled, true);
const clients: Array<{
  ws: WebSocket;
  id: string;
  frames: Map<number, HiveState>;
  sequence: number;
}> = [];
try {
  for (let i = 0; i < 3; i++) {
    const ws = new WebSocket(base.replace('http', 'ws') + '/hive'),
      client = { ws, id: '', frames: new Map<number, HiveState>(), sequence: 0 };
    clients.push(client);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Join timed out')), 5000);
      ws.once('open', () =>
        ws.send(JSON.stringify({ type: 'hive-join', name: `Verification ${i + 1}` })),
      );
      ws.on('message', (raw) => {
        const m = JSON.parse(raw.toString());
        if (m.type === 'hive-welcome') {
          client.id = m.id;
          clearTimeout(timeout);
          resolve();
        }
        if (m.type === 'hive-state') client.frames.set(m.state.tick, m.state);
      });
      ws.once('error', reject);
    });
  }
  const response = await fetch(`${base}/api/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.ADMIN_TOKEN ? { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` } : {}),
    },
    body: JSON.stringify({ action: 'hive-start' }),
  });
  assert.ok(response.ok, await response.text());
  const before: HiveState = await (await fetch(`${base}/api/hive`)).json();
  const send = setInterval(
    () =>
      clients.forEach((c, i) =>
        c.ws.send(
          JSON.stringify({
            type: 'hive-input',
            dx: i === 0 ? 1 : i === 1 ? -1 : 0,
            dy: i === 2 ? 1 : 0,
            sequence: ++c.sequence,
          }),
        ),
      ),
    60,
  );
  await new Promise((r) => setTimeout(r, 1200));
  clearInterval(send);
  const after: HiveState = await (await fetch(`${base}/api/hive`)).json();
  assert.equal(after.phase, 'playing');
  for (const c of clients) {
    const a = after.players.find((p) => p.id === c.id)!,
      b = before.players.find((p) => p.id === c.id)!;
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 100);
  }
  const tick = [...clients[0].frames.keys()].findLast((t) => clients.every((c) => c.frames.has(t)));
  assert.ok(tick);
  for (const c of clients.slice(1))
    assert.deepEqual(c.frames.get(tick!), clients[0].frames.get(tick!));
  await mkdir('artifacts/film', { recursive: true });
  await writeFile(
    'artifacts/film/multiplayer-verification.json',
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        clients: 3,
        tick,
        snapshot: clients[0].frames.get(tick!),
        checks: [
          'three independent connections',
          'server-owned movement',
          'identical shared snapshots',
          'shared timer and score',
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    'PASS: three independent clients moved distinct bees and received identical shared-world snapshots.',
  );
} finally {
  clients.forEach((c) => c.ws.close());
}
await new Promise((r) => setTimeout(r, 200));
const end: HiveState = await (await fetch(`${base}/api/hive`)).json();
assert.ok(clients.every((c) => !end.players.some((p) => p.id === c.id)));
console.log('PASS: disconnected players released their seats.');
