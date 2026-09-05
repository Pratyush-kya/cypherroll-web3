import { NextResponse } from 'next/server';
import { generatePoWChallenge, verifyPoWSolution, PoWSolution } from '@/lib/security/pow-challenge';

export const dynamic = 'force-dynamic';

export async function GET() {
  const challenge = generatePoWChallenge();
  return NextResponse.json({
    success: true,
    challenge,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const solution: PoWSolution = body.solution;

    if (!solution || !solution.hash) {
      return NextResponse.json({ error: 'Missing PoW solution' }, { status: 400 });
    }

    const verification = verifyPoWSolution(solution);
    if (!verification.valid) {
      return NextResponse.json({ error: verification.reason || 'Invalid PoW solution' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      verified: true,
      bypassToken: `cypher_pow_ok_${Date.now()}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'PoW validation failed' }, { status: 500 });
  }
}
