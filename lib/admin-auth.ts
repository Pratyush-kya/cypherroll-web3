/**
 * CypherRoll: Authoritative Operator Admin Authentication & Zero-Trust Security Gate
 */

import crypto from 'crypto';

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'cypherroll_admin_master_2026_x99!';
const SESSION_SECRET = process.env.SESSION_SECRET || 'cypherroll-super-secret-production-key-999';
const ADMIN_ALLOWED_WALLETS = (process.env.ADMIN_ALLOWED_WALLETS || '0x689692BcbE6afa3D6a80d7Fd7380cf0883d35Ad9')
  .toLowerCase()
  .split(',')
  .map(w => w.trim());

// Rate Limiting Map (In-Memory per Node instance)
interface RateLimitRecord {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour lockout

/**
 * Check and enforce rate limiting for admin login attempts
 */
export function checkAdminRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; lockedUntilSeconds: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (record) {
    // Check if currently locked out
    if (record.lockedUntil > now) {
      return {
        allowed: false,
        remainingAttempts: 0,
        lockedUntilSeconds: Math.ceil((record.lockedUntil - now) / 1000),
      };
    }

    // Check if attempt window expired, reset
    if (now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }

  const currentAttempts = record ? record.attempts : 0;
  const remaining = Math.max(0, MAX_ATTEMPTS - currentAttempts);
  return {
    allowed: true,
    remainingAttempts: remaining,
    lockedUntilSeconds: 0,
  };
}

/**
 * Record a failed admin attempt
 */
export function recordFailedAdminAttempt(ip: string): { remainingAttempts: number; locked: boolean; lockedUntilSeconds: number } {
  const now = Date.now();
  let record = rateLimitMap.get(ip);

  if (!record || now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
    record = { attempts: 1, firstAttempt: now, lockedUntil: 0 };
  } else {
    record.attempts += 1;
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    rateLimitMap.set(ip, record);
    return {
      remainingAttempts: 0,
      locked: true,
      lockedUntilSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
    };
  }

  rateLimitMap.set(ip, record);
  return {
    remainingAttempts: MAX_ATTEMPTS - record.attempts,
    locked: false,
    lockedUntilSeconds: 0,
  };
}

/**
 * Reset rate limit on successful authentication
 */
export function clearAdminRateLimit(ip: string): void {
  rateLimitMap.delete(ip);
}

/**
 * Constant-time comparison of the admin key to prevent timing attacks
 */
export function verifyAdminKey(inputKey: string): boolean {
  if (!inputKey || typeof inputKey !== 'string') return false;

  const inputHash = crypto.createHash('sha256').update(inputKey.trim()).digest();
  const targetHash = crypto.createHash('sha256').update(ADMIN_SECRET_KEY.trim()).digest();

  return crypto.timingSafeEqual(inputHash, targetHash);
}

/**
 * Check if a wallet address is in the authorized admin list
 */
export function isAuthorizedAdminWallet(wallet: string): boolean {
  if (!wallet) return false;
  return ADMIN_ALLOWED_WALLETS.includes(wallet.toLowerCase().trim());
}

const ADMIN_TOKEN_KEY = crypto.createHash('sha256').update(`${SESSION_SECRET}:${ADMIN_SECRET_KEY}`).digest();

/**
 * Issues an encrypted HMAC-SHA256 admin session token (24h validity)
 */
export function signAdminSession(metadata: { operatorIdentifier?: string; method: 'KEY' | 'WALLET' }): string {
  const payload = {
    role: 'CYPHER_OPERATOR',
    method: metadata.method,
    identifier: metadata.operatorIdentifier || 'master_operator',
    issuedAt: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };

  const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', ADMIN_TOKEN_KEY).update(serialized).digest('base64url');
  return `${serialized}.${signature}`;
}

/**
 * Validates an admin session token
 */
export function verifyAdminSessionToken(token: string): { valid: boolean; payload?: any } {
  if (!token) return { valid: false };
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };

  const [serialized, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', ADMIN_TOKEN_KEY).update(serialized).digest('base64url');

  if (signature !== expectedSig) return { valid: false };

  try {
    const payload = JSON.parse(Buffer.from(serialized, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) {
      return { valid: false };
    }
    if (payload.role !== 'CYPHER_OPERATOR') {
      return { valid: false };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

/**
 * Verifies admin session directly from request headers
 */
export function verifyAdminRequest(req: Request): boolean {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/cypher_admin_session=([^;]+)/);
  if (!match) return false;
  const result = verifyAdminSessionToken(match[1]);
  return result.valid;
}
