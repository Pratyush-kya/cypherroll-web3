import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { supabaseAdmin, supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const sessionMatch = req.headers.get('cookie')?.match(/cr_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const wallet = session.wallet;
    const client = supabaseAdmin || supabase;

    if (!client) {
      return NextResponse.json({ success: true, claimed: 0 }); // Mock behavior
    }

    // Use a transaction/RPC or atomic update in production, but here we'll do standard select/update
    const { data: profile, error: profileErr } = await client
      .from('profiles')
      .select('id, balance_usdc, accumulated_rakeback')
      .eq('wallet_address', wallet)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.accumulated_rakeback <= 0) {
      return NextResponse.json({ error: 'No rakeback to claim' }, { status: 400 });
    }

    const claimed = profile.accumulated_rakeback;
    const newBalance = profile.balance_usdc + claimed;

    const { error: updateErr } = await client
      .from('profiles')
      .update({
        balance_usdc: newBalance,
        accumulated_rakeback: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)
      .gt('accumulated_rakeback', 0); // basic concurrency check

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to claim rakeback' }, { status: 500 });
    }

    return NextResponse.json({ success: true, claimed, newBalance });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
