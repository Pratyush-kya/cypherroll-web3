import { NextResponse } from 'next/server';
import { getDetailedGameProof } from '@/lib/provably-fair';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serverSeed, clientSeed, nonce, gameType, expectedServerSeedHash } = body;

    if (!serverSeed || typeof serverSeed !== 'string' || !serverSeed.trim()) {
      return NextResponse.json({ error: 'Server seed (hex string) is required for verification' }, { status: 400 });
    }

    const cleanClientSeed = (clientSeed && typeof clientSeed === 'string' && clientSeed.trim())
      ? clientSeed.trim()
      : 'cypher_default_client_seed';

    const numNonce = Math.max(1, parseInt(nonce) || 1);
    const targetGame = (gameType === 'CRASH' ? 'CRASH' : 'DICE') as 'DICE' | 'CRASH';

    const proof = getDetailedGameProof(serverSeed.trim(), cleanClientSeed, numNonce, targetGame);

    // Validate pre-commitment hash if provided
    let hashMatches: boolean | null = null;
    if (expectedServerSeedHash && typeof expectedServerSeedHash === 'string') {
      hashMatches = proof.serverSeedHash.toLowerCase() === expectedServerSeedHash.trim().toLowerCase();
    }

    return NextResponse.json({
      success: true,
      valid: true,
      hashMatches,
      proof,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Cryptographic verification failed' }, { status: 500 });
  }
}
