import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Round } from './round.ts';
import { ORIGINAL, rulesFromGame } from '../../../packages/core/src/blueprint.ts';
import { BASE, codeFor } from '../../../packages/core/src/mod.ts';
import { visibleState } from './visibility.ts';

const bee = {
  ...ORIGINAL,
  id: 'nectar-rush',
  title: 'Nectar Rush',
  genre: 'collector' as const,
  theme: 'garden' as const,
  avatar: 'bee' as const,
};
test('owner preview is isolated until publishing, then chat patches preserve the game', async () => {
  let receivedBase: unknown;
  const r = new Round(
    undefined,
    async (_spec, _event, _signal, _repair, base) => {
      receivedBase = base;
      return { source: codeFor({ ...base!, gravityFlipSeconds: 6 }), usage: null };
    },
    1,
    async () => ({ source: codeFor(bee), usage: null }),
  );
  await r.createGame('A bee collecting nectar in a garden', 'collector');
  assert.equal(r.state.active.id, BASE.id);
  assert.equal(r.state.draft?.id, 'nectar-rush');
  const spectator = visibleState(r.state, false);
  assert.equal(spectator.draft, null);
  assert.ok(!spectator.source.includes('nectar-rush'));
  assert.equal(visibleState(r.state, true).draft?.id, 'nectar-rush');
  assert.throws(() => r.bet('viewer', 'ship'));
  await assert.rejects(() => r.build());
  assert.throws(() => r.voteStart());
  r.publishGame();
  assert.equal(r.state.game?.genre, 'collector');
  assert.equal(r.state.gameRevision, 1);
  assert.equal(r.state.active.id, 'nectar-rush');
  r.addProposal('first', 'Flip gravity every six seconds', 'Flip gravity every six seconds');
  r.addProposal('second', 'Give a rainbow trail', 'Give a rainbow trail');
  r.voteStart();
  r.lockVote();
  await r.build();
  assert.deepEqual(receivedBase, rulesFromGame(bee));
  assert.equal(r.state.game?.theme, 'garden');
  assert.equal(r.state.active.gravityFlipSeconds, 6);
  r.stop();
  assert.deepEqual(r.state.active, rulesFromGame(bee));
  assert.equal(r.state.game?.avatar, 'bee');
});
test('discard and failed creation leave the live game intact; single repair only', async () => {
  let calls = 0;
  const r = new Round(undefined, undefined, 1, async () => ({
    source: ++calls < 2 ? 'export default fetch("bad");' : codeFor(bee),
    usage: null,
  }));
  await r.createGame('A bee collecting nectar in a garden', 'collector');
  assert.equal(calls, 2);
  r.discardGame();
  assert.equal(r.state.active.id, BASE.id);
  assert.equal(r.state.draft, null);
  const bad = new Round(undefined, undefined, 1, async () => ({
    source: codeFor({ ...bee, playerSpeed: 99999 }),
    usage: null,
  }));
  await bad.createGame('A bee collecting nectar in a garden', 'collector');
  assert.equal(bad.state.phase, 'failed');
  assert.equal(bad.state.active.id, BASE.id);
  assert.equal(bad.state.draft, null);
});
test('kill switch cancels game creation and blocks late preview', async () => {
  let finish!: (r: { source: string; usage: null }) => void;
  const r = new Round(
    undefined,
    undefined,
    1,
    async () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pending = r.createGame('A bee collecting nectar in a garden', 'collector');
  await assert.rejects(() => r.createGame('Another garden collection game', 'collector'));
  r.stop();
  finish({ source: codeFor(bee), usage: null });
  await pending;
  assert.equal(r.state.draft, null);
  assert.equal(r.state.phase, 'stopped');
});
