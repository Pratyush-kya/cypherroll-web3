import { NextResponse } from 'next/server';
import { getMinesMultiplier } from '@/lib/provably-fair';
import { activeMinesGames } from '@/lib/mines-state';
import { recordAtomicBet, broadcastLiveBet, calculateDeterministicRakeback, getOrCreatePlayer, refundPlayerWager } from '@/lib/supabase';
import { applyAPIGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Origin + rate-limit guard (60 cashouts/min)
    const guard = applyAPIGuard(req, { windowMs: 60_000, maxRequests: 60, blockMs: 15_000 });
    if (guard) return guard;

    const body = await req.json();
    const { walletAddress, gameId } = body;

    const game = activeMinesGames.get(walletAddress || 'Demo_Player');
    if (!game || game.gameId !== gameId) {
      return NextResponse.json({ error: 'Game not found or expired' }, { status: 404 });
    }

    if (game.revealedTiles.length === 0) {
      return NextResponse.json({ error: 'Cannot cashout without revealing any tiles' }, { status: 400 });
    }

    const gemsRevealed = game.revealedTiles.length;
    const currentMultiplier = getMinesMultiplier(game.mineCount, gemsRevealed);
    
    const payout = parseFloat((game.wager * currentMultiplier).toFixed(2));
    const profit = parseFloat((payout - game.wager).toFixed(2));

    activeMinesGames.delete(game.wallet);

    if (game.isDemo) {
      return NextResponse.json({
        payout,
        profit,
        multiplier: currentMultiplier,
        minePositions: game.minePositions,
      });
    }

    const profile = await getOrCreatePlayer(game.wallet);
    const rakebackEarned = calculateDeterministicRakeback(game.wager, 0.02, profile.vip_tier);

    await refundPlayerWager(game.wallet, game.wager);

    const updatedState = await recordAtomicBet({
      wallet: game.wallet,
      gameType: 'MINES',
      wager: game.wager,
      won: true,
      targetPayout: currentMultiplier,
      outcome: currentMultiplier,
      payout,
      profit,
      serverSeedHash: game.serverSeedHash,
      clientSeed: game.clientSeed,
      nonce: game.nonce,
      rakebackEarned,
    });

    broadcastLiveBet({
      wallet: game.wallet,
      gameType: 'MINES',
      wager: game.wager,
      multiplier: currentMultiplier,
      payout,
      profit,
      won: true,
    });

    return NextResponse.json({
      payout,
      profit,
      multiplier: currentMultiplier,
      minePositions: game.minePositions,
      newBalance: updatedState.new_balance,
      newNonce: updatedState.new_nonce,
      vipTier: updatedState.vip_tier,
      rakeback: updatedState.rakeback,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
