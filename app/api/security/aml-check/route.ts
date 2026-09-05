import { NextResponse } from 'next/server';
import { screenWalletAddress, quarantinedDeposits } from '@/lib/security/aml-screening';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
    }

    const screening = screenWalletAddress(walletAddress);

    return NextResponse.json({
      success: true,
      screening,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AML screening check failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    activeQuarantines: Array.from(quarantinedDeposits.values()),
    status: 'AML_ORACLE_ACTIVE',
  });
}
