import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { executeDeposit } from '@/lib/supabase';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, network } = body;

    // Reject simulated balance credits in production unless explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SIMULATED_DEPOSITS !== 'true') {
      return NextResponse.json({
        error: 'Direct simulated deposits are disabled in production. Send USDC/SOL to the vault escrow address and submit the on-chain transaction hash for automated cryptographic verification.',
      }, { status: 403 });
    }

    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/cypher_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;

    if (!session || !session.wallet) {
      return NextResponse.json({ error: 'Authentication required: please connect and sign in with your Web3 wallet.' }, { status: 401 });
    }

    const effectiveWallet = session.wallet;
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
