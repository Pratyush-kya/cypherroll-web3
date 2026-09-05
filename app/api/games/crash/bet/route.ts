import { NextResponse } from 'next/server';
import { crashEngine } from '@/lib/crash-engine';
import { lockPlayerWager, refundPlayerWager } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { walletAddress, wager } = body;

    if (!wager || wager <= 0) {
      return NextResponse.json({ error: 'Invalid wager amount' }, { status: 400 });
    }

    // Session validation
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/cypher_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;

    const effectiveWallet = session?.wallet || walletAddress || 'Anon_Guest';

    // Lock balance atomically in database ledger (prevents double-spending)
    const lockResult = await lockPlayerWager(effectiveWallet, wager);
    if (!lockResult.success) {
      return NextResponse.json({ error: lockResult.error || 'Insufficient balance' }, { status: 400 });
    }

    // Register bet in global multiplayer crash engine
    const result = await crashEngine.placeBet(effectiveWallet, wager);
    if (!result.success) {
      // Refund if engine rejects (e.g. countdown elapsed)
      await refundPlayerWager(effectiveWallet, wager);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      newBalance: lockResult.newBalance,
      wallet: effectiveWallet,
      wager,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to place crash bet' }, { status: 500 });
  }
}
