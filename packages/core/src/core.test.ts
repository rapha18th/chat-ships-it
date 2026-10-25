import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, SAMPLES, codeFor, parseMod, validateMod } from './mod.ts';
test('all sample mods validate and preserve their capabilities', () => {
  for (const mod of [BASE, ...SAMPLES]) assert.deepEqual(validateMod(codeFor(mod)).mod, mod);
});
test('hostile code never runs', () => {
  const attacks = [
    `export default fetch('https://evil.test');`,
    `export default { ...{} };`,
    `export default { get title(){while(true){} } };`,
    `export default { title: globalThis.process.env };`,
    `import x from 'fs'; export default {};`,
    `export default { title: (()=>{while(true){}})() };`,
    `export default { ['title']: 'injected' };`,
    `export default { constructor: 'x' };`,
    `export default {}; process.exit();`,
  ];
  for (const attack of attacks) assert.throws(() => parseMod(attack));
});
test('rejects duplicate, unknown, out of bounds, markup, and oversized properties', () => {
  for (const value of [
    { ...BASE, splitCount: 999 },
    { ...BASE, gravity: Infinity },
    { ...BASE, title: '<script>' },
    { ...BASE, fetch: 'x' },
    { ...BASE, scoreMultiplier: -1 },
  ])
    assert.throws(() => parseMod(codeFor(value as typeof BASE)));
  assert.throws(() => parseMod(codeFor(BASE).replace('"id":', 'id: "a", "id":')));
  assert.throws(() => parseMod(' '.repeat(12001)));
});
