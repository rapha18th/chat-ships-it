import type { State } from '../../../packages/core/src/protocol.ts';
import { codeFor } from '../../../packages/core/src/catalog.ts';
export function visibleState(state: State, owner: boolean): State {
  if (owner || (!state.draft && !state.creatingGame)) return state;
  const start = state.feed.findLastIndex((line) => line.text.startsWith('OWNER GAME CREATOR'));
  return {
    ...state,
    draft: null,
    source: codeFor(state.active),
    gates: [],
    previewAwaitingOwner: true,
    feed: [
      ...(start < 0 ? [] : state.feed.slice(0, start)),
      {
        at: Date.now(),
        kind: 'info',
        text: 'The owner is creating and reviewing the next starting game.',
      },
    ],
  };
}
