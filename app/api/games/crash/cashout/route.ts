import { NextResponse } from 'next/server';
import { crashEngine } from '@/lib/crash-engine';
import { verifySession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { walletAddress } = body;

    // Session validation
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/cypher_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;

    const effectiveWallet = session?.wallet || walletAddress || 'Anon_Guest';

    const result = await crashEngine.cashOut(effectiveWallet);
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
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to cash out' }, { status: 500 });
  }
}
