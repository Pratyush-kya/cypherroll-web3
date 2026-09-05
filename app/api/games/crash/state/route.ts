import { NextResponse } from 'next/server';
import { crashEngine } from '@/lib/crash-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = crashEngine.getState();
    return NextResponse.json(state);
  } catch (err: any) {
    return NextResponse.json({
      roundId: 'fallback',
      status: 'STARTING',
      multiplier: 1.00,
      countdown: 5.0,
      serverSeedHash: '',
      activeBets: [],
      history: [],
      error: err.message,
    }, { status: 200 });
  }
}
