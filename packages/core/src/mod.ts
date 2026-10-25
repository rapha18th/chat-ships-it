import ts from 'typescript';
import { ModSchema, type Mod } from './catalog.ts';
export * from './catalog.ts';

export function parseMod(source: string): Mod {
  if (Buffer.byteLength(source) > 12000) throw new Error('Mod exceeds 12 KB');
  const file = ts.createSourceFile(
    'candidate.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const diagnostics = (file as unknown as { parseDiagnostics: readonly ts.Diagnostic[] })
    .parseDiagnostics;
  if (diagnostics.length) throw new Error('Invalid TypeScript syntax');
  if (
    file.statements.length !== 1 ||
    !ts.isExportAssignment(file.statements[0]) ||
    file.statements[0].isExportEquals
  )
    throw new Error('Exactly one export default object is allowed');
  const expr = file.statements[0].expression;
  if (!ts.isObjectLiteralExpression(expr)) throw new Error('Export a plain object literal');
  const result: Record<string, unknown> = Object.create(null);
  for (const prop of expr.properties) {
    if (
      !ts.isPropertyAssignment(prop) ||
      !prop.name ||
      (!ts.isIdentifier(prop.name) && !ts.isStringLiteral(prop.name))
    )
      throw new Error('Only named literal properties are allowed');
    const key = prop.name.text;
    if (Object.hasOwn(result, key) || ['__proto__', 'constructor', 'prototype'].includes(key))
      throw new Error('Duplicate or forbidden property');
    const value = prop.initializer;
    if (ts.isStringLiteral(value)) result[key] = value.text;
    else if (ts.isNumericLiteral(value)) result[key] = Number(value.text);
    else if (
      ts.isPrefixUnaryExpression(value) &&
      value.operator === ts.SyntaxKind.MinusToken &&
      ts.isNumericLiteral(value.operand)
    )
      result[key] = -Number(value.operand.text);
    else throw new Error('Executable expressions are forbidden: use literal values');
  }
  const mod = ModSchema.parse(result);
  if (/[<>\u0000-\u001f]/.test(mod.title + mod.description)) throw new Error('Unsafe display text');
  return mod;
}
export type Gate = { name: string; ok: boolean; detail: string };
export function validateMod(source: string): { mod: Mod; gates: Gate[] } {
  const start = performance.now();
  const mod = parseMod(source);
  let x = 120,
    y = 240,
    vx = 1,
    vy = 0,
    max = 0;
  // Deterministic engine simulation; no generated code is executed.
  for (let tick = 0; tick < 3600; tick++) {
    const g =
      mod.gravityFlipSeconds && Math.floor(tick / (60 * mod.gravityFlipSeconds)) % 2
        ? -mod.gravity
        : mod.gravity;
    vx += (480 - x) * g * 0.00001;
    vy += (270 - y) * g * 0.00001;
    x = (x + vx + 960) % 960;
    y = (y + vy + 540) % 540;
    max = Math.max(max, Math.abs(vx), Math.abs(vy));
    if (!Number.isFinite(x + y + max)) throw new Error('Simulation diverged');
  }
  const elapsed = performance.now() - start;
  return {
    mod,
    gates: [
      {
        name: 'Syntax & capabilities',
        ok: true,
        detail: 'Literal-only AST. No calls, imports, accessors, loops or ambient access.',
      },
      {
        name: 'Schema & bounds',
        ok: true,
        detail: 'All 12 properties strictly typed; entity splitting capped at 4.',
      },
      { name: 'Simulation', ok: true, detail: '3,600 deterministic physics ticks; finite state.' },
      {
        name: 'Validation budget',
        ok: elapsed < 500,
        detail: `${elapsed.toFixed(1)} ms / 500 ms. Renderer caps entities at 96.`,
      },
    ],
  };
}
