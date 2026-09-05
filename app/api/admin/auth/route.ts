import { NextResponse } from 'next/server';
import {
  checkAdminRateLimit,
  recordFailedAdminAttempt,
  clearAdminRateLimit,
  verifyAdminKey,
  isAuthorizedAdminWallet,
  signAdminSession,
  verifyAdminRequest,
} from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

/**
 * GET: Check if current request has a valid operator admin session
 */
export async function GET(req: Request) {
  const isValid = verifyAdminRequest(req);
  return NextResponse.json({ authenticated: isValid });
}

/**
 * POST: Authenticate with Master Admin Key or Authorized Operator Wallet
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    // 1. Check Rate Limit
    const rateCheck = checkAdminRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Terminal locked due to too many failed attempts. Try again in ${rateCheck.lockedUntilSeconds} seconds.`,
          locked: true,
          lockedUntilSeconds: rateCheck.lockedUntilSeconds,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { adminKey, walletAddress } = body;

    let authenticated = false;
    let method: 'KEY' | 'WALLET' = 'KEY';
    let identifier = 'master_key_operator';

    // Verify Admin Key
    if (adminKey && typeof adminKey === 'string') {
      if (verifyAdminKey(adminKey)) {
        authenticated = true;
        method = 'KEY';
        identifier = 'master_operator';
      }
    }

    // Or Verify Authorized Operator Wallet
    if (!authenticated && walletAddress && typeof walletAddress === 'string') {
      if (isAuthorizedAdminWallet(walletAddress)) {
        authenticated = true;
        method = 'WALLET';
        identifier = walletAddress.toLowerCase();
      }
    }

    if (!authenticated) {
      const failState = recordFailedAdminAttempt(ip);
      return NextResponse.json(
        {
          error: failState.locked
            ? `Terminal locked for 1 hour. Too many failed attempts.`
            : `Invalid admin credentials. ${failState.remainingAttempts} attempt(s) remaining.`,
          remainingAttempts: failState.remainingAttempts,
          locked: failState.locked,
        },
        { status: 401 }
      );
    }

    // Clear failed attempts on success
    clearAdminRateLimit(ip);

    // Generate Admin Session Token
    const sessionToken = signAdminSession({ method, operatorIdentifier: identifier });

    const response = NextResponse.json({
      success: true,
      role: 'CYPHER_OPERATOR',
      method,
      message: 'Operator terminal unlocked successfully',
    });

    // Set secure HttpOnly cookie (24 hours)
    response.cookies.set({
      name: 'cypher_admin_session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Authentication error' }, { status: 500 });
  }
}

/**
 * DELETE: Admin Logout / Lock Terminal
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Terminal locked' });
  response.cookies.set({
    name: 'cypher_admin_session',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
