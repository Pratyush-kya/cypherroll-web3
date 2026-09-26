import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getOrCreatePlayer, lockPlayerWager } from '@/lib/supabase';
import { calculateMinePositions } from '@/lib/provably-fair';
import { verifySession } from '@/lib/auth';
import { adminControlsState } from '@/lib/admin-controls-state';
import { activeMinesGames, encodeMinesToken, ActiveMinesGame } from '@/lib/mines-state';
import { applyAPIGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Generous gaming rate guard: 120 starts/min per session/IP, soft 2s block
    const guard = applyAPIGuard(req, { windowMs: 60_000, maxRequests: 120, blockMs: 2_000 });
    if (guard) return guard;

    if (adminControlsState.getMaintenanceMode() || adminControlsState.getEnginePaused('MINES')) {
      return NextResponse.json({
        error: 'Mines wagering is currently paused by the operator for maintenance.',
      }, { status: 503 });
    }

    const body = await req.json();
    const { walletAddress, mineCount, wager, clientSeed, isDemo } = body;

    if (!mineCount || !wager) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (wager <= 0 || wager < 1 || wager > 500 || mineCount < 10 || mineCount > 24) {
      return NextResponse.json({ error: 'Invalid bet parameters. Wager must be $1–$500. Mine count must be 10–24.' }, { status: 400 });
    }

    const gameId = crypto.randomUUID();

    if (isDemo) {
      const demoServerSeed = crypto.randomBytes(32).toString('hex');
      const demoServerSeedHash = crypto.createHash('sha256').update(demoServerSeed).digest('hex');
      const currentClientSeed = clientSeed || 'demo_player_seed';
      const currentNonce = Math.floor(Math.random() * 100000) + 1;

      const minePositions = calculateMinePositions(demoServerSeed, currentClientSeed, currentNonce, mineCount);

      const game: ActiveMinesGame = {
        gameId,
        wallet: walletAddress || 'Demo_Player',
        mineCount,
        wager,
        minePositions,
        revealedTiles: [],
        serverSeed: demoServerSeed,
        serverSeedHash: demoServerSeedHash,
        clientSeed: currentClientSeed,
        nonce: currentNonce,
        isDemo: true,
        createdAt: Date.now(),
      };

      // Store in memory cache with unique gameId as key to avoid demo multi-player collisions
      activeMinesGames.set(gameId, game);
      activeMinesGames.set(game.wallet, game);

      // Generate stateless encrypted token
      const gameToken = encodeMinesToken(game);

      return NextResponse.json({
        success: true,
        gameId,
        gameToken,
        serverSeedHash: demoServerSeedHash,
        mineCount,
        isDemo: true,
      });
    }

    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/cypher_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;

    if (!session || !session.wallet) {
      return NextResponse.json({
        error: 'Authentication required for Real Mode. Please connect your Web3 wallet or switch to Demo Mode.',
      }, { status: 401 });
    }

    const effectiveWallet = session.wallet;

    if (walletAddress && session.wallet.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Session wallet mismatch: spoofing attempt rejected' }, { status: 403 });
    }

    const profile = await getOrCreatePlayer(effectiveWallet);

    if (profile.balance_usdc < wager) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Lock wager
    const lockResult = await lockPlayerWager(effectiveWallet, wager);
    if (!lockResult.success) {
      return NextResponse.json({ error: lockResult.error }, { status: 400 });
    }

    const currentClientSeed = clientSeed || profile.client_seed;
    const currentNonce = profile.nonce;
    const serverSeed = profile.active_server_seed;
    const serverSeedHash = profile.active_server_seed_hash;

    const minePositions = calculateMinePositions(serverSeed, currentClientSeed, currentNonce, mineCount);

    const game: ActiveMinesGame = {
      gameId,
      wallet: effectiveWallet,
      mineCount,
      wager,
      minePositions,
      revealedTiles: [],
      serverSeed,
      serverSeedHash,
      clientSeed: currentClientSeed,
      nonce: currentNonce,
      isDemo: false,
      createdAt: Date.now(),
    };

    activeMinesGames.set(gameId, game);
    activeMinesGames.set(effectiveWallet, game);

    const gameToken = encodeMinesToken(game);

    return NextResponse.json({
      success: true,
      gameId,
      gameToken,
      serverSeedHash,
      mineCount,
      isDemo: false,
      newBalance: lockResult.newBalance,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
