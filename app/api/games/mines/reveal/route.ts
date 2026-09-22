import { NextResponse } from 'next/server';
import { getMinesMultiplier } from '@/lib/provably-fair';
import { activeMinesGames } from '@/lib/mines-state';
import { recordAtomicBet, broadcastLiveBet, calculateDeterministicRakeback, getOrCreatePlayer, refundPlayerWager } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { walletAddress, gameId, tileIndex, isDemo } = body;

    const game = activeMinesGames.get(walletAddress || 'Demo_Player');
    if (!game || game.gameId !== gameId) {
      return NextResponse.json({ error: 'Game not found or expired' }, { status: 404 });
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

      // Record losing bet
      // We already locked the wager, so we need to either refund and recordAtomicBet (which deducts), or just use a custom settle.
      // Since Dice uses recordAtomicBet, we can refund and then recordAtomicBet.
      await refundPlayerWager(game.wallet, game.wager);

      const updatedState = await recordAtomicBet({
        wallet: game.wallet,
        gameType: 'MINES',
        wager: game.wager,
        won: false,
        targetPayout: 0,
        outcome: 0, // 0 multiplier
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

    // Gem found
    return NextResponse.json({
      isMine: false,
      gemsRevealed,
      currentMultiplier,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
