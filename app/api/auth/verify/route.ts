import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyMessage } from 'viem';
import bs58Import from 'bs58';
import { getOrCreatePlayer } from '@/lib/supabase';
import { signSession, SESSION_MAX_AGE_SECONDS } from '@/lib/auth';

const bs58 = (bs58Import as any).default || bs58Import;

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { walletAddress, chainType, message, signature } = body;

    if (!walletAddress || !chainType || !message || !signature) {
      return NextResponse.json({ error: 'Missing authentication parameters' }, { status: 400 });
    }

    // Verify Anti-Replay Nonce
    const cookieHeader = req.headers.get('cookie') || '';
    const nonceMatch = cookieHeader.match(/cypher_auth_nonce=([^;]+)/);
    const storedNonce = nonceMatch ? nonceMatch[1] : null;

    if (!storedNonce || !message.includes(storedNonce)) {
      return NextResponse.json({ error: 'Invalid or expired authentication nonce. Please retry.' }, { status: 401 });
    }

    let isValid = false;

    if (chainType === 'EVM') {
      isValid = await verifyMessage({
        address: walletAddress as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
    } else if (chainType === 'SOL') {
      try {
        const decodedPub = bs58.decode(walletAddress);
        const reconstructedKey = crypto.createPublicKey({
          key: Buffer.concat([
            Buffer.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00]),
            Buffer.from(decodedPub),
          ]),
          format: 'der',
          type: 'spki',
        });

        const msgBuffer = Buffer.from(message);
        let sigBuffer: Buffer;
        if (typeof signature === 'string') {
          sigBuffer = signature.startsWith('0x')
            ? Buffer.from(signature.slice(2), 'hex')
            : Buffer.from(bs58.decode(signature));
        } else if (Array.isArray(signature)) {
          sigBuffer = Buffer.from(signature);
        } else {
          sigBuffer = Buffer.from(signature);
        }

        isValid = crypto.verify(null, msgBuffer, reconstructedKey, sigBuffer);
      } catch (err: any) {
        console.error("Solana signature verification error:", err);
        isValid = false;
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Cryptographic signature verification failed' }, { status: 401 });
    }

    // Provision or fetch user account in Supabase
    const profile = await getOrCreatePlayer(walletAddress, chainType);

    // Issue signed permanent session token (365 days validity)
    const sessionData = {
      wallet: walletAddress,
      chain: chainType,
      exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    };
    const sessionToken = signSession(sessionData);

    const res = NextResponse.json({
      success: true,
      profile: {
        wallet: profile.wallet_address,
        balance: profile.balance_usdc,
        vipTier: profile.vip_tier,
        accumulatedRakeback: profile.accumulated_rakeback,
        totalWagered: profile.total_wagered,
      },
    });

    // Set secure HTTP-only persistent session cookie (365 days / 1 Year)
    res.cookies.set('cypher_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    });

    // Clear one-time nonce cookie
    res.cookies.delete('cypher_auth_nonce');

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Authentication error' }, { status: 500 });
  }
}
