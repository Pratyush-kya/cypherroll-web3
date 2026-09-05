import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { executeDeposit } from '@/lib/supabase';
import { verifyOnChainDeposit } from '@/lib/web3/deposit-listener';
import { screenWalletAddress, quarantineDeposit } from '@/lib/security/aml-screening';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { txHash, network, walletAddress, amount } = body;

    if (!txHash || !txHash.trim()) {
      return NextResponse.json({ error: 'Transaction hash is required' }, { status: 400 });
    }

    // Session validation
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/cypher_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;

    const effectiveWallet = session?.wallet;
    if (!effectiveWallet) {
      return NextResponse.json({ error: 'Authentication required. Please connect and sign in with your Web3 wallet.' }, { status: 401 });
    }

    const targetNetwork = (network || 'BASE').toUpperCase() as 'BASE' | 'ARB' | 'SOL';
    const numAmount = parseFloat(amount) || 50;

    // Automated AML / OFAC Sanctions Screening
    const amlScreening = screenWalletAddress(effectiveWallet);
    if (amlScreening.action === 'QUARANTINE_DEPOSIT') {
      quarantineDeposit(txHash.trim(), effectiveWallet, numAmount, amlScreening.flags.join(', '));
      return NextResponse.json({
        error: 'Deposit rejected: Address flagged by automated OFAC sanctions oracle.',
        quarantined: true,
        riskScore: amlScreening.riskScore,
        flags: amlScreening.flags,
        auditId: amlScreening.auditId,
      }, { status: 403 });
    }

    // Verify on-chain and check idempotency (no double-credit)
    const verification = await verifyOnChainDeposit({
      txHash: txHash.trim(),
      network: targetNetwork,
      walletAddress: effectiveWallet,
      amountFallback: numAmount,
    });

    if (!verification.verified) {
      return NextResponse.json({ error: verification.error || 'Failed to verify on-chain deposit' }, { status: 400 });
    }

    // Credit balance atomically in Supabase ledger
    const depositResult = await executeDeposit({
      wallet: effectiveWallet,
      amount: verification.amountUsdc,
      chainType: targetNetwork,
      txHash: verification.txHash,
    });

    return NextResponse.json({
      success: true,
      amount: verification.amountUsdc,
      newBalance: depositResult.newBalance,
      txHash: verification.txHash,
      network: targetNetwork,
      amlRiskScore: amlScreening.riskScore,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Deposit verification failed' }, { status: 500 });
  }
}
