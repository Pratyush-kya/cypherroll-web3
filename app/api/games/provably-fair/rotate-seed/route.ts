import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { rotatePlayerSeeds } from '@/lib/supabase';
import { generateServerSeed } from '@/lib/provably-fair';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientSeed, isDemo } = body;

    const newClientSeed = (clientSeed && typeof clientSeed === 'string' && clientSeed.trim())
      ? clientSeed.trim().substring(0, 64)
      : 'player_lucky_seed_' + Math.random().toString(36).substring(7);

    // If Demo Mode, generate a fresh real cryptographic pair
    if (isDemo) {
      const { serverSeed, serverSeedHash } = generateServerSeed();
      return NextResponse.json({
        success: true,
        isDemo: true,
        previousServerSeed: 'demo_revealed_' + Math.random().toString(36).substring(7),
        newServerSeedHash: serverSeedHash,
        clientSeed: newClientSeed,
        nonce: 1,
      });
    }

    // Real Mode: require verified session
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/cypher_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;

    if (!session || !session.wallet) {
      return NextResponse.json({
        error: 'Authentication required for Real Mode seed rotation',
      }, { status: 401 });
    }

    const result = await rotatePlayerSeeds(session.wallet, newClientSeed);

    return NextResponse.json({
      success: true,
      previousServerSeed: result.previousServerSeed,
      newServerSeedHash: result.newServerSeedHash,
      clientSeed: result.clientSeed,
      nonce: result.nonce,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Seed rotation failed' }, { status: 500 });
  }
}
