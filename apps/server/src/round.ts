import { randomUUID } from 'node:crypto';
import { BASE, SAMPLES, codeFor, validateMod, type Mod } from '../../../packages/core/src/mod.ts';
import type { State, Proposal } from '../../../packages/core/src/protocol.ts';
export type BuildResult = { source: string; usage: State['usage'] };
export type Builder = (
  spec: string,
  onEvent: (s: string) => void,
  signal: AbortSignal,
  repair?: string,
) => Promise<BuildResult>;
export class Round {
  state: State = {
    phase: 'collecting',
    mode: 'rehearsal',
    round: 1,
    deadline: null,
    proposals: [],
    winner: null,
    active: { ...BASE },
    history: [],
    source: codeFor(BASE),
    feed: [],
    gates: [],
    credit: null,
    buildMs: null,
    usage: null,
    bets: { ship: 0, fail: 0 },
    twitch: { connected: false, channel: null },
  };
  private voters = new Map<string, string>();
  private bettors = new Set<string>();
  private cooldown = new Map<string, number>();
  private controller: AbortController | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  constructor(
    private publish: (s: State) => void = () => {},
    private builder?: Builder,
    private rehearsalDelay = 500,
  ) {}
  emit() {
    this.publish(structuredClone(this.state));
  }
  log(text: string, kind: 'info' | 'codex' | 'pass' | 'fail' = 'info') {
    this.state.feed.push({ at: Date.now(), kind, text: text.slice(0, 240) });
    this.state.feed = this.state.feed.slice(-70);
    this.emit();
  }
  setTwitch(connected: boolean, channel: string | null) {
    this.state.twitch = { connected, channel };
    this.emit();
  }
  setMode(mode: 'live' | 'rehearsal') {
    if (this.busy()) throw new Error('Stop the current round before switching mode');
    this.reset();
    this.state.mode = mode;
    this.emit();
  }
  busy() {
    return ['voting', 'ready', 'building', 'validating'].includes(this.state.phase);
  }
  addProposal(author: string, idea: string, spec: string, sample?: number) {
    if (!['collecting', 'shipped', 'failed'].includes(this.state.phase))
      throw new Error('Proposal window is closed');
    if (this.state.proposals.length >= 3) throw new Error('Three finalists are ready');
    if (Date.now() - (this.cooldown.get(author.toLowerCase()) || 0) < 30000)
      throw new Error('One proposal per viewer every 30 seconds');
    const p: Proposal = {
      id: randomUUID(),
      author: author.slice(0, 25).replace(/[^a-zA-Z0-9_]/g, ''),
      idea: idea.slice(0, 240),
      spec: spec.slice(0, 220),
      votes: 0,
      ...(sample === undefined ? {} : { sample }),
    };
    if (!p.author) throw new Error('Invalid viewer name');
    this.cooldown.set(author.toLowerCase(), Date.now());
    this.state.proposals.push(p);
    this.emit();
    return p;
  }
  seed(mode: 'rehearsal' | 'live' = 'rehearsal') {
    if (this.busy()) throw new Error('Finish this round first');
    if (mode === 'live' && !this.builder)
      throw new Error('Enable the authenticated Codex worker first');
    this.reset();
    this.state.mode = mode;
    ['pixelpilot', 'moonbyte', 'neon_nova'].forEach((author, i) =>
      this.addProposal(author, SAMPLES[i].description, SAMPLES[i].description, i),
    );
    this.log(
      mode === 'rehearsal'
        ? 'REHEARSAL · reviewed example mods, no agent or Twitch activity is simulated.'
        : 'REVIEWED IDEAS · example viewer names. Winning rule will be written by real Codex.',
    );
  }
  voteStart(seconds = 30) {
    if (this.state.phase !== 'collecting' || this.state.proposals.length < 2)
      throw new Error('Collect at least two finalists first');
    this.state.phase = 'voting';
    this.state.deadline = Date.now() + seconds * 1000;
    this.voters.clear();
    for (const proposal of this.state.proposals) proposal.votes = 0;
    this.timer = setTimeout(() => this.lockVote(), seconds * 1000);
    this.emit();
  }
  vote(viewer: string, id: string) {
    if (this.state.phase !== 'voting') throw new Error('Voting is closed');
    if (this.state.deadline! <= Date.now()) {
      this.lockVote();
      throw new Error('Voting is closed');
    }
    if (!this.state.proposals.some((p) => p.id === id)) throw new Error('Unknown finalist');
    this.voters.set(viewer, id);
    for (const p of this.state.proposals)
      p.votes = [...this.voters.values()].filter((v) => v === p.id).length;
    this.emit();
  }
  lockVote() {
    if (this.state.phase !== 'voting') throw new Error('No open vote');
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.state.winner = [...this.state.proposals].sort((a, b) => b.votes - a.votes)[0];
    this.state.phase = 'ready';
    this.state.deadline = null;
    this.log(
      `VOTE LOCKED · ${this.state.winner.author} wins. Streamer approval required to build.`,
    );
  }
  bet(viewer: string, choice: 'ship' | 'fail') {
    if (this.state.phase !== 'ready')
      throw new Error('Bets open after voting and close when building starts');
    if (this.bettors.has(viewer)) throw new Error('One confidence vote per viewer');
    this.bettors.add(viewer);
    this.state.bets[choice]++;
    this.emit();
  }
  async build() {
    if (this.state.phase !== 'ready' || !this.state.winner) throw new Error('Lock the vote first');
    if (this.state.mode === 'live' && !this.builder)
      throw new Error('Enable and authenticate the Codex worker first');
    const winner = this.state.winner,
      run = ++this.generation;
    this.controller = new AbortController();
    const signal = this.controller.signal;
    this.state.phase = 'building';
    this.state.gates = [];
    this.state.usage = null;
    this.state.buildMs = null;
    this.state.credit = null;
    this.emit();
    const start = performance.now();
    try {
      let repair: string | undefined;
      let result: BuildResult | undefined;
      let validated: ReturnType<typeof validateMod> | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        if (signal.aborted) return;
        if (this.state.mode === 'rehearsal') {
          this.log('REHEARSAL · loading a reviewed example. This is not live Codex output.');
          await new Promise((resolve) => setTimeout(resolve, this.rehearsalDelay));
          if (winner.sample === undefined)
            throw new Error('Rehearsal only supports reviewed examples');
          result = { source: codeFor(SAMPLES[winner.sample]), usage: null };
        } else
          result = await this.builder!(
            winner.spec,
            (s) => {
              if (run === this.generation) this.log(s, 'codex');
            },
            signal,
            repair,
          );
        if (run !== this.generation || signal.aborted) return;
        this.state.phase = 'validating';
        this.state.source = result.source;
        this.emit();
        try {
          validated = validateMod(result.source);
          if (validated.gates.some((g) => !g.ok)) throw new Error('Validation budget exceeded');
          break;
        } catch (e) {
          repair = e instanceof Error ? e.message : 'Invalid mod';
          this.log(`GATE FAILED · ${repair.slice(0, 160)}`, 'fail');
          if (attempt === 1 || this.state.mode === 'rehearsal') throw e;
          this.state.phase = 'building';
          this.log('One repair turn. Returning validator diagnostics to Codex.');
        }
      }
      if (!validated || !result) throw new Error('No validated artifact');
      this.state.gates = validated.gates;
      this.state.history.push({ ...this.state.active });
      this.state.history = this.state.history.slice(-10);
      this.state.active = validated.mod;
      this.state.credit = winner.author;
      this.state.usage = result.usage;
      this.state.phase = 'shipped';
      this.state.buildMs = Math.round(performance.now() - start);
      this.log(`SHIPPED · ${validated.mod.title} · credited to @${winner.author}`, 'pass');
    } catch (e) {
      if (run !== this.generation) return;
      this.state.phase = 'failed';
      this.state.buildMs = Math.round(performance.now() - start);
      this.log(e instanceof Error ? e.message : 'Build failed', 'fail');
    } finally {
      if (run === this.generation) {
        this.controller = null;
        this.emit();
      }
    }
  }
  rollback() {
    if (this.busy()) throw new Error('Stop the current round before rollback');
    const previous = this.state.history.pop();
    if (!previous) throw new Error('No previous mod');
    this.state.active = previous;
    this.state.source = codeFor(previous);
    this.state.credit = null;
    this.log('ROLLBACK · previous rules restored without restarting the run.');
  }
  stop() {
    this.generation++;
    this.controller?.abort();
    this.controller = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.state.active = { ...BASE };
    this.state.source = codeFor(BASE);
    this.state.history = [];
    this.state.phase = 'stopped';
    this.state.credit = null;
    this.state.deadline = null;
    this.log('KILL SWITCH · build cancelled, original rules restored.');
  }
  reset() {
    if (this.busy()) throw new Error('Stop the current round first');
    this.state.phase = 'collecting';
    this.state.round++;
    this.state.proposals = [];
    this.state.winner = null;
    this.state.deadline = null;
    this.state.gates = [];
    this.state.bets = { ship: 0, fail: 0 };
    this.voters.clear();
    this.bettors.clear();
    this.cooldown.clear();
    this.emit();
  }
}
