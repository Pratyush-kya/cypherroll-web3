/**
 * Client-side Proof-of-Work solver for Tor Anti-DDoS protection
 * Uses browser native Web Crypto API (crypto.subtle)
 */

import { PoWChallengePayload, PoWSolution } from './pow-challenge';

export async function solvePoWChallenge(challenge: PoWChallengePayload): Promise<PoWSolution> {
  const { challengeId, prefix, difficulty, signature } = challenge;
  const targetPrefix = '0'.repeat(difficulty);

  let nonce = 0;
  const encoder = new TextEncoder();

  while (true) {
    const input = `${prefix}${nonce}`;
    const data = encoder.encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    if (hashHex.startsWith(targetPrefix)) {
      return {
        challengeId,
        prefix,
        nonce,
        hash: hashHex,
        signature,
      };
    }

    nonce++;
    // Yield every 1000 iterations to keep the UI responsive
    if (nonce % 1000 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
}
