import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getOrCreatePlayer, recordAtomicBet, broadcastLiveBet, calculateDeterministicRakeback } from '@/lib/supabase';
import { calculatePlinkoPath, getPlinkoSlot, getPlinkoMultipliers } from '@/lib/provably-fair';
import { verifySession } from '@/lib/auth';
import { adminControlsState } from '@/lib/admin-controls-state';
import { applyAPIGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Origin + rate-limit guard (60 drops/min per IP)
    const guard = applyAPIGuard(req, { windowMs: 60_000, maxRequests: 60, blockMs: 30_000 });
    if (guard) return guard;

    // Maintenance Circuit Breaker Guard
    if (adminControlsState.getMaintenanceMode() || adminControlsState.getEnginePaused('PLINKO')) {
      return NextResponse.json({
        error: 'Plinko wagering is currently paused by the operator for maintenance.',
      }, { status: 503 });
    }

    const body = await req.json();
    const { walletAddress, wager, rows, risk, clientSeed, isDemo } = body;

    if (!wager || !rows || !risk) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (wager <= 0 || wager < 1 || wager > 500) {
      return NextResponse.json({ error: 'Invalid bet parameters. Wager must be $1–$500.' }, { status: 400 });
    }
    
    if (![8, 12, 16].includes(rows)) {
      return NextResponse.json({ error: 'Invalid rows. Must be 8, 12, or 16.' }, { status: 400 });
    }

    if (!['LOW', 'MEDIUM', 'HIGH'].includes(risk)) {
      return NextResponse.json({ error: 'Invalid risk level. Must be LOW, MEDIUM, or HIGH.' }, { status: 400 });
    }

    // Handle Demo Mode (Safe Provably-Fair Simulation without DB balance impact)
    if (isDemo) {
      const demoServerSeed = crypto.randomBytes(32).toString('hex');
      const demoServerSeedHash = crypto.createHash('sha256').update(demoServerSeed).digest('hex');
      const currentClientSeed = clientSeed || 'demo_player_seed';
      const currentNonce = Math.floor(Math.random() * 10000) + 1;

      const path = calculatePlinkoPath(demoServerSeed, currentClientSeed, currentNonce, rows);
      const slot = getPlinkoSlot(path);
      const multipliers = getPlinkoMultipliers(rows, risk as any);
      const multiplier = multipliers[slot];
      const payout = parseFloat((wager * multiplier).toFixed(2));
      const profit = parseFloat((payout - wager).toFixed(2));
      const won = multiplier > 1;

      return NextResponse.json({
        success: true,
        isDemo: true,
        path,
        slot,
        won,
        multiplier,
        payout,
        profit,
        serverSeedHash: demoServerSeedHash,
        serverSeed: demoServerSeed,
        newNonce: currentNonce + 1,
      });
    }

    // Security Check: Verify Cryptographic Session Cookie for Real Mode
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/cypher_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;

    if (!session || !session.wallet) {
      return NextResponse.json({
        error: 'Authentication required for Real Mode. Please connect your Web3 wallet or switch to Demo Mode.',
      }, { status: 401 });
    }

    const effectiveWallet = session.wallet;

    // If caller specified a wallet that differs from session cookie, reject spoofing attempt
    if (walletAddress && session.wallet !== walletAddress) {
      return NextResponse.json({ error: 'Session wallet mismatch: spoofing attempt rejected' }, { status: 403 });
    }

    // 1. Fetch server state for this player
    const profile = await getOrCreatePlayer(effectiveWallet);

    if (profile.balance_usdc < wager) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const currentClientSeed = clientSeed || profile.client_seed;
    const currentNonce = profile.nonce;
    const serverSeed = profile.active_server_seed;
    const serverSeedHash = profile.active_server_seed_hash;

    // 2. Server-Authoritative Cryptographic Calculation
    const path = calculatePlinkoPath(serverSeed, currentClientSeed, currentNonce, rows);
    const slot = getPlinkoSlot(path);
    const multipliers = getPlinkoMultipliers(rows, risk as any);
    const multiplier = multipliers[slot];
    
    const payout = parseFloat((wager * multiplier).toFixed(2));
    const profit = parseFloat((payout - wager).toFixed(2));
    const won = multiplier > 1;

    // 3. Calculate VIP Rakeback on theoretical house edge (approx 2% for Plinko)
    const rakebackEarned = calculateDeterministicRakeback(wager, 0.02, profile.vip_tier);

    // 4. Atomic Database Transaction
    const updatedState = await recordAtomicBet({
      wallet: effectiveWallet,
      gameType: 'PLINKO',
      wager,
      won,
      targetPayout: multiplier,
      outcome: slot, // Storing slot as outcome
      payout,
      profit,
      serverSeedHash,
      clientSeed: currentClientSeed,
      nonce: currentNonce,
      rakebackEarned,
    });

    // 5. Broadcast live bet in realtime across the platform
    broadcastLiveBet({
      wallet: effectiveWallet,
      gameType: 'PLINKO',
      wager,
      multiplier,
      payout,
      profit,
      won,
    });

    return NextResponse.json({
      success: true,
      path,
      slot,
      won,
      multiplier,
      payout,
      profit,
      newBalance: updatedState.new_balance,
      newNonce: updatedState.new_nonce,
      vipTier: updatedState.vip_tier,
      rakeback: updatedState.rakeback,
      serverSeedHash,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
