import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { executeDeposit } from '@/lib/supabase';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { walletAddress, amount, network } = body;

    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/cypher_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;

    const effectiveWallet = session?.wallet || walletAddress || 'Anon_Guest';
    const numAmount = parseFloat(amount);

    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Invalid deposit amount' }, { status: 400 });
    }

    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const result = await executeDeposit({
      wallet: effectiveWallet,
      amount: numAmount,
      chainType: network || 'BASE',
      txHash,
    });

    return NextResponse.json({
      success: true,
      amount: numAmount,
      newBalance: result.newBalance,
      txHash,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Deposit failed' }, { status: 500 });
  }
}
