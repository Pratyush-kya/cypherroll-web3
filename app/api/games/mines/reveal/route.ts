import { NextResponse } from 'next/server';
import { getMinesMultiplier } from '@/lib/provably-fair';
import { activeMinesGames, resolveMinesGame, encodeMinesToken } from '@/lib/mines-state';
import { recordAtomicBet, broadcastLiveBet, calculateDeterministicRakeback, getOrCreatePlayer, refundPlayerWager } from '@/lib/supabase';
import { applyAPIGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Fast reveal rate guard: 300 tile reveals/min per session/IP, soft 2s block
    const guard = applyAPIGuard(req, { windowMs: 60_000, maxRequests: 300, blockMs: 2_000 });
    if (guard) return guard;

    const body = await req.json();
    const { walletAddress, gameId, gameToken, tileIndex, isDemo } = body;

    // Resilient multi-tier resolution: checks encrypted stateless token first, then memory caches
    const game = resolveMinesGame({ gameToken, gameId, walletAddress });
    if (!game) {
      return NextResponse.json({
        error: 'Game not found or expired. Please start a new game.',
        code: 'GAME_EXPIRED',
      }, { status: 404 });
    }

    if (tileIndex < 0 || tileIndex > 24) {
      return NextResponse.json({ error: 'Invalid tile index' }, { status: 400 });
    }

    if (game.revealedTiles.includes(tileIndex)) {
      return NextResponse.json({ error: 'Tile already revealed' }, { status: 400 });
    }

    const isMine = game.minePositions.includes(tileIndex);
    game.revealedTiles.push(tileIndex);
    const gemsRevealed = game.revealedTiles.length;
    const currentMultiplier = getMinesMultiplier(game.mineCount, gemsRevealed);

    if (isMine) {
      // Game over, lost
      activeMinesGames.delete(game.gameId);
      activeMinesGames.delete(game.wallet);

      if (game.isDemo) {
        return NextResponse.json({
          isMine: true,
          gemsRevealed: gemsRevealed - 1, // Exclude the mine just clicked
          currentMultiplier: 0,
          minePositions: game.minePositions,
          profit: -game.wager,
        });
      }

      const profile = await getOrCreatePlayer(game.wallet);
      const rakebackEarned = calculateDeterministicRakeback(game.wager, 0.02, profile.vip_tier);

      // Settle locked wager
      await refundPlayerWager(game.wallet, game.wager);

      const updatedState = await recordAtomicBet({
        wallet: game.wallet,
        gameType: 'MINES',
        wager: game.wager,
        won: false,
        targetPayout: 0,
        outcome: 0,
        payout: 0,
        profit: -game.wager,
        serverSeedHash: game.serverSeedHash,
        clientSeed: game.clientSeed,
        nonce: game.nonce,
        rakebackEarned,
      });

      broadcastLiveBet({
        wallet: game.wallet,
        gameType: 'MINES',
        wager: game.wager,
        multiplier: 0,
        payout: 0,
        profit: -game.wager,
        won: false,
      });

      return NextResponse.json({
        isMine: true,
        gemsRevealed: gemsRevealed - 1,
        currentMultiplier: 0,
        minePositions: game.minePositions,
        newBalance: updatedState.new_balance,
        newNonce: updatedState.new_nonce,
        vipTier: updatedState.vip_tier,
        rakeback: updatedState.rakeback,
      });
    }

    // Gem found! Update in-memory caches and re-encode updated token
    activeMinesGames.set(game.gameId, game);
    activeMinesGames.set(game.wallet, game);
    const nextGameToken = encodeMinesToken(game);

    return NextResponse.json({
      isMine: false,
      gemsRevealed,
      currentMultiplier,
      gameToken: nextGameToken,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
