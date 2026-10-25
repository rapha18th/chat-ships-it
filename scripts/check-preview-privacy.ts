import 'dotenv/config';
import { WebSocket } from 'ws';
import assert from 'node:assert/strict';
const base = process.env.SMOKE_URL || 'http://127.0.0.1:4310';
const owner = await (
  await fetch(`${base}/api/state`, {
    headers: { Authorization: `Bearer ${process.env.ADMIN_TOKEN || ''}` },
  })
).json();
assert.ok(owner.draft, 'Create a game preview before this check');
const ws = new WebSocket(base.replace('http', 'ws') + '/ws');
await new Promise<void>((resolve, reject) => {
  let stage = 0;
  const timer = setTimeout(() => {
    ws.terminate();
    reject(new Error('Preview authentication check timed out'));
  }, 5000);
  ws.on('error', reject);
  ws.on('message', (raw) => {
    try {
      const state = JSON.parse(raw.toString()).state;
      if (!state) return;
      if (stage === 0) {
        assert.equal(state.draft, null);
        assert.ok(!state.source.includes(owner.draft.id));
        assert.ok(!JSON.stringify(state.feed).includes(owner.draft.title));
        stage++;
        ws.send(JSON.stringify({ type: 'authenticate', token: process.env.ADMIN_TOKEN || '' }));
      } else {
        assert.equal(state.draft.id, owner.draft.id);
        assert.ok(state.source.includes(owner.draft.id));
        clearTimeout(timer);
        ws.close();
        resolve();
      }
    } catch (error) {
      clearTimeout(timer);
      ws.terminate();
      reject(error);
    }
  });
});
console.log(
  'PASS: spectator gets no unpublished blueprint or draft feed; authenticated owner receives playable preview.',
);
