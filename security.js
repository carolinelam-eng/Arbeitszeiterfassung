const ITERATIONS = 150000;
const KEY_LENGTH = 256;
const HASH = 'SHA-256';

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function derivePinHash(pin, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH },
    keyMaterial,
    KEY_LENGTH
  );
  return new Uint8Array(bits);
}

export function isValidPin(pin) {
  return /^\d{4,12}$/.test(String(pin));
}

export async function hashPin(pin) {
  if (!isValidPin(pin)) throw new Error('PIN muss aus 4 bis 12 Ziffern bestehen.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePinHash(String(pin), salt);
  return {
    version: 1,
    algorithm: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: bytesToBase64(salt),
    hash: bytesToBase64(hash)
  };
}

export async function verifyPin(pin, record) {
  if (!record?.salt || !record?.hash || !isValidPin(pin)) return false;
  const actual = await derivePinHash(String(pin), base64ToBytes(record.salt));
  const expected = base64ToBytes(record.hash);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
  return difference === 0;
}
