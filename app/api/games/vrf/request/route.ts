import { NextResponse } from 'next/server';
import { requestOnChainVRF } from '@/lib/web3/vrf-entropy';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientSeed = 'high_roller_player_seed', nonce = 1, chain = 'Base' } = body;

    const roundId = `vrf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const receipt = await requestOnChainVRF(roundId, clientSeed, Number(nonce), chain);

    return NextResponse.json({
      success: true,
      receipt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to request VRF randomness' }, { status: 500 });
  }
}
