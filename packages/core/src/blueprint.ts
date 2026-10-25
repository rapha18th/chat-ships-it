import { z } from 'zod';
import { BASE, ModSchema, type Mod } from './catalog.ts';

export const GenreSchema = z.enum(['shooter', 'dodger', 'collector']);
export type Genre = z.infer<typeof GenreSchema>;
export const GameSchema = ModSchema.extend({
  genre: GenreSchema,
  theme: z.enum(['space', 'ocean', 'garden', 'neon']),
  avatar: z.enum(['ship', 'submarine', 'bee', 'orb']),
  objective: z.string().min(8).max(160),
  roundSeconds: z.number().int().min(30).max(180),
  targetScore: z.number().int().min(100).max(5000),
  startingHull: z.number().int().min(1).max(5),
  spawnInterval: z.number().min(0.5).max(5),
  playerSpeed: z.number().min(100).max(300),
}).strict();
export type GameDefinition = z.infer<typeof GameSchema>;
export const ORIGINAL: GameDefinition = {
  ...BASE,
  genre: 'shooter',
  theme: 'space',
  avatar: 'ship',
  objective: 'Break rocks and reach 2,000 points before time runs out.',
  roundSeconds: 120,
  targetScore: 2000,
  startingHull: 3,
  spawnInterval: 1.7,
  playerSpeed: 240,
};
export function rulesFromGame(game: GameDefinition): Mod {
  return ModSchema.parse(
    Object.fromEntries(
      Object.keys(ModSchema.shape).map((key) => [key, game[key as keyof GameDefinition]]),
    ),
  );
}
export function outcome(
  game: GameDefinition,
  score: number,
  elapsed: number,
  hull: number,
): 'playing' | 'won' | 'lost' {
  if (hull <= 0) return 'lost';
  if (game.genre !== 'dodger' && score >= game.targetScore) return 'won';
  if (elapsed >= game.roundSeconds) return game.genre === 'dodger' ? 'won' : 'lost';
  return 'playing';
}
export const GAME_STARTERS: { genre: Genre; label: string; prompt: string }[] = [
  {
    genre: 'shooter',
    label: 'Neon duck patrol',
    prompt:
      'A neon arena shooter where a glowing orb breaks disco rocks into rubber ducks. Rainbow trails, slow-motion pickups, reach 1500 points in 90 seconds.',
  },
  {
    genre: 'dodger',
    label: 'Midnight submarine',
    prompt:
      'An underwater survival game. Pilot a tiny submarine through glowing jellyfish for 45 seconds. Cyan ocean, shield pickups, gentle currents and three hull points.',
  },
  {
    genre: 'collector',
    label: 'Honey, I shipped it',
    prompt:
      'A garden collection game. Fly a tiny bee, gather 12 golden nectar drops, and dodge thorns. Warm amber palette, magnet pickups, 60 seconds and three hull points.',
  },
];
