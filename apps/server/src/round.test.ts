import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Round } from './round.ts';
import { BASE, codeFor, SAMPLES } from '../../../packages/core/src/mod.ts';
import { publicOrigin } from './config.ts';
test('full rehearsal lifecycle, changed vote, stable tie, bet lock and rollback', async () => {
  const r = new Round(undefined, undefined, 1);
  r.seed();
  r.voteStart(60);
  const [a, b] = r.state.proposals;
  r.vote('viewer', b.id);
  r.vote('viewer', a.id);
  assert.equal(a.votes, 1);
  assert.equal(b.votes, 0);
  r.lockVote();
  r.bet('viewer', 'ship');
  assert.throws(() => r.bet('viewer', 'fail'));
  await r.build();
  assert.equal(r.state.phase, 'shipped');
  assert.equal(r.state.active.id, SAMPLES[0].id);
  assert.throws(() => r.bet('late', 'ship'));
  r.rollback();
  assert.equal(r.state.active.id, BASE.id);
});
test('repair happens once and failed artifact cannot replace active rules', async () => {
  let calls = 0;
  const r = new Round(undefined, async () => {
    calls++;
    return { source: 'export default fetch("bad");', usage: null };
  });
  r.seed();
  r.setMode('live');
  r.addProposal('one', 'Gravity flips', 'Gravity flips');
  r.addProposal('two', 'Ducks everywhere', 'Ducks everywhere');
  r.voteStart();
  r.lockVote();
  await r.build();
  assert.equal(calls, 2);
  assert.equal(r.state.phase, 'failed');
  assert.equal(r.state.active.id, BASE.id);
});
test('stop aborts an in-flight build and prevents late ship', async () => {
  let finish!: (x: { source: string; usage: null }) => void;
  const r = new Round(
    undefined,
    async () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  r.setMode('live');
  r.addProposal('one', 'Gravity flips', 'Gravity flips');
  r.addProposal('two', 'Ducks everywhere', 'Ducks everywhere');
  r.voteStart();
  r.lockVote();
  const pending = r.build();
  r.stop();
  finish({ source: codeFor(SAMPLES[0]), usage: null });
  await pending;
  assert.equal(r.state.phase, 'stopped');
  assert.equal(r.state.active.id, BASE.id);
});
test('only one build and vote can run at a time', async () => {
  const r = new Round(undefined, undefined, 1);
  r.seed();
  r.voteStart();
  assert.throws(() => r.seed());
  assert.throws(() => r.reset());
  assert.throws(() => r.voteStart());
  r.lockVote();
  const p = r.build();
  await assert.rejects(() => r.build());
  await p;
});
test('a new vote requires a fresh round and starts with no stale ballots', async () => {
  const r = new Round(undefined, undefined, 1);
  r.seed();
  r.voteStart();
  r.vote('previous', r.state.proposals[1].id);
  r.lockVote();
  await r.build();
  assert.throws(() => r.voteStart());
  r.seed();
  r.voteStart();
  assert.ok(r.state.proposals.every((p) => p.votes === 0));
  r.lockVote();
  assert.equal(r.state.winner?.id, r.state.proposals[0].id);
  r.stop();
});
test('OAuth and origin configuration honors custom ports and trailing slash', () => {
  assert.equal(publicOrigin({ PORT: '9999' }), 'http://localhost:9999');
  assert.equal(publicOrigin({ PUBLIC_URL: 'https://example.test/' }), 'https://example.test');
  assert.throws(() => publicOrigin({ PUBLIC_URL: 'ftp://example.test' }));
});
