import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

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
