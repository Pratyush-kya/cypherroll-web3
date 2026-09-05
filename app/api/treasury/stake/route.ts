import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getOrCreatePlayer, supabaseAdmin, supabase, recordBankrollStake } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { walletAddress, amount } = body;

    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/cypher_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;

    const effectiveWallet = session?.wallet;
    if (!effectiveWallet) {
      return NextResponse.json({ error: 'Authentication required: please connect and sign in with your Web3 wallet.' }, { status: 401 });
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return NextResponse.json({ error: 'Invalid stake amount' }, { status: 400 });
    }

    const profile = await getOrCreatePlayer(effectiveWallet);
    if (Number(profile.balance_usdc) < numAmount) {
      return NextResponse.json({ error: 'Insufficient balance to stake' }, { status: 400 });
    }

    const client = supabaseAdmin || supabase;
    const newBalance = parseFloat((Number(profile.balance_usdc) - numAmount).toFixed(2));

    if (client) {
      await client
        .from('profiles')
        .update({
          balance_usdc: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('wallet_address', effectiveWallet);

      // Record stake in bankroll_stakes
      await recordBankrollStake({
        wallet: effectiveWallet,
        amount: numAmount,
        poolShares: numAmount,
        apy: 19.4,
      });

      // Record in transactions ledger
      try {
        await client.from('transactions').insert({
          player_id: profile.id,
          wallet_address: effectiveWallet,
          type: 'STAKE_LP',
          amount: numAmount,
          currency: 'USDC',
          status: 'CONFIRMED',
        });
      } catch {}
    } else {
      profile.balance_usdc = newBalance;
    }

    return NextResponse.json({
      success: true,
      amountStaked: numAmount,
      newBalance,
      estimatedApy: 19.4,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Staking failed' }, { status: 500 });
  }
}
