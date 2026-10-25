import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { Twitch } from './twitch.ts';
import { Round } from './round.ts';

test('EventSub welcome subscribes and switching accounts closes the old channel', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'chatships-test-'));
  const server = new WebSocketServer({ port: 0 });
  await new Promise<void>((r) => server.once('listening', r));
  const sockets: WebSocket[] = [];
  server.on('connection', (ws) => {
    sockets.push(ws);
    ws.send(
      JSON.stringify({
        metadata: { message_type: 'session_welcome' },
        payload: { session: { id: `session-${sockets.length}`, keepalive_timeout_seconds: 10 } },
      }),
    );
  });
  let account = 'first';
  const subscriptions: unknown[] = [];
  const request: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/token'))
      return Response.json({
        access_token: `fake-${account}`,
        refresh_token: 'fake-refresh',
        expires_in: 3600,
      });
    if (url.endsWith('/validate'))
      return Response.json({
        user_id: account,
        login: account,
        client_id: process.env.TWITCH_CLIENT_ID,
        scopes: ['user:read:chat'],
      });
    subscriptions.push(JSON.parse(String(init?.body)));
    return Response.json({ data: [] }, { status: 202 });
  };
  const round = new Round();
  const client = new Twitch(round, {
    request,
    authFile: join(dir, 'auth.json'),
    eventSubUrl: `ws://127.0.0.1:${(server.address() as { port: number }).port}`,
  });
  const until = async (check: () => boolean) => {
    for (let i = 0; i < 100; i++) {
      if (check()) return;
      await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error('Timed out waiting for EventSub state');
  };
  try {
    await client.accept('fake-code');
    await until(() => round.state.twitch.connected);
    assert.equal(round.state.twitch.channel, 'first');
    assert.equal(
      (subscriptions[0] as { condition: { broadcaster_user_id: string } }).condition
        .broadcaster_user_id,
      'first',
    );
    account = 'second';
    await client.accept('fake-code');
    await until(
      () =>
        sockets.length === 2 &&
        sockets[0].readyState === WebSocket.CLOSED &&
        subscriptions.length === 2,
    );
    assert.equal(round.state.twitch.channel, 'second');
    assert.equal(
      (subscriptions[1] as { condition: { user_id: string } }).condition.user_id,
      'second',
    );
  } finally {
    client.close();
    for (const socket of server.clients) socket.terminate();
    await new Promise<void>((r) => server.close(() => r()));
    await rm(dir, { recursive: true, force: true });
  }
});
