import { NextResponse } from 'next/server';
import { getOrCreatePlayer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
  }

  try {
    const profile = await getOrCreatePlayer(wallet);
    return NextResponse.json({
      success: true,
      profile: {
        wallet: profile.wallet_address,
        balance: profile.balance_usdc,
        totalWagered: profile.total_wagered,
        totalWon: profile.total_won,
        vipTier: profile.vip_tier,
        rakeback: profile.accumulated_rakeback,
        serverSeedHash: profile.active_server_seed_hash,
        clientSeed: profile.client_seed,
        nonce: profile.nonce,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
