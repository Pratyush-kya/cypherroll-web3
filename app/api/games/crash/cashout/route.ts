import { NextResponse } from 'next/server';
import { crashEngine } from '@/lib/crash-engine';
import { verifySession } from '@/lib/auth';
import { applyAPIGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Origin + rate-limit guard (120 cashouts/min — needs to be responsive)
    const guard = applyAPIGuard(req, { windowMs: 60_000, maxRequests: 120, blockMs: 10_000 });
    if (guard) return guard;

    const body = await req.json();
    const { walletAddress, isDemo, clientMultiplier, clientTimestamp } = body;

    // Handle Demo Mode — FIX: use full wallet ID consistent with bet route
    if (isDemo) {
      const demoId = walletAddress
        ? `demo_${walletAddress.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)}`
        : `demo_anon_unknown`;
      const result = await crashEngine.cashOut(demoId, clientMultiplier, clientTimestamp);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        isDemo: true,
        payout: result.payout,
        multiplier: result.multiplier,
        alreadyCashedOut: result.alreadyCashedOut,
      });
    }

    // Session validation for Real Mode
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/cypher_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;

    if (!session || !session.wallet) {
      return NextResponse.json({ error: 'Authentication required for Real Mode' }, { status: 401 });
    }

    const effectiveWallet = session.wallet;

    const result = await crashEngine.cashOut(effectiveWallet, clientMultiplier, clientTimestamp);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      payout: result.payout,
      multiplier: result.multiplier,
      newBalance: result.newBalance,
      vipTier: result.vipTier,
      rakeback: result.rakeback,
      alreadyCashedOut: result.alreadyCashedOut,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to cash out' }, { status: 500 });
  }
}
