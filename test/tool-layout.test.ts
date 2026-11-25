import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

import { schema as recoverySchema } from '../src/tools/get-recovery-for-cycle';
import { schema as sleepSchema } from '../src/tools/get-sleep-for-cycle';

function typescriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return typescriptFiles(path);
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });
}

test('every xmcp-discovered source file is a tool entrypoint', () => {
  const toolsDirectory = join(process.cwd(), 'src', 'tools');
  const nonTools = typescriptFiles(toolsDirectory)
    .filter((path) => !/\bexport\s+default\b/.test(readFileSync(path, 'utf8')))
    .map((path) => relative(toolsDirectory, path));

  assert.deepEqual(
    nonTools,
    [],
    'xmcp registers every file under src/tools; shared helpers must live elsewhere',
  );
});

test('cycle lookup tools accept the same positive integers and keep their descriptions', () => {
  const cases = [
    [recoverySchema.cycleId, 'The ID of the cycle to retrieve recovery data for'],
    [sleepSchema.cycleId, 'The ID of the cycle to retrieve sleep data for'],
  ] as const;

  for (const [schema, description] of cases) {
    assert.equal(schema.description, description);
    for (const id of [1, 42, Number.MAX_SAFE_INTEGER]) assert.equal(schema.parse(id), id);
    for (const id of [undefined, null, '42', -1, 0, 1.25, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
      assert.equal(schema.safeParse(id).success, false, `expected to reject ${String(id)}`);
    }
  }
});
