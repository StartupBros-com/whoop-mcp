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

test('preserves nested JSON serialization, omissions, and property order', () => {
  const value = { second: [null, 0, false, ''], first: { omitted: undefined, kept: 'é\n' } };
  const response = jsonTextResponse(value);
  assert.deepEqual(response, {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  });
  assert.deepEqual(Object.keys(response), ['content']);
  assert.deepEqual(Object.keys(response.content[0]), ['type', 'text']);
  assert.equal(Object.hasOwn(response, 'isError'), false);
});

test('calls toJSON once with the original receiver and root key', () => {
  let calls = 0;
  const value = {
    toJSON(key: string) {
      calls++;
      assert.equal(this, value);
      assert.equal(key, '');
      return { replacement: 'value' };
    },
  };
  assert.equal(jsonTextResponse(value).content[0].text, '{\n  "replacement": "value"\n}');
  assert.equal(calls, 1);
});

test('preserves an own undefined text property when toJSON returns undefined', () => {
  const response = jsonTextResponse({ toJSON: () => undefined });
  assert.deepEqual(response, { content: [{ type: 'text', text: undefined }] });
  assert.equal(Object.hasOwn(response.content[0], 'text'), true);
});

test('propagates serialization failures without wrapping or converting them', () => {
  const sentinel = new Error('serialization failed');
  assert.throws(() => jsonTextResponse({ toJSON() { throw sentinel; } }), (error) => error === sentinel);
  const cyclic: { self?: object } = {};
  cyclic.self = cyclic;
  assert.throws(() => jsonTextResponse(cyclic), TypeError);
  assert.throws(() => jsonTextResponse({ value: 1n }), TypeError);
});

test('keeps error wording, empty messages, non-Error fallback, and property order', () => {
  for (const error of [null, undefined, '', 0, false, { message: 'not an Error' }]) {
    assert.deepEqual(errorTextResponse(error), {
      content: [{ type: 'text', text: 'Error: Unknown error occurred' }],
      isError: true,
    });
  }
  const response = errorTextResponse(new Error(''));
  assert.equal(response.content[0].text, 'Error: ');
  assert.deepEqual(Object.keys(response), ['content', 'isError']);
  assert.deepEqual(Object.keys(response.content[0]), ['type', 'text']);
});

test('reads an Error message once and propagates a throwing message getter', () => {
  let reads = 0;
  const error = new Error();
  Object.defineProperty(error, 'message', { get() { reads++; return 'message'; } });
  assert.equal(errorTextResponse(error).content[0].text, 'Error: message');
  assert.equal(reads, 1);
  const sentinel = new Error('getter failed');
  const throwingError = new Error();
  Object.defineProperty(throwingError, 'message', { get() { throw sentinel; } });
  assert.throws(() => errorTextResponse(throwingError), (caught) => caught === sentinel);
});

test('allocates fresh envelopes, arrays, and items for both response paths', () => {
  const responses = [
    jsonTextResponse({ ok: true }),
    jsonTextResponse({ ok: true }),
    errorTextResponse(new Error('example')),
    errorTextResponse(new Error('example')),
  ];
  assert.equal(new Set(responses).size, responses.length);
  assert.equal(new Set(responses.map((response) => response.content)).size, responses.length);
  assert.equal(new Set(responses.map((response) => response.content[0])).size, responses.length);
  responses[0].content[0].text = 'changed';
  assert.equal(responses[1].content[0].text, '{\n  "ok": true\n}');
  assert.equal(responses[2].content[0].text, 'Error: example');
  assert.equal(responses[3].content[0].text, 'Error: example');
});
