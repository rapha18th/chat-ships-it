import { access } from 'node:fs/promises';
import { ORIGINAL, GameSchema, rulesFromGame } from '../packages/core/src/blueprint.ts';
import { saveWorld } from '../apps/server/src/world.ts';

// A reviewed fixture for immediate local play. Runtime creation uses the real Codex worker.
const path = '.local/rehearsal-garden.json';
try {
  await access(path);
  console.log('Keeping your existing rehearsal garden.');
} catch {
  const game = GameSchema.parse({
    ...ORIGINAL,
    title: 'Community Garden',
    genre: 'collector',
    theme: 'garden',
    avatar: 'bee',
    objective: 'Gather nectar together. Every bee helps the same hive.',
    targetScore: 1200,
    roundSeconds: 120,
    gravity: 0,
    asteroidStyle: 'thorn',
    asteroidSpeed: 0.65,
    pickup: 'magnet',
  });
  await saveWorld({ game, active: rulesFromGame(game), gameRevision: 1, mode: 'rehearsal' }, path);
  console.log('Reviewed multiplayer garden ready. No credentials required.');
}
