import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import test from 'node:test';
import dotenv from 'dotenv';

test('missing refresh credentials never expose values or attempt refresh', async (t) => {
  // Block import-time .env loading before importing the validator. All credentials
  // and token data below are synthetic; no provider or token file is accessed.
  const originalEnvironment = process.env;
  process.env = {};
  const config = t.mock.method(dotenv, 'config', () => ({ parsed: {} }));
  const rejectIO = async () => { throw new Error('Unexpected token file access'); };
  const request = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('Unexpected provider request');
  });
  const errors: unknown[][] = [];
  t.mock.method(console, 'error', (...args: unknown[]) => { errors.push(args); });

  try {
    const { TokenValidator } = await import('../src/auth/token-validator');
    const read = t.mock.method(fs, 'readFile', rejectIO);
    const write = t.mock.method(fs, 'writeFile', rejectIO);
    const mkdir = t.mock.method(fs, 'mkdir', rejectIO);
    const save = t.mock.method(TokenValidator, 'saveTokens', rejectIO);
    const state = TokenValidator as unknown as { tokenData: unknown };
    const originalTokens = state.tokenData;
    const tokenData = {
      accessToken: 'synthetic-access-token',
      refreshToken: 'synthetic-refresh-token',
      expiresAt: 0,
      userId: 'synthetic-user',
    };
    state.tokenData = tokenData;
    try {
      const values = [undefined, '', 'synthetic-credential-sentinel'];
      for (const clientId of values) {
        for (const clientSecret of values) {
          if (clientId && clientSecret) continue;
          const label = (value: string | undefined) =>
            value === undefined ? 'unset' : value === '' ? 'empty' : 'present';
          process.env = {};
          if (clientId !== undefined) process.env.WHOOP_CLIENT_ID = clientId;
          if (clientSecret !== undefined) process.env.WHOOP_CLIENT_SECRET = clientSecret;
          errors.length = 0;
          const result = await TokenValidator.refreshAccessToken();
          const caseName = `client ID ${label(clientId)}, client secret ${label(clientSecret)}`;
          await t.test(`${caseName}: exits without side effects`, () => {
            assert.equal(result, false);
            assert.equal(request.mock.callCount(), 0);
            assert.equal(save.mock.callCount(), 0);
            assert.equal(read.mock.callCount(), 0);
            assert.equal(write.mock.callCount(), 0);
            assert.equal(mkdir.mock.callCount(), 0);
            assert.strictEqual(state.tokenData, tokenData);
          });
          await t.test(`${caseName}: only logs a static configuration diagnostic`, () => {
            assert.deepEqual(errors, [[
              'WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET must be set in .env file or environment.',
            ]]);
            assert.doesNotMatch(JSON.stringify(errors), /synthetic-/);
          });
        }
      }
      assert.equal(config.mock.callCount(), 1);
    } finally {
      state.tokenData = originalTokens;
    }
  } finally {
    process.env = originalEnvironment;
  }
});
