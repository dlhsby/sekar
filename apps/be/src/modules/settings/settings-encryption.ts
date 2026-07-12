import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * AES-256-GCM helpers for `is_secret` settings (ADR-049). The key comes from
 * `SETTINGS_ENCRYPTION_KEY` (base64, 32 bytes). Stored format: `iv:tag:ciphertext`
 * (all base64). Bootstrap/infra secrets never pass through here — only
 * operator-overridable catalog secrets.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

function getKey(): Buffer | null {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) return null;
  return key;
}

/** True when a valid encryption key is configured (secret writes require it). */
export function encryptionAvailable(): boolean {
  return getKey() !== null;
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  if (!key) throw new Error('SETTINGS_ENCRYPTION_KEY is not configured');
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  if (!key) throw new Error('SETTINGS_ENCRYPTION_KEY is not configured');
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed secret payload');
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
