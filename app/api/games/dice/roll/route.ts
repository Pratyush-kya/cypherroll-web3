import { NextResponse } from 'next/server';
import { getOrCreatePlayer, recordAtomicBet, broadcastLiveBet } from '@/lib/supabase';
import { calculateDiceRoll, getDiceMultiplier } from '@/lib/provably-fair';
import { verifySession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { walletAddress, target, wager, clientSeed } = body;

    if (!target || !wager) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (wager <= 0 || target < 2 || target > 98) {
      return NextResponse.json({ error: 'Invalid bet parameters' }, { status: 400 });
    }

    // Security Check: Verify Cryptographic Session Cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/cypher_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;

    // Use verified wallet from cryptographically signed session, or fallback to provided address for guest play
    const effectiveWallet = session?.wallet || walletAddress || 'Anon_Guest';

    // If caller specified a wallet that differs from session cookie, reject spoofing attempt
    if (session?.wallet && walletAddress && session.wallet !== walletAddress) {
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

    // 3. Calculate 15% VIP Rakeback on theoretical house edge (1% on Dice)
    const theoreticalEdge = wager * 0.01;
    const rakebackEarned = parseFloat((theoreticalEdge * 0.15).toFixed(4));

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
