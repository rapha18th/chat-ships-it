import type { Mod, Gate } from './mod.ts';
import type { GameDefinition } from './blueprint.ts';
export type Phase =
  | 'collecting'
  | 'voting'
  | 'ready'
  | 'building'
  | 'validating'
  | 'shipped'
  | 'failed'
  | 'stopped';
export type Proposal = {
  id: string;
  author: string;
  idea: string;
  spec: string;
  votes: number;
  sample?: number;
};
export type Feed = { at: number; kind: 'info' | 'codex' | 'pass' | 'fail'; text: string };
export type State = {
  phase: Phase;
  mode: 'rehearsal' | 'live';
  round: number;
  deadline: number | null;
  proposals: Proposal[];
  winner: Proposal | null;
  active: Mod;
  history: Mod[];
  source: string;
  feed: Feed[];
  gates: Gate[];
  credit: string | null;
  buildMs: number | null;
  usage: { input_tokens: number; output_tokens: number; cached_input_tokens: number } | null;
  bets: { ship: number; fail: number };
  twitch: { connected: boolean; channel: string | null };
  game: GameDefinition | null;
  gameRevision: number;
  draft: GameDefinition | null;
  creatingGame: boolean;
  previewAwaitingOwner?: boolean;
};
