import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { WhoopAPIClient } from '../src/api/whoop-client';
import { TokenValidator } from '../src/auth';

const client = WhoopAPIClient.getInstance();
type CollectionParams = Parameters<typeof client.getSleepCollection>[0];
const methods = [
  ['getSleepCollection', '/v2/activity/sleep'],
  ['getCycleCollection', '/v2/cycle'],
] as const;

// Stop any accidental authentication or network access, even if a test fails.
const originalFetch = globalThis.fetch;
const originalAuth = TokenValidator.requireAuth;
before(() => {
  globalThis.fetch = async () => { throw new Error('Network access is forbidden'); };
  TokenValidator.requireAuth = async () => { throw new Error('Authentication is forbidden'); };
});
after(() => {
  globalThis.fetch = originalFetch;
  TokenValidator.requireAuth = originalAuth;
});

for (const [method, path] of methods) {
  test(`${method} preserves empty queries and truthiness`, async (t) => {
    const request = t.mock.method(client as any, 'request', async () => ({}));
    for (const params of [undefined, {}, { limit: 0, start: '', end: '', nextToken: '' },
      { limit: -0 }, { limit: NaN }, null]) {
      await client[method](params as CollectionParams);
      assert.deepEqual(request.mock.calls.at(-1)?.arguments, [path]);
    }
  });

  test(`${method} preserves query key order and URLSearchParams encoding`, async (t) => {
    const request = t.mock.method(client as any, 'request', async () => ({}));
    await client[method]({
      nextToken: 'a+b /?&=雪',
      end: '2026-10-18T12:00:00+00:00',
      start: 'a b',
      limit: 25,
    });
    assert.deepEqual(request.mock.calls[0].arguments, [path +
      '?limit=25&start=a+b&end=2026-10-18T12%3A00%3A00%2B00%3A00&nextToken=a%2Bb+%2F%3F%26%3D%E9%9B%AA']);
    for (const [params, suffix] of [
      [{ limit: -2 }, '?limit=-2'],
      [{ limit: 1.5 }, '?limit=1.5'],
      [{ limit: Infinity }, '?limit=Infinity'],
      [{ start: 'start' }, '?start=start'],
      [{ end: 'end' }, '?end=end'],
      [{ nextToken: 'next' }, '?nextToken=next'],
    ] as const) {
      await client[method](params);
      assert.deepEqual(request.mock.calls.at(-1)?.arguments, [path + suffix]);
    }
  });

  test(`${method} preserves getter reads, receiver and conversion order`, async (t) => {
    const events: string[] = [];
    const request = t.mock.method(client as any, 'request', async () => { events.push('request'); });
    const params = {} as NonNullable<CollectionParams>;
    for (const [key, first, second] of [
      ['limit', 1, { toString() { events.push('limit.toString'); return '7'; } }],
      ['start', 'truthy', ''],
      ['end', '', 'not read'],
      ['nextToken', 'truthy', 'a b'],
    ] as const) {
      let reads = 0;
      Object.defineProperty(params, key, { get() {
        assert.equal(this, params);
        events.push(key);
        return reads++ === 0 ? first : second;
      } });
    }
    const promise = client[method](params);
    assert.deepEqual(events, ['limit', 'limit', 'limit.toString', 'start', 'start', 'end', 'nextToken', 'nextToken', 'request']);
    await promise;
    assert.deepEqual(request.mock.calls[0].arguments, [path + '?limit=7&start=&nextToken=a+b']);
  });

  test(`${method} returns request results and rejections unchanged`, async (t) => {
    const result = { records: [], next_token: 'next' };
    const error = new Error('request failed');
    const request = t.mock.method(client as any, 'request', () => Promise.resolve(result));
    assert.equal(await client[method](), result);
    request.mock.mockImplementation(() => Promise.reject(error));
    await assert.rejects(client[method](), (actual) => actual === error);
    request.mock.mockImplementation(() => { throw error; });
    let promise: Promise<unknown> | undefined;
    assert.doesNotThrow(() => { promise = client[method](); });
    await assert.rejects(promise!, (actual) => actual === error);
  });

  test(`${method} rejects getter failures asynchronously without requesting`, async (t) => {
    const request = t.mock.method(client as any, 'request', async () => ({}));
    const error = new Error('getter failed');
    const params = { get limit(): number { throw error; } };
    let promise: Promise<unknown> | undefined;
    assert.doesNotThrow(() => { promise = client[method](params); });
    await assert.rejects(promise!, (actual) => actual === error);
    assert.equal(request.mock.callCount(), 0);
  });
}
