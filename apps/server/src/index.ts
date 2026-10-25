import 'dotenv/config';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { Round } from './round.ts';
import { codexBuilder } from './worker.ts';
import { Twitch } from './twitch.ts';
import { screen } from './screen.ts';
import { publicOrigin } from './config.ts';

const host = process.env.HOST || '127.0.0.1',
  port = Number(process.env.PORT || 4310);
const localOnly = ['127.0.0.1', '::1', 'localhost'].includes(host);
if (!localOnly && (!process.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN.length < 24))
  throw new Error('Set ADMIN_TOKEN to 24+ random characters before exposing the server.');
const app = Fastify({ logger: false, bodyLimit: 16000 });
const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
const round = new Round(
  (s) => {
    const message = JSON.stringify({ type: 'state', state: s });
    for (const client of wss.clients)
      if (client.readyState === WebSocket.OPEN) {
        if (client.bufferedAmount > 1e6) client.terminate();
        else client.send(message);
      }
  },
  process.env.ENABLE_CODEX === 'true' ? codexBuilder : undefined,
);
const twitch = new Twitch(round);
const origin = publicOrigin();
const authorized = (header: string | undefined) => {
  if (localOnly && !process.env.ADMIN_TOKEN) return true;
  const provided = Buffer.from(header?.replace(/^Bearer /, '') || ''),
    expected = Buffer.from(process.env.ADMIN_TOKEN || '');
  return provided.length === expected.length && timingSafeEqual(provided, expected);
};
const rate = new Map<string, { at: number; n: number }>();
app.addHook('onRequest', async (req, reply) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('Referrer-Policy', 'no-referrer');
  if (req.url.startsWith('/api/') || req.url.startsWith('/auth/')) {
    const key = req.ip,
      now = Date.now();
    let bucket = rate.get(key);
    if (!bucket || now - bucket.at > 60000) {
      bucket = { at: now, n: 0 };
      rate.set(key, bucket);
    }
    if (++bucket.n > 180)
      return reply.code(429).send({ error: 'Slow down and try again in a minute.' });
    if (rate.size > 5000) for (const [k, v] of rate) if (now - v.at > 60000) rate.delete(k);
  }
  if (req.url.startsWith('/api/') && req.method !== 'GET') {
    if (
      req.headers.origin &&
      req.headers.origin !== origin &&
      !(req.headers.origin === `http://127.0.0.1:${port}` && localOnly)
    )
      return reply.code(403).send({ error: 'Origin not allowed' });
    if (!req.headers['content-type']?.startsWith('application/json'))
      return reply.code(415).send({ error: 'JSON required' });
    if (!authorized(req.headers.authorization))
      return reply.code(401).send({ error: 'Enter your admin token in Settings.' });
  }
});
app.setErrorHandler((error, _req, reply) => {
  reply
    .code(error instanceof z.ZodError ? 400 : 409)
    .send({ error: error instanceof Error ? error.message : 'Request failed' });
});
app.get('/api/state', async () => round.state);
app.get('/api/health', async () => ({
  ok: true,
  codexEnabled: process.env.ENABLE_CODEX === 'true',
  geminiConfigured: !!process.env.GEMINI_API_KEY,
  twitchConfigured: !!process.env.TWITCH_CLIENT_ID && !!process.env.TWITCH_CLIENT_SECRET,
  adminRequired: !localOnly || !!process.env.ADMIN_TOKEN,
}));
app.post('/api/action', async (req, reply) => {
  const body = z
    .object({
      action: z.enum([
        'seed',
        'seed-live',
        'vote',
        'lock',
        'build',
        'rollback',
        'stop',
        'reset',
        'mode',
        'cast',
        'bet',
      ]),
      id: z.string().optional(),
      choice: z.enum(['ship', 'fail']).optional(),
      mode: z.enum(['live', 'rehearsal']).optional(),
    })
    .strict()
    .parse(req.body);
  switch (body.action) {
    case 'seed':
      round.seed();
      break;
    case 'seed-live':
      round.seed('live');
      break;
    case 'vote':
      round.voteStart(30);
      break;
    case 'lock':
      round.lockVote();
      break;
    case 'build':
      void round.build().catch((e) => round.log(e.message, 'fail'));
      return reply.code(202).send({ ok: true });
    case 'rollback':
      round.rollback();
      break;
    case 'stop':
      round.stop();
      break;
    case 'reset':
      round.reset();
      break;
    case 'mode':
      round.setMode(body.mode || 'rehearsal');
      break;
    case 'cast':
      round.vote('streamer-preview', body.id || '');
      break;
    case 'bet':
      round.bet('streamer-preview', body.choice || 'ship');
      break;
  }
  return { ok: true };
});
app.post('/api/proposal', async (req) => {
  const { idea, author } = z
    .object({ idea: z.string().min(8).max(240), author: z.string().regex(/^[A-Za-z0-9_]{1,25}$/) })
    .strict()
    .parse(req.body);
  if (round.state.mode !== 'live') throw new Error('Switch to live mode to screen free-form ideas');
  if (
    !['collecting', 'shipped', 'failed'].includes(round.state.phase) ||
    round.state.proposals.length >= 3
  )
    throw new Error('Proposal window is full or closed');
  const roundId = round.state.round;
  const result = await screen(idea);
  if (!result.accepted) throw new Error(result.reason);
  if (round.state.round !== roundId || round.state.mode !== 'live')
    throw new Error('Round changed during screening. Submit again.');
  return round.addProposal(author, result.spec, result.spec);
});
const oauthStates = new Map<string, number>();
app.post('/api/twitch/connect', async () => {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET)
    throw new Error('Add Twitch client ID and secret to .env and restart');
  const state = randomBytes(24).toString('hex');
  oauthStates.set(state, Date.now());
  for (const [k, t] of oauthStates) if (Date.now() - t > 600000) oauthStates.delete(k);
  return {
    url: `https://id.twitch.tv/oauth2/authorize?${new URLSearchParams({ client_id: process.env.TWITCH_CLIENT_ID, redirect_uri: `${origin}/auth/twitch/callback`, response_type: 'code', scope: 'user:read:chat', state, force_verify: 'true' })}`,
  };
});
app.get('/auth/twitch/callback', async (req, reply) => {
  const query = z.object({ code: z.string(), state: z.string() }).parse(req.query);
  const at = oauthStates.get(query.state);
  oauthStates.delete(query.state);
  if (!at || Date.now() - at > 600000)
    return reply.code(403).send('Authorization expired. Reconnect from Settings.');
  await twitch.accept(query.code);
  return reply.redirect('/?connected=twitch');
});
let vite: Awaited<ReturnType<typeof createViteServer>> | undefined;
const dist = resolve('apps/web/dist');
if (existsSync(resolve(dist, 'index.html'))) await app.register(fastifyStatic, { root: dist });
else {
  vite = await createViteServer({
    root: resolve('apps/web'),
    server: { middlewareMode: true, hmr: false },
    appType: 'spa',
  });
  app.setNotFoundHandler((req, reply) => {
    reply.hijack();
    vite!.middlewares(req.raw, reply.raw, () => {
      reply.raw.statusCode = 404;
      reply.raw.end('Not found');
    });
  });
}
app.server.on('upgrade', (req, socket, head) => {
  if (req.url !== '/ws') {
    socket.destroy();
    return;
  }
  if (
    req.headers.origin &&
    req.headers.origin !== origin &&
    !(localOnly && req.headers.origin === `http://127.0.0.1:${port}`)
  ) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    ws.send(JSON.stringify({ type: 'state', state: round.state }));
  });
});
await app.listen({ host, port });
console.log(
  `Chat Ships It is ready at ${origin} · ${process.env.ENABLE_CODEX === 'true' ? 'Codex enabled' : 'rehearsal ready'}`,
);
void twitch.restore();
const shutdown = async () => {
  twitch.close();
  round.stop();
  wss.close();
  for (const c of wss.clients) c.terminate();
  await vite?.close();
  await app.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
