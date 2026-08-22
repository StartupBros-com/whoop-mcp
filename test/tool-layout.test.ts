import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('every xmcp-discovered source file is a tool entrypoint', () => {
  const toolsDirectory = join(process.cwd(), 'src', 'tools');
  const nonTools = readdirSync(toolsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .filter((entry) => {
      const source = readFileSync(join(toolsDirectory, entry.name), 'utf8');
      return !/\bexport\s+default\b/.test(source);
    })
    .map((entry) => entry.name);

  assert.deepEqual(
    nonTools,
    [],
    'xmcp registers every file under src/tools; shared helpers must live elsewhere',
  );
});
