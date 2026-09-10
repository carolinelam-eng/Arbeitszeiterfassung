import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { hashPin, verifyPin, isValidPin } from '../src/security.js';

test('hashPin stores a salted hash rather than the plaintext PIN', async () => {
  const record = await hashPin('5831');
  assert.equal(typeof record.salt, 'string');
  assert.equal(typeof record.hash, 'string');
  assert.notEqual(record.hash, '5831');
  assert.ok(record.salt.length > 10);
  assert.ok(record.hash.length > 20);
});

test('verifyPin accepts the correct PIN and rejects a wrong PIN', async () => {
  const record = await hashPin('5831');
  assert.equal(await verifyPin('5831', record), true);
  assert.equal(await verifyPin('5832', record), false);
});

test('admin PIN must contain 4 to 12 digits', () => {
  assert.equal(isValidPin('1234'), true);
  assert.equal(isValidPin('123456789012'), true);
  assert.equal(isValidPin('123'), false);
  assert.equal(isValidPin('1234567890123'), false);
  assert.equal(isValidPin('12a4'), false);
});

test('production source does not contain the former default PIN', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const db = await readFile(new URL('../src/db.js', import.meta.url), 'utf8');
  assert.equal(app.includes('2468'), false);
  assert.equal(db.includes('2468'), false);
});

test('service worker caches the PIN security module', async () => {
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  assert.equal(sw.includes('./src/security.js'), true);
});
