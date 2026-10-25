import test from 'node:test';
import assert from 'node:assert/strict';
import { Hive } from './hive.ts';
import { ORIGINAL } from '../../../packages/core/src/blueprint.ts';
const garden = {
  ...ORIGINAL,
  genre: 'collector' as const,
  theme: 'garden' as const,
  avatar: 'bee' as const,
  targetScore: 1200,
  gravity: 0,
};
test('shared nectar is collected once and every player contributes to one goal', () => {
  const h = new Hive(() => 0.5);
  h.sync(garden, 1, garden);
  const a = h.join('Bee One');
  h.join('Bee Two');
  h.start();
  h.step(0.05);
  const s = h.snapshot();
  assert.equal(s.target, 2400);
  assert.equal(s.score, 1800);
  assert.equal(s.players.find((p) => p.id === a)!.points, 1800);
  assert.equal(
    s.players.reduce((n, p) => n + p.points, 0),
    s.score,
  );
  assert.equal(s.nectar.length, 0);
});
test('live patches preserve the shared score, positions, timer and connected players', () => {
  const h = new Hive(() => 0.2);
  h.sync(garden, 1, garden);
  const id = h.join('Bee');
  h.start();
  h.input(id, 1, 0, 1);
  h.step(0.05);
  const before = h.snapshot();
  h.sync(garden, 1, { ...garden, trail: 'rainbow', scoreMultiplier: 2 });
  const after = h.snapshot();
  assert.deepEqual(after.players, before.players);
  assert.equal(after.remaining, before.remaining);
  assert.equal(after.score, before.score);
  assert.equal(after.rules.trail, 'rainbow');
  assert.equal(after.rules.scoreMultiplier, 2);
});
test('server bounds movement, rejects invalid and stale input, and releases disconnected bees', () => {
  const h = new Hive(() => 0.1);
  h.sync(garden, 1, garden);
  const id = h.join('Bee');
  h.start();
  h.input(id, 1e9, 1e9, 2);
  h.input(id, -1, 0, 1);
  h.step(0.05);
  let p = h.snapshot().players[0];
  assert.ok(p.x > 600);
  assert.ok(Math.hypot(p.vx, p.vy) <= garden.playerSpeed + 0.001);
  h.input(id, NaN, Infinity, 3);
  for (let i = 0; i < 20; i++) h.step(0.05);
  p = h.snapshot().players[0];
  assert.equal(p.vx, 0);
  assert.equal(p.vy, 0);
  h.leave(id);
  assert.equal(h.snapshot().players.length, 0);
  const time = h.snapshot().remaining;
  h.step(0.05);
  assert.equal(h.snapshot().remaining, time);
});
test('publishing a new world resets the room while retaining seats; capacity is bounded', () => {
  const h = new Hive(() => 0.3);
  h.sync(garden, 1, garden);
  for (let i = 0; i < 24; i++) h.join(`Bee ${i}`);
  assert.throws(() => h.join('Overflow'), /full/);
  h.start();
  h.step(0.05);
  h.sync({ ...garden, title: 'New garden' }, 2, garden);
  assert.equal(h.snapshot().phase, 'waiting');
  assert.equal(h.snapshot().players.length, 24);
  assert.equal(h.snapshot().score, 0);
  assert.equal(h.snapshot().title, 'New garden');
});
