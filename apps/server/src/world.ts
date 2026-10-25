import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';
import { GameSchema } from '../../../packages/core/src/blueprint.ts';
import { ModSchema } from '../../../packages/core/src/catalog.ts';
export const WorldSchema = z
  .object({
    game: GameSchema.nullable(),
    active: ModSchema,
    gameRevision: z.number().int().nonnegative(),
    mode: z.enum(['live', 'rehearsal']),
  })
  .strict();
export type SavedWorld = z.infer<typeof WorldSchema>;
export async function loadWorld(path = '.local/world.json'): Promise<SavedWorld | null> {
  try {
    return WorldSchema.parse(JSON.parse(await readFile(path, 'utf8')));
  } catch {
    return null;
  }
}
export async function saveWorld(world: SavedWorld, path = '.local/world.json') {
  const validated = WorldSchema.parse(world);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(`${path}.tmp`, JSON.stringify(validated, null, 2));
  await rename(`${path}.tmp`, path);
}
