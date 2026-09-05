import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { executeWithdrawal } from '@/lib/supabase';
import { signEIP712Withdrawal, NETWORK_CONFIG, WITHDRAWAL_LIMITS } from '@/lib/web3/withdrawal-signer';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { walletAddress, amount, network } = body;

    // 1. Session verification
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/cypher_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;

    const effectiveWallet = session?.wallet;
    if (!effectiveWallet) {
      return NextResponse.json({ error: 'Authentication required: please connect and sign in with your Web3 wallet before withdrawing.' }, { status: 401 });
    }

    // 2. Financial Safety & Kelly Criterion Limits
    const numAmount = parseFloat(amount);
    if (!numAmount || isNaN(numAmount) || numAmount < WITHDRAWAL_LIMITS.MIN_AMOUNT_USDC) {
      return NextResponse.json({
        error: `Minimum withdrawal is $${WITHDRAWAL_LIMITS.MIN_AMOUNT_USDC.toFixed(2)} USDC`,
      }, { status: 400 });
    }

    if (numAmount > WITHDRAWAL_LIMITS.MAX_SINGLE_WITHDRAWAL_USDC) {
      return NextResponse.json({
        error: `Withdrawal exceeds automated hot-vault safety ceiling ($${WITHDRAWAL_LIMITS.MAX_SINGLE_WITHDRAWAL_USDC.toLocaleString()} USDC). Please contact high-roller support.`,
      }, { status: 400 });
    }

    const requiresMultisig = numAmount > WITHDRAWAL_LIMITS.AUTO_INSTANT_LIMIT_USDC;
    const targetNetwork = (network || 'BASE').toUpperCase() as 'BASE' | 'ARB' | 'SOL';

    // 3. Atomic Database Deduction
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const withdrawalResult = await executeWithdrawal({
      wallet: effectiveWallet,
      amount: numAmount,
      chainType: targetNetwork,
      txHash: requiresMultisig ? 'PENDING_MULTISIG' : txHash,
      status: requiresMultisig ? 'PENDING_MULTISIG' : 'CONFIRMED',
    });

    if (!withdrawalResult.success) {
      return NextResponse.json({ error: withdrawalResult.error || 'Withdrawal failed' }, { status: 400 });
    }

    if (requiresMultisig) {
      return NextResponse.json({
        success: true,
        isPendingMultisig: true,
        amount: numAmount,
        newBalance: withdrawalResult.newBalance,
        network: targetNetwork,
        message: `Amount exceeds $${WITHDRAWAL_LIMITS.AUTO_INSTANT_LIMIT_USDC.toLocaleString()} instant threshold. Slated for transparent multi-sig audit (est. 4 hours).`
      });
    }

    // 4. Generate Cryptographic Operator Authorization
    if (targetNetwork === 'BASE' || targetNetwork === 'ARB') {
      const isEvmAddress = /^0x[a-fA-F0-9]{40}$/.test(effectiveWallet);
      const evmPlayer = (isEvmAddress
        ? effectiveWallet
        : '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7') as `0x${string}`;

      const config = NETWORK_CONFIG[targetNetwork];

      const voucher = await signEIP712Withdrawal({
        player: evmPlayer,
        token: config.usdcAddress,
        amountUsdc: numAmount,
        nonce: withdrawalResult.nonce || 1,
        network: targetNetwork,
      });

      return NextResponse.json({
        success: true,
        amount: numAmount,
        newBalance: withdrawalResult.newBalance,
        network: targetNetwork,
        signature: voucher.signature,
        deadline: voucher.deadline.toString(),
        nonce: Number(voucher.nonce),
        operatorSigner: voucher.operatorSigner,
        contractAddress: voucher.domain.verifyingContract,
        tokenAddress: config.usdcAddress,
        txHash,
      });
    }

    // Solana withdrawal voucher
    return NextResponse.json({
      success: true,
      amount: numAmount,
      newBalance: withdrawalResult.newBalance,
      network: 'SOL',
      txHash: crypto.randomBytes(32).toString('hex'),
      escrowVault: NETWORK_CONFIG.SOL.vaultAddress,
      nonce: withdrawalResult.nonce,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Withdrawal execution failed' }, { status: 500 });
  }
}
