import crypto from 'crypto';

/**
 * CypherRoll Cryptographic Engine for Chat Security
 * 
 * Architecture:
 * 1. AES-256-GCM: Symmetric authenticated encryption for confidential messaging.
 * 2. HMAC-SHA256: Cryptographic hash signature ensuring tamper-proof integrity & non-repudiation.
 */

const DEFAULT_SECRET = 'cypherroll_secret_session_encryption_key_2026_ultra_secure';

// Derive 32-byte (256-bit) encryption key using SHA-256
function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_SECRET_KEY || DEFAULT_SECRET;
  return crypto.createHash('sha256').update(secret).digest();
}

// Derive 32-byte HMAC integrity key
function getHmacKey(): Buffer {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_SECRET_KEY || DEFAULT_SECRET;
  return crypto.createHash('sha256').update(secret + ':hmac_integrity').digest();
}

export interface EncryptedMessagePayload {
  ciphertext: string;
  iv: string;
  tag: string;
  hmac: string;
  algorithm: 'AES-256-GCM';
  hashAlgorithm: 'HMAC-SHA256';
}

/**
 * Encrypt a plaintext message using AES-256-GCM and sign with HMAC-SHA256
 */
export function encryptMessage(plainText: string): string {
  if (!plainText) return '';

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Recommended 12 bytes for GCM

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let ciphertext = cipher.update(plainText, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const tag = cipher.getAuthTag().toString('hex');
  const ivHex = iv.toString('hex');

  // Compute HMAC-SHA256 over (iv + tag + ciphertext) to guarantee message integrity
  const hmac = crypto
    .createHmac('sha256', getHmacKey())
    .update(`${ivHex}:${tag}:${ciphertext}`)
    .digest('hex');

  // Serialized format: enc:v1:<iv>:<tag>:<hmac>:<ciphertext>
  return `enc:v1:${ivHex}:${tag}:${hmac}:${ciphertext}`;
}

/**
 * Decrypt an AES-256-GCM message and verify its HMAC-SHA256 integrity signature
 */
export function decryptMessage(payload: string): { text: string; verified: boolean } {
  if (!payload) return { text: '', verified: false };

  // If not encrypted in enc:v1 format, return as legacy plaintext
  if (!payload.startsWith('enc:v1:')) {
    return { text: payload, verified: false };
  }

  try {
    const parts = payload.split(':');
    if (parts.length !== 6) {
      return { text: '[Encrypted Message: Invalid Format]', verified: false };
    }

    const [, , ivHex, tagHex, hmacHex, ciphertext] = parts;

    // 1. Verify HMAC-SHA256 signature first
    const expectedHmac = crypto
      .createHmac('sha256', getHmacKey())
      .update(`${ivHex}:${tagHex}:${ciphertext}`)
      .digest('hex');

    const hmacMatches = crypto.timingSafeEqual(
      Buffer.from(hmacHex, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    );

    if (!hmacMatches) {
      console.error('Cryptographic signature verification failed: message has been tampered with!');
      return { text: '⚠️ [Tampered Message Detected: Signature Mismatch]', verified: false };
    }

    // 2. Decrypt AES-256-GCM
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return { text: decrypted, verified: true };
  } catch (err: any) {
    console.error('Decryption error:', err.message);
    return { text: '[Decryption Error]', verified: false };
  }
}

/**
 * Helper to check if a message string is encrypted
 */
export function isMessageEncrypted(message: string): boolean {
  return typeof message === 'string' && message.startsWith('enc:v1:');
}
