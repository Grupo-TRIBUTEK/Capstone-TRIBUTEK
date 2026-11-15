import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALG = 'aes-256-gcm';
const IV_LEN = 12;

function getKey(): Buffer {
  const raw = process.env['TWO_FACTOR_ENCRYPTION_KEY'];
  if (!raw) throw new Error('TWO_FACTOR_ENCRYPTION_KEY must be configured.');
  // Derive a stable 32-byte key from provided secret material.
  return scryptSync(raw, 'tributek-2fa-v1', 32);
}

/** Encrypts a UTF-8 string and returns base64(iv.tag.ciphertext). */
export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

/** Decrypts base64(iv.tag.ciphertext). Throws on tampering/invalid data. */
export function decryptSecret(payload: string): string {
  const key = getKey();
  const buf = Buffer.from(payload, 'base64');
  if (buf.length < IV_LEN + 16 + 1) throw new Error('Invalid encrypted secret payload.');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + 16);
  const data = buf.subarray(IV_LEN + 16);
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}

/** Attempts decrypt for backward compatibility with legacy plaintext secrets. */
export function readSecret(stored: string): string {
  try {
    return decryptSecret(stored);
  } catch {
    // Legacy/plain fallback (e.g. pre-encryption rows); treat as plaintext if plausible base32.
    if (/^[A-Z2-7]+=*$/i.test(stored.trim())) return stored.trim();
    throw new Error('No se pudo leer el secreto 2FA.');
  }
}
