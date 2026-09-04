import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = new Date().toISOString();
  const challenge = `Welcome to CypherRoll Casino!\n\nPlease sign this message to verify your wallet ownership and authenticate your secure session.\n\nNonce: ${nonce}\nIssued At: ${timestamp}`;

  const res = NextResponse.json({
    nonce,
    message: challenge,
    timestamp,
  });

  // Store expected nonce in HTTP-only cookie
  res.cookies.set('cypher_auth_nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300, // 5 minutes validity
    path: '/',
  });

  return res;
}
