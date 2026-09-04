import { NextResponse } from 'next/server';
import { crashEngine } from '@/lib/crash-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(crashEngine.getState());
}
