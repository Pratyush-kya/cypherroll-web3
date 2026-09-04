import crypto from 'crypto';

export interface ProvablyFairSeeds {
  serverSeed: string;       // Secret 256-bit hex (revealed only after rotation)
  serverSeedHash: string;   // SHA-256(serverSeed) (shared BEFORE bet is placed)
  clientSeed: string;       // Chosen by player
  nonce: number;            // Monotonically increasing counter per seed pair
}

export interface DiceResult {
  roll: number;             // 0.00 - 99.99
  won: boolean;
  payoutMultiplier: number; // e.g. 1.98x
  payoutAmount: number;
}

export interface CrashResult {
  crashPoint: number;       // e.g. 2.45x
}

/**
 * Generates a cryptographically secure 256-bit server seed and its public SHA-256 hash.
 */
export function generateServerSeed(): { serverSeed: string; serverSeedHash: string } {
  const serverSeed = crypto.randomBytes(32).toString('hex');
  const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  return { serverSeed, serverSeedHash };
}

/**
 * Computes deterministic HMAC-SHA256 outcome hex string.
 */
export function computeHMAC(serverSeed: string, clientSeed: string, nonce: number): string {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  return hmac.digest('hex');
}

/**
 * CypherDice Game:
 * Maps HMAC to a float in range [0.00, 99.99].
 * House Edge: 1.00% (RTP: 99.00%)
 */
export function calculateDiceRoll(serverSeed: string, clientSeed: string, nonce: number): number {
  const hex = computeHMAC(serverSeed, clientSeed, nonce);
  // Extract first 8 hex characters (32 bits)
  const subHash = hex.substring(0, 8);
  const intVal = parseInt(subHash, 16);
  // Scale modulo 10000 to get two decimal precision
  const roll = (intVal % 10000) / 100;
  return parseFloat(roll.toFixed(2));
}

/**
 * Calculate Dice Payout Multiplier with 1.0% House Edge.
 * Target is Roll Under [1.00 to 98.00].
 */
export function getDiceMultiplier(targetNumber: number): number {
  if (targetNumber < 1 || targetNumber > 98) {
    throw new Error("Target number must be between 1.00 and 98.00");
  }
  const houseEdge = 0.01; // 1%
  const winProbability = targetNumber / 100;
  const multiplier = ((1 - houseEdge) / winProbability);
  return parseFloat(multiplier.toFixed(4));
}

/**
 * CypherCrash Game:
 * Industry standard formula (used by Bustabit/Rollbit):
 * Crash point = floor((0.98 * 2^52) / (2^52 - h) * 100) / 100
 * 2% instant crash chance (at 1.00x)
 */
export function calculateCrashPoint(serverSeed: string, clientSeed: string, nonce: number): number {
  const hex = computeHMAC(serverSeed, clientSeed, nonce);

  // Extract 52 bits (13 hex chars)
  const subHash = hex.substring(0, 13);
  const h = parseInt(subHash, 16);
  const e = Math.pow(2, 52);

  // Formula with exactly 2% mathematical house edge:
  // When h < 0.02 * e (which occurs with 2.0% probability), result is < 1.00 and clamps to 1.00 (instant crash)
  const rawCrash = (0.98 * e) / (e - h);
  if (rawCrash < 1.00) {
    return 1.00;
  }
  const crashPoint = Math.floor(rawCrash * 100) / 100;
  return parseFloat(crashPoint.toFixed(2));
}

/**
 * Independent Auditor Verification function
 */
export function verifyGameOutcome(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  gameType: 'DICE' | 'CRASH'
): { outcome: number; calculatedServerSeedHash: string } {
  const calculatedServerSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  const outcome = gameType === 'DICE'
    ? calculateDiceRoll(serverSeed, clientSeed, nonce)
    : calculateCrashPoint(serverSeed, clientSeed, nonce);

  return { outcome, calculatedServerSeedHash };
}
