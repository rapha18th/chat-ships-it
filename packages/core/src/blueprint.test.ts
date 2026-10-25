import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ORIGINAL, outcome, rulesFromGame } from './blueprint.ts';
import { codeFor, validateGame } from './mod.ts';
import { canvasPoint } from './controls.ts';
test('all three engines have distinct playable win conditions', () => {
  assert.equal(outcome({ ...ORIGINAL, genre: 'shooter' }, 2000, 1, 3), 'won');
  assert.equal(outcome({ ...ORIGINAL, genre: 'collector' }, 1999, 121, 3), 'lost');
  assert.equal(outcome({ ...ORIGINAL, genre: 'dodger' }, 0, 120, 3), 'won');
  assert.equal(outcome({ ...ORIGINAL, genre: 'dodger' }, 9999, 1, 3), 'playing');
  assert.equal(outcome(ORIGINAL, 5000, 1, 0), 'lost');
});
test('blueprints use the same literal-only capability gate', () => {
  for (const genre of ['shooter', 'dodger', 'collector'] as const) {
    const game = { ...ORIGINAL, genre };
    assert.deepEqual(validateGame(codeFor(game)).game, game);
    assert.equal(rulesFromGame(game).gravity, game.gravity);
  }
  for (const change of [
    { genre: 'unrestricted' },
    { spawnInterval: 0 },
    { playerSpeed: 9999 },
    { objective: '<script>' },
    { startingHull: 100 },
  ])
    assert.throws(() => validateGame(codeFor({ ...ORIGINAL, ...change } as typeof ORIGINAL)));
  assert.throws(() => validateGame('export default { ...process.env };'));
});
test('touch controls account for letterboxing in previews and OBS views', () => {
  const rect = { left: 0, top: 0, width: 1400, height: 480 };
  assert.deepEqual(canvasPoint(700, 240, rect, 1200, 675), { x: 600, y: 337.5 });
  assert.equal(canvasPoint(0, 240, rect, 1200, 675).x, 0);
  assert.equal(canvasPoint(1400, 240, rect, 1200, 675).x, 1200);
});
