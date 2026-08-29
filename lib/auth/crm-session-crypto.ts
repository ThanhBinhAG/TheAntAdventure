import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function assertValidSessionEncryptionKey(value: string): Buffer {
  let key: Buffer;
  try {
    key = Buffer.from(value, 'base64url');
  } catch {
    throw new Error('SESSION_ENCRYPTION_KEY must be a base64url-encoded 32-byte key.');
  }
  if (!value || key.length !== 32) {
    throw new Error('SESSION_ENCRYPTION_KEY must be a base64url-encoded 32-byte key.');
  }
  return key;
}

export function encryptSessionSecret(plaintext: string, encodedKey: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, assertValidSessionEncryptionKey(encodedKey), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`;
}

export function decryptSessionSecret(payload: string, encodedKey: string): string {
  const [version, encodedIv, encodedTag, encodedCiphertext, ...unexpected] = payload.split('.');
  if (version !== 'v1' || !encodedIv || !encodedTag || !encodedCiphertext || unexpected.length) {
    throw new Error('Invalid encrypted CRM session credential.');
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    assertValidSessionEncryptionKey(encodedKey),
    Buffer.from(encodedIv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
