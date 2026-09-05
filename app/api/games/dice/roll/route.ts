import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getOrCreatePlayer, recordAtomicBet, broadcastLiveBet, calculateDeterministicRakeback } from '@/lib/supabase';
import { calculateDiceRoll, getDiceMultiplier } from '@/lib/provably-fair';
import { verifySession } from '@/lib/auth';
import { adminControlsState } from '@/lib/admin-controls-state';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Maintenance Circuit Breaker Guard
    if (adminControlsState.getMaintenanceMode() || adminControlsState.getEnginePaused('DICE')) {
      return NextResponse.json({
        error: 'Dice wagering is currently paused by the operator for maintenance.',
      }, { status: 503 });
    }

    const body = await req.json();
    const { walletAddress, target, wager, clientSeed, isDemo } = body;

    if (!target || !wager) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (wager <= 0 || target < 2 || target > 98) {
      return NextResponse.json({ error: 'Invalid bet parameters' }, { status: 400 });
    }

    // Handle Demo Mode (Safe Provably-Fair Simulation without DB balance impact)
    if (isDemo) {
      const demoServerSeed = crypto.randomBytes(32).toString('hex');
      const demoServerSeedHash = crypto.createHash('sha256').update(demoServerSeed).digest('hex');
      const currentClientSeed = clientSeed || 'demo_player_seed';
      const currentNonce = Math.floor(Math.random() * 10000) + 1;

      const roll = calculateDiceRoll(demoServerSeed, currentClientSeed, currentNonce);
      const won = roll < target;
      const multiplier = getDiceMultiplier(target);
      const profit = won
        ? parseFloat(((wager * multiplier) - wager).toFixed(2))
        : -wager;

      return NextResponse.json({
        success: true,
        isDemo: true,
        roll,
        won,
        multiplier,
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
    const roll = calculateDiceRoll(serverSeed, currentClientSeed, currentNonce);
    const won = roll < target;
    const multiplier = getDiceMultiplier(target);
    const profit = won
      ? parseFloat(((wager * multiplier) - wager).toFixed(2))
      : -wager;
    const payout = won ? parseFloat((wager * multiplier).toFixed(2)) : 0.0;

    // 3. Calculate VIP Rakeback on theoretical house edge (1% on Dice)
    const rakebackEarned = calculateDeterministicRakeback(wager, 0.01, profile.vip_tier);

    // 4. Atomic Database Transaction
    const updatedState = await recordAtomicBet({
      wallet: effectiveWallet,
      gameType: 'DICE',
      wager,
      won,
      targetPayout: multiplier,
      outcome: roll,
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
      gameType: 'DICE',
      wager,
      multiplier,
      payout,
      profit,
      won,
    });

    return NextResponse.json({
      success: true,
      roll,
      won,
      multiplier,
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
