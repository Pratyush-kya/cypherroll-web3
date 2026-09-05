import { NextResponse } from 'next/server';
import { crashEngine } from '@/lib/crash-engine';
import { lockPlayerWager, refundPlayerWager } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';
import { adminControlsState } from '@/lib/admin-controls-state';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Maintenance Circuit Breaker Guard
    if (adminControlsState.getMaintenanceMode() || adminControlsState.getEnginePaused('CRASH')) {
      return NextResponse.json({
        error: 'Crash wagering is currently paused by the operator for maintenance.',
      }, { status: 503 });
    }

    const body = await req.json();
    const { walletAddress, wager, isDemo, autoCashout } = body;

    if (!wager || wager <= 0) {
      return NextResponse.json({ error: 'Invalid wager amount' }, { status: 400 });
    }

    let parsedAutoCashout: number | undefined = undefined;
    if (autoCashout !== undefined && autoCashout !== null && autoCashout !== '') {
      const num = Number(autoCashout);
      if (isNaN(num) || num < 1.01 || num > 10000) {
        return NextResponse.json({ error: 'Auto-cashout multiplier must be between 1.01× and 10,000×' }, { status: 400 });
      }
      parsedAutoCashout = parseFloat(num.toFixed(2));
    }

    // Handle Demo Mode (virtual play without DB balance locks)
    if (isDemo) {
      const demoWallet = 'demo_' + (walletAddress ? walletAddress.substring(0, 6) : 'player');
      const result = await crashEngine.placeBet(demoWallet, wager, parsedAutoCashout);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        isDemo: true,
        wallet: demoWallet,
        wager,
        autoCashout: parsedAutoCashout,
      });
    }

    // Session validation for Real Mode
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/cypher_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;

    if (!session || !session.wallet) {
      return NextResponse.json({
        error: 'Authentication required for Real Mode. Please connect your Web3 wallet or switch to Demo Mode.',
      }, { status: 401 });
    }

    const effectiveWallet = session.wallet;

    // Lock balance atomically in database ledger (prevents double-spending)
    const lockResult = await lockPlayerWager(effectiveWallet, wager);
    if (!lockResult.success) {
      return NextResponse.json({ error: lockResult.error || 'Insufficient balance' }, { status: 400 });
    }

    // Register bet in global multiplayer crash engine with server-side auto-cashout
    const result = await crashEngine.placeBet(effectiveWallet, wager, parsedAutoCashout);
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
      autoCashout: parsedAutoCashout,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to place crash bet' }, { status: 500 });
  }
}
