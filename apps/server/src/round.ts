import { randomUUID } from 'node:crypto';
import { BASE, SAMPLES, codeFor, validateMod, type Mod } from '../../../packages/core/src/mod.ts';
import type { State, Proposal } from '../../../packages/core/src/protocol.ts';
import { validateGame } from '../../../packages/core/src/mod.ts';
import { rulesFromGame, type Genre } from '../../../packages/core/src/blueprint.ts';
export type BuildResult = { source: string; usage: State['usage'] };
export type Builder = (
  spec: string,
  onEvent: (s: string) => void,
  signal: AbortSignal,
  repair?: string,
  base?: Mod,
) => Promise<BuildResult>;
export type GameBuilder = (
  prompt: string,
  genre: Genre,
  onEvent: (line: string) => void,
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
    game: null,
    gameRevision: 0,
    draft: null,
    creatingGame: false,
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
    private gameBuilder?: GameBuilder,
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
    if (this.state.phase !== 'ready' || this.state.draft)
      throw new Error('Bets open after voting and close when building starts');
    if (this.bettors.has(viewer)) throw new Error('One confidence vote per viewer');
    this.bettors.add(viewer);
    this.state.bets[choice]++;
    this.emit();
  }
  async build() {
    if (this.state.phase !== 'ready' || !this.state.winner || this.state.draft)
      throw new Error('Lock the vote first');
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
            this.state.active,
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
    this.state.active = this.state.game ? rulesFromGame(this.state.game) : { ...BASE };
    this.state.source = codeFor(this.state.active);
    this.state.draft = null;
    this.state.creatingGame = false;
    this.state.history = [];
    this.state.phase = 'stopped';
    this.state.credit = null;
    this.state.deadline = null;
    this.log('KILL SWITCH · build cancelled, current game’s starting rules restored.');
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

  async createGame(prompt: string, genre: Genre) {
    if (this.busy()) throw new Error('Finish or stop the current round before creating a game.');
    if (!this.gameBuilder) throw new Error('Enable the authenticated Codex worker first.');
    const run = ++this.generation;
    this.controller = new AbortController();
    const signal = this.controller.signal;
    this.state.phase = 'building';
    this.state.creatingGame = true;
    this.state.winner = null;
    this.state.bets = { ship: 0, fail: 0 };
    this.bettors.clear();
    this.state.mode = 'live';
    this.state.draft = null;
    this.state.gates = [];
    this.state.buildMs = null;
    this.state.usage = null;
    this.log('OWNER GAME CREATOR · the current game stays live until you publish the preview.');
    const started = performance.now();
    try {
      let repair: string | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await this.gameBuilder(
          prompt,
          genre,
          (line) => {
            if (run === this.generation) this.log(line, 'codex');
          },
          signal,
          repair,
        );
        if (signal.aborted || run !== this.generation) return;
        try {
          const checked = validateGame(result.source);
          if (checked.game.genre !== genre)
            throw new Error('Generated game must use the selected engine.');
          if (checked.gates.some((g) => !g.ok))
            throw new Error('Blueprint validation budget exceeded.');
          this.state.source = result.source;
          this.state.draft = checked.game;
          this.state.gates = checked.gates;
          this.state.usage = result.usage;
          this.state.buildMs = Math.round(performance.now() - started);
          this.state.phase = 'ready';
          this.state.creatingGame = false;
          this.log(
            `PREVIEW READY · ${checked.game.title}. Play the preview, then publish when ready.`,
            'pass',
          );
          return;
        } catch (error) {
          repair = error instanceof Error ? error.message : 'Invalid game blueprint';
          this.log(`GAME GATE FAILED · ${repair.slice(0, 160)}`, 'fail');
          if (attempt === 1) throw error;
          this.log('One repair turn for the game blueprint.');
        }
      }
    } catch (error) {
      if (run !== this.generation) return;
      this.state.phase = 'failed';
      this.state.creatingGame = false;
      this.state.buildMs = Math.round(performance.now() - started);
      this.log(error instanceof Error ? error.message : 'Game creation failed.', 'fail');
    } finally {
      if (run === this.generation) {
        this.controller = null;
        this.emit();
      }
    }
  }
  publishGame() {
    if (!this.state.draft || this.state.phase !== 'ready')
      throw new Error('Generate and review a game first.');
    this.state.game = this.state.draft;
    this.state.draft = null;
    this.state.gameRevision++;
    this.state.active = rulesFromGame(this.state.game);
    this.state.history = [];
    this.state.credit = this.state.twitch.channel || 'channel_owner';
    this.state.mode = 'live';
    this.state.phase = 'shipped';
    this.reset();
    this.log(
      `GAME PUBLISHED · ${this.state.game.title}. Chat can now propose the next rule.`,
      'pass',
    );
  }
  discardGame() {
    if (!this.state.draft) throw new Error('No preview to discard.');
    this.state.draft = null;
    this.state.phase = 'collecting';
    this.state.source = codeFor(this.state.active);
    this.log('Preview discarded. The current game keeps running.');
  }
}
