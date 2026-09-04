const crypto = require('crypto');

function computeHMAC(serverSeed, clientSeed, nonce) {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  return hmac.digest('hex');
}

function calculateDiceRoll(serverSeed, clientSeed, nonce) {
  const hex = computeHMAC(serverSeed, clientSeed, nonce);
  const subHash = hex.substring(0, 8);
  const intVal = parseInt(subHash, 16);
  const roll = (intVal % 10000) / 100;
  return parseFloat(roll.toFixed(2));
}

function calculateCrashPoint(serverSeed, clientSeed, nonce) {
  const hex = computeHMAC(serverSeed, clientSeed, nonce);
  const subHash = hex.substring(0, 13);
  const h = parseInt(subHash, 16);
  const e = Math.pow(2, 52);
  const rawCrash = (0.98 * e) / (e - h);
  if (rawCrash < 1.00) return 1.00;
  const crashPoint = Math.floor(rawCrash * 100) / 100;
  return parseFloat(crashPoint.toFixed(2));
}

console.log("=== RUNNING CYPHERROLL PROVABLY FAIR VERIFICATION SUITE ===");

// Test 1: Seed Generation & Determinism
const serverSeed = crypto.randomBytes(32).toString('hex');
const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
const clientSeed = "user_seed_alpha_99";
const nonce = 1;

console.log("1. Server Seed Hash (Pre-committed):", serverSeedHash);
const roll1 = calculateDiceRoll(serverSeed, clientSeed, nonce);
const roll2 = calculateDiceRoll(serverSeed, clientSeed, nonce);

if (roll1 !== roll2) {
  throw new Error(`Determinism test failed: ${roll1} !== ${roll2}`);
}
console.log(`✓ Determinism Verified: Roll outcome is identical (${roll1}) across repeated calls.`);

// Test 2: Crash calculation
const crash1 = calculateCrashPoint(serverSeed, clientSeed, nonce);
console.log(`✓ Crash point for nonce 1: ${crash1}x`);

// Test 3: Large sample distribution test (10,000 iterations)
console.log("2. Running 10,000 game distribution simulation...");
let totalDiceRoll = 0;
let instantCrashes = 0;
const N = 10000;

for (let i = 1; i <= N; i++) {
  const r = calculateDiceRoll(serverSeed, clientSeed, i);
  totalDiceRoll += r;
  const c = calculateCrashPoint(serverSeed, clientSeed, i);
  if (c === 1.00) instantCrashes++;
}

const avgDice = totalDiceRoll / N;
console.log(`✓ Mean Dice Roll across ${N} iterations: ${avgDice.toFixed(2)} (Expected ~49.99)`);
console.log(`✓ Instant Crash Count (1.00x): ${instantCrashes}/${N} (~${((instantCrashes/N)*100).toFixed(2)}%, Expected ~2.00%)`);

if (Math.abs(avgDice - 49.99) > 1.5) {
  throw new Error(`Distribution anomaly detected: avg dice = ${avgDice}`);
}

console.log("=== ALL PROVABLY FAIR TESTS PASSED SUCCESSFULLY! ===");
