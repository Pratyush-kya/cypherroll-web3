import { NextResponse } from 'next/server';
import { getTreasuryStatus } from '@/lib/web3/deposit-listener';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await getTreasuryStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch treasury status' }, { status: 500 });
  }
}
