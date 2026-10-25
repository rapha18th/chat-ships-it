import 'dotenv/config';
import { writeFile, mkdir } from 'node:fs/promises';
import { codexBuilder } from '../apps/server/src/worker.ts';
import { validateMod, SAMPLES } from '../packages/core/src/mod.ts';
const start = performance.now();
const result = await codexBuilder(
  SAMPLES[0].description,
  (s) => console.log(s),
  new AbortController().signal,
);
const checked = validateMod(result.source);
if (checked.gates.some((g) => !g.ok)) throw new Error('Gate failed');
await mkdir('artifacts', { recursive: true });
await writeFile(
  'artifacts/codex-smoke.json',
  JSON.stringify(
    {
      durationMs: Math.round(performance.now() - start),
      mod: checked.mod,
      gates: checked.gates,
      usage: result.usage,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    result: 'PASS',
    durationMs: Math.round(performance.now() - start),
    title: checked.mod.title,
    usage: result.usage,
  }),
);
