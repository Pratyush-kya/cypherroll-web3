import { NextResponse } from 'next/server';
import { getRecentBets } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const bets = await getRecentBets(15);
    return NextResponse.json({ bets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch recent bets' }, { status: 500 });
  }
}
