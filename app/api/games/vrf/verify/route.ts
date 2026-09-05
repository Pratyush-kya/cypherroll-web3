import { NextResponse } from 'next/server';
import { verifyVRFProof, VRFRoundReceipt } from '@/lib/web3/vrf-entropy';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const receipt: VRFRoundReceipt = body.receipt;

    if (!receipt || !receipt.randomWord || !receipt.clientSeed || receipt.nonce === undefined) {
      return NextResponse.json({ error: 'Invalid VRF receipt structure' }, { status: 400 });
    }

    const verification = verifyVRFProof(receipt);

    return NextResponse.json({
      success: true,
      verified: verification.valid,
      expectedOutcome: verification.expectedOutcome,
      computedHash: verification.computedHash,
      matchesProvided: verification.valid,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'VRF verification failed' }, { status: 500 });
  }
}
