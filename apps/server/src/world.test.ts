import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadWorld, saveWorld } from './world.ts';
import { ORIGINAL, rulesFromGame } from '../../../packages/core/src/blueprint.ts';
test('published world survives a restart and invalid state is rejected', async () => {
  const root = await mkdtemp(join(tmpdir(), 'chatships-world-')),
    path = join(root, 'world.json');
  const world = {
    game: {
      ...ORIGINAL,
      theme: 'garden' as const,
      avatar: 'bee' as const,
      genre: 'collector' as const,
    },
    active: rulesFromGame(ORIGINAL),
    gameRevision: 4,
    mode: 'live' as const,
  };
  try {
    await saveWorld(world, path);
    assert.deepEqual(await loadWorld(path), world);
    await writeFile(path, '{"game":"bad"}');
    assert.equal(await loadWorld(path), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
