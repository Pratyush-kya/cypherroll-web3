/**
 * CypherRoll: Minimal Proof-of-Work (mPoW) Anti-DDoS Engine for Tor
 * Generates and verifies cryptographic Proof-of-Work challenges to defeat
 * bot floods and sybil attacks over Tor onion circuits without CAPTCHAs.
 */

import crypto from 'crypto';

const POW_SECRET = process.env.POW_SECRET || 'cypherroll_pow_secret_entropy_998877';
const DEFAULT_DIFFICULTY = 3; // 3 leading hex zeros (~4096 hash iterations = ~20-40ms in browser)
const CHALLENGE_TTL_MS = 60000; // 60 seconds expiration

export interface PoWChallengePayload {
  challengeId: string;
  prefix: string;
  difficulty: number;
  expiresAt: number;
  signature: string;
}

export interface PoWSolution {
  challengeId: string;
  prefix: string;
  nonce: number;
  hash: string;
  signature: string;
}

/**
 * Creates an HMAC-signed challenge that the client must solve
 */
export function generatePoWChallenge(difficulty: number = DEFAULT_DIFFICULTY): PoWChallengePayload {
  const challengeId = `pow_${crypto.randomBytes(8).toString('hex')}`;
  const prefix = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;

  const dataToSign = `${challengeId}:${prefix}:${difficulty}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', POW_SECRET).update(dataToSign).digest('hex');

  return {
    challengeId,
    prefix,
    difficulty,
    expiresAt,
    signature,
  };
}

/**
 * Verifies that the client submitted a valid Proof-of-Work solution
 */
export function verifyPoWSolution(solution: PoWSolution): { valid: boolean; reason?: string } {
  const { challengeId, prefix, nonce, hash, signature } = solution;

  // 1. Verify hash correctness: SHA256(prefix + nonce)
  const computedHash = crypto
    .createHash('sha256')
    .update(`${prefix}${nonce}`)
    .digest('hex');

  if (computedHash !== hash) {
    return { valid: false, reason: 'Hash mismatch' };
  }

  // 2. Verify leading zero difficulty requirement
  const targetPrefix = '0'.repeat(DEFAULT_DIFFICULTY);
  if (!computedHash.startsWith(targetPrefix)) {
    return { valid: false, reason: `Hash does not meet difficulty target (${DEFAULT_DIFFICULTY} leading zeroes)` };
  }

  return { valid: true };
}
