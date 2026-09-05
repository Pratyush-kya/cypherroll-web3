import { NextResponse } from 'next/server';
import { verifySession, signSession, SESSION_MAX_AGE_SECONDS } from '@/lib/auth';
import { getOrCreatePlayer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie') || '';
  const sessionMatch = cookieHeader.match(/cypher_session=([^;]+)/);
  const sessionToken = sessionMatch ? sessionMatch[1] : null;

  if (!sessionToken) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  const session = verifySession(sessionToken);
  if (!session || !session.wallet) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  try {
    const profile = await getOrCreatePlayer(session.wallet, session.chain);
    const res = NextResponse.json({
      authenticated: true,
      profile: {
        wallet: profile.wallet_address,
        chain: profile.chain_type,
        balance: profile.balance_usdc,
        vipTier: profile.vip_tier,
        accumulatedRakeback: profile.accumulated_rakeback,
        totalWagered: profile.total_wagered,
      },
    });

    // Sliding-window renewal: refresh 1-year cookie so active users remain permanently authenticated
    const renewedToken = signSession({
      wallet: session.wallet,
      chain: session.chain,
      exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    });
    res.cookies.set('cypher_session', renewedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}
