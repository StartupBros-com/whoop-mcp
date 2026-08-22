import assert from 'node:assert/strict';
import test from 'node:test';

import {
  errorTextResponse,
  jsonTextResponse,
  readOnlyAnnotations,
} from '../src/shared/tool-support';

test('builds the existing read-only annotation contract', () => {
  assert.deepEqual(readOnlyAnnotations('Tool title'), {
    title: 'Tool title',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });
});

test('serializes successful tool output with the existing indentation', () => {
  assert.deepEqual(jsonTextResponse({ ok: true }), {
    content: [
      {
        type: 'text',
        text: '{\n  "ok": true\n}',
      },
    ],
  });
});

test('preserves Error messages and the unknown-error fallback', () => {
  assert.deepEqual(errorTextResponse(new Error('WHOOP unavailable')), {
    content: [{ type: 'text', text: 'Error: WHOOP unavailable' }],
    isError: true,
  });
  assert.deepEqual(errorTextResponse('not-an-error'), {
    content: [{ type: 'text', text: 'Error: Unknown error occurred' }],
    isError: true,
  });
});
