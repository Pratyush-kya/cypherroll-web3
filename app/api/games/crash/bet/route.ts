import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { crashEngine } from '@/lib/crash-engine';
import { lockPlayerWager, refundPlayerWager } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';
import { adminControlsState } from '@/lib/admin-controls-state';
import { applyAPIGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Origin + rate-limit guard (120 crash bets/min per session/IP, soft 2s block)
    const guard = applyAPIGuard(req, { windowMs: 60_000, maxRequests: 120, blockMs: 2_000 });
    if (guard) return guard;
    // Maintenance Circuit Breaker Guard
    if (adminControlsState.getMaintenanceMode() || adminControlsState.getEnginePaused('CRASH')) {
      return NextResponse.json({
        error: 'Crash wagering is currently paused by the operator for maintenance.',
      }, { status: 503 });
    }

    const body = await req.json();
    const { walletAddress, wager, isDemo, autoCashout } = body;

    if (!wager || wager < 1 || wager > 1000) {
      return NextResponse.json({ error: 'Invalid wager. Must be $1–$1,000.' }, { status: 400 });
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
    // FIX: Use full wallet address (not first 6 chars) to prevent identity collision
    // between different wallets sharing the same prefix.
    if (isDemo) {
      const demoId = walletAddress
        ? `demo_${walletAddress.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)}`
        : `demo_anon_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;
      const result = await crashEngine.placeBet(demoId, wager, parsedAutoCashout);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        isDemo: true,
        wallet: demoId,
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
