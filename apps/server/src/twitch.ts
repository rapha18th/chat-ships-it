import WebSocket from 'ws';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { Round } from './round.ts';
import { screen } from './screen.ts';
import { publicOrigin } from './config.ts';
import { dirname } from 'node:path';
type Auth = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  obtained: number;
  userId: string;
  login: string;
};
export class Twitch {
  private auth: Auth | null = null;
  private socket: WebSocket | null = null;
  private stopped = false;
  private seen = new Map<string, number>();
  private heartbeat: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoff = 1000;
  private screenings = new Map<string, number>();
  private screeningWindow = { at: Date.now(), count: 0 };
  private screeningInFlight = 0;
  private request: typeof fetch;
  private authFile: string;
  private eventSubUrl: string;
  constructor(
    private round: Round,
    options: { request?: typeof fetch; authFile?: string; eventSubUrl?: string } = {},
  ) {
    this.request = options.request || fetch;
    this.authFile = options.authFile || '.local/twitch-auth.json';
    this.eventSubUrl = options.eventSubUrl || 'wss://eventsub.wss.twitch.tv/ws';
  }
  async restore() {
    try {
      this.auth = JSON.parse(await readFile(this.authFile, 'utf8'));
      await this.validate();
      this.connect();
    } catch {
      this.auth = null;
    }
  }
  private async save() {
    await mkdir(dirname(this.authFile), { recursive: true });
    await writeFile(this.authFile, JSON.stringify(this.auth), { mode: 0o600 });
  }
  async accept(code: string) {
    const response = await this.request('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID!,
        client_secret: process.env.TWITCH_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${publicOrigin()}/auth/twitch/callback`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Twitch token exchange failed');
    const token = (await response.json()) as Auth;
    this.close();
    this.auth = { ...token, obtained: Date.now(), userId: '', login: '' };
    await this.validate();
    await this.save();
    this.stopped = false;
    this.connect();
  }
  private async refresh() {
    if (!this.auth) throw new Error('Twitch is not connected');
    const r = await this.request('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.auth.refresh_token,
        client_id: process.env.TWITCH_CLIENT_ID!,
        client_secret: process.env.TWITCH_CLIENT_SECRET!,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error('Twitch authorization expired. Reconnect in settings.');
    this.auth = { ...this.auth, ...((await r.json()) as object), obtained: Date.now() };
    await this.save();
  }
  private async validate() {
    if (!this.auth) throw new Error('Not authorized');
    if (Date.now() > this.auth.obtained + this.auth.expires_in * 1000 - 60000) await this.refresh();
    let r = await this.request('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `OAuth ${this.auth.access_token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (r.status === 401) {
      await this.refresh();
      r = await this.request('https://id.twitch.tv/oauth2/validate', {
        headers: { Authorization: `OAuth ${this.auth.access_token}` },
        signal: AbortSignal.timeout(10000),
      });
    }
    if (!r.ok) throw new Error('Twitch authorization invalid');
    const v = (await r.json()) as {
      user_id: string;
      login: string;
      client_id: string;
      scopes: string[];
    };
    if (v.client_id !== process.env.TWITCH_CLIENT_ID || !v.scopes.includes('user:read:chat'))
      throw new Error('Twitch chat scope missing');
    this.auth.userId = v.user_id;
    this.auth.login = v.login;
  }
  private async connect(url = this.eventSubUrl, handoff = false) {
    if (this.stopped || !this.auth) return;
    if (!handoff) {
      try {
        await this.validate();
      } catch {
        this.round.setTwitch(false, this.auth?.login || null);
        this.round.log('Twitch authentication needs attention. Reconnect from Settings.', 'fail');
        return;
      }
    }
    const previous = this.socket;
    const ws = new WebSocket(url);
    if (!handoff) {
      this.socket = ws;
      previous?.close();
    }
    let timeout = 20000;
    let welcome = false;
    const arm = () => {
      if (this.heartbeat) clearTimeout(this.heartbeat);
      this.heartbeat = setTimeout(() => ws.terminate(), timeout);
    };
    ws.on('message', async (raw) => {
      try {
        if (ws !== this.socket && !handoff) return;
        const data = JSON.parse(raw.toString());
        const type = data.metadata.message_type;
        if (type === 'session_welcome') {
          welcome = true;
          this.socket = ws;
          timeout = (data.payload.session.keepalive_timeout_seconds || 10) * 1000 + 2000;
          arm();
          if (handoff) {
            previous?.close();
          } else {
            const response = await this.request(
              'https://api.twitch.tv/helix/eventsub/subscriptions',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${this.auth!.access_token}`,
                  'Client-Id': process.env.TWITCH_CLIENT_ID!,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  type: 'channel.chat.message',
                  version: '1',
                  condition: { broadcaster_user_id: this.auth!.userId, user_id: this.auth!.userId },
                  transport: { method: 'websocket', session_id: data.payload.session.id },
                }),
                signal: AbortSignal.timeout(8000),
              },
            );
            if (!response.ok) throw new Error('Twitch chat subscription failed');
          }
          this.backoff = 1000;
          this.round.setTwitch(true, this.auth!.login);
          this.round.log('Twitch EventSub connected. Chat commands are live.');
          return;
        }
        if (ws === this.socket) arm();
        if (type === 'session_reconnect') {
          const next = new URL(data.payload.session.reconnect_url);
          if (next.protocol !== 'wss:' || next.hostname !== 'eventsub.wss.twitch.tv')
            throw new Error('Invalid Twitch reconnect target');
          this.connect(next.href, true);
          return;
        }
        if (type === 'revocation') {
          this.stopped = true;
          ws.close();
          throw new Error('Twitch authorization revoked. Reconnect in settings.');
        }
        if (type !== 'notification') return;
        const id = data.metadata.message_id;
        if (this.seen.has(id)) return;
        this.seen.set(id, Date.now());
        if (this.seen.size > 1000) this.seen.delete(this.seen.keys().next().value!);
        const e = data.payload.event;
        await this.command(e.chatter_user_id, e.chatter_user_login, e.message.text, e.badges || []);
      } catch {
        this.round.log(
          'Twitch connection or command failed. Check authorization and retry.',
          'fail',
        );
        if (!welcome || !this.round.state.twitch.connected) ws.close();
      }
    });
    ws.on('error', () => {});
    ws.on('close', () => {
      if (ws !== this.socket) return;
      if (this.heartbeat) clearTimeout(this.heartbeat);
      this.round.setTwitch(false, this.auth?.login || null);
      if (!this.stopped) {
        this.reconnectTimer = setTimeout(() => this.connect(), this.backoff);
        this.backoff = Math.min(this.backoff * 2, 30000);
      }
    });
  }
  private async command(viewer: string, login: string, text: string, badges: { set_id: string }[]) {
    try {
      const round = this.round;
      if (
        text === '!rollback' &&
        (viewer === this.auth?.userId || badges.some((b) => b.set_id === 'moderator'))
      ) {
        round.rollback();
        return;
      }
      if (
        text === '!stopmods' &&
        (viewer === this.auth?.userId || badges.some((b) => b.set_id === 'moderator'))
      ) {
        round.stop();
        return;
      }
      if (round.state.mode !== 'live') return;
      if (/^[123]$/.test(text)) {
        const p = round.state.proposals[Number(text) - 1];
        if (p) round.vote(viewer, p.id);
      } else if (/^!bet (ship|fail)$/.test(text))
        round.bet(viewer, text.endsWith('ship') ? 'ship' : 'fail');
      else if (text.startsWith('!mod ')) {
        // Reject excess submissions before paying for screening.
        if (
          !['collecting', 'shipped', 'failed'].includes(round.state.phase) ||
          round.state.proposals.length >= 3
        )
          return;
        const now = Date.now();
        if (now - this.screeningWindow.at > 60000) this.screeningWindow = { at: now, count: 0 };
        if (
          this.screeningInFlight >= 2 ||
          this.screeningWindow.count >= 12 ||
          now - (this.screenings.get(viewer) || 0) < 30000
        )
          return;
        this.screenings.set(viewer, now);
        if (this.screenings.size > 5000)
          for (const [k, t] of this.screenings) if (now - t > 60000) this.screenings.delete(k);
        this.screeningWindow.count++;
        this.screeningInFlight++;
        const roundId = round.state.round;
        try {
          const result = await screen(text.slice(5).trim(), round.state.game);
          if (result.accepted && round.state.round === roundId && round.state.mode === 'live')
            round.addProposal(login, result.spec, result.spec);
        } finally {
          this.screeningInFlight--;
        }
      }
    } catch {
      /* Invalid or late viewer commands are ignored, never echoed. */
    }
  }
  close() {
    this.stopped = true;
    const previous = this.socket;
    this.socket = null;
    previous?.close();
    if (this.heartbeat) clearTimeout(this.heartbeat);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }
}
