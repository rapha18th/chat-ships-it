import { z } from 'zod';

// The engine, rather than generated code, owns all capabilities and time.
export const ModSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,40}$/),
    title: z.string().min(3).max(60),
    description: z.string().min(5).max(180),
    palette: z.enum(['mint', 'violet', 'amber', 'rose', 'ice']),
    gravity: z.number().min(-1.5).max(1.5),
    gravityFlipSeconds: z.number().min(0).max(30),
    asteroidStyle: z.enum(['rock', 'duck', 'disco', 'heart', 'jellyfish', 'thorn']),
    asteroidSpeed: z.number().min(0.25).max(2),
    splitCount: z.number().int().min(0).max(4),
    pickup: z.enum(['shield', 'slowmo', 'magnet']),
    trail: z.enum(['comet', 'rainbow', 'sparks']),
    scoreMultiplier: z.number().min(0.5).max(3),
  })
  .strict();
export type Mod = z.infer<typeof ModSchema>;
export const BASE: Mod = {
  id: 'orbital',
  title: 'Orbital / original rules',
  description: 'Survive the belt. Break rocks. Write the next rule.',
  palette: 'mint',
  gravity: 0.35,
  gravityFlipSeconds: 0,
  asteroidStyle: 'rock',
  asteroidSpeed: 1,
  splitCount: 0,
  pickup: 'shield',
  trail: 'comet',
  scoreMultiplier: 1,
};
export const SAMPLES: Mod[] = [
  {
    ...BASE,
    id: 'quackpocalypse',
    title: 'The Quackpocalypse',
    description: 'Every shattered asteroid becomes a flock of tiny rubber ducks.',
    palette: 'amber',
    asteroidStyle: 'duck',
    splitCount: 3,
    trail: 'sparks',
  },
  {
    ...BASE,
    id: 'gravity-betrayal',
    title: 'Gravity has trust issues',
    description: 'Gravity reverses every six seconds. Your rainbow trail tells the story.',
    palette: 'violet',
    gravity: 1.2,
    gravityFlipSeconds: 6,
    trail: 'rainbow',
  },
  {
    ...BASE,
    id: 'bullet-time',
    title: 'One more second',
    description: 'Catch a cyan pickup. Bend time. Turn a near miss into a perfect shot.',
    palette: 'ice',
    pickup: 'slowmo',
    asteroidStyle: 'disco',
    asteroidSpeed: 1.4,
    scoreMultiplier: 2,
  },
];
export const codeFor = <T extends Mod>(mod: T) =>
  `// Chat Ships It · bounded engine capabilities\nexport default ${JSON.stringify(mod, null, 2)};\n`;
