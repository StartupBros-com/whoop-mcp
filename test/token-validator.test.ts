import assert from 'node:assert/strict';
import test from 'node:test';

import { TokenValidator } from '../src/auth/token-validator';

test('a missing client ID is reported without printing the client secret', async () => {
  const saved = {
    id: process.env.WHOOP_CLIENT_ID,
    secret: process.env.WHOOP_CLIENT_SECRET,
    error: console.error,
  };
  const logged: string[] = [];
  delete process.env.WHOOP_CLIENT_ID;
  process.env.WHOOP_CLIENT_SECRET = 'sentinel-client-secret';
  console.error = (...args: unknown[]) => { logged.push(args.map(String).join(' ')); };
  (TokenValidator as unknown as { tokenData: unknown }).tokenData = {
    accessToken: 'a', refreshToken: 'r', expiresAt: 0, userId: 'u',
  };
  try {
    assert.equal(await TokenValidator.refreshAccessToken(), false);
  } finally {
    console.error = saved.error;
    (TokenValidator as unknown as { tokenData: unknown }).tokenData = null;
    if (saved.id === undefined) delete process.env.WHOOP_CLIENT_ID; else process.env.WHOOP_CLIENT_ID = saved.id;
    if (saved.secret === undefined) delete process.env.WHOOP_CLIENT_SECRET; else process.env.WHOOP_CLIENT_SECRET = saved.secret;
  }
  assert.equal(logged.length, 1);
  assert.ok(!logged[0].includes('sentinel-client-secret'), `secret printed: ${logged[0]}`);
  assert.match(logged[0], /WHOOP_CLIENT_ID/);
});
