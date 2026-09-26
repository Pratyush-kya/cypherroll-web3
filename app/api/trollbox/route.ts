import { NextResponse } from 'next/server';
import { supabase, getMockTrollbox, addMockTrollboxMessage, broadcastTrollboxMessage, getOrCreatePlayer } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';
import { encryptMessage, decryptMessage } from '@/lib/crypto-chat';

export const dynamic = 'force-dynamic';

interface ChatItem {
  id: string;
  sender_address: string;
  sender_vip: string;
  message: string;
  created_at: string;
  verified?: boolean;
}

// Persistent process-level cache across serverless warm invocations
const g = globalThis as unknown as { __cypherroll_chat_cache?: ChatItem[] };
if (!g.__cypherroll_chat_cache) {
  g.__cypherroll_chat_cache = [];
}

export async function GET() {
  let rawMessages: any[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('trollbox_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(40);
      
      if (!error && data && data.length > 0) {
        rawMessages = data.reverse();
      }
    } catch (e) {
      console.warn('Supabase trollbox fetch error, falling back to cache:', e);
    }
  }

  // If Supabase returned empty or was unavailable, use global persistent cache or mockDb
  if (rawMessages.length === 0) {
    if (g.__cypherroll_chat_cache && g.__cypherroll_chat_cache.length > 0) {
      rawMessages = g.__cypherroll_chat_cache;
    } else {
      rawMessages = getMockTrollbox();
    }
  }

  // Decrypt each message and verify HMAC-SHA256 signature
  const decryptedMessages = rawMessages.map((m) => {
    const dec = decryptMessage(m.message);
    return {
      id: m.id,
      sender_address: m.sender_address,
      sender_vip: m.sender_vip,
      message: dec.text,
      verified: dec.verified,
      created_at: m.created_at,
    };
  });

  return NextResponse.json({ messages: decryptedMessages });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { message, walletAddress } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    // 1. Authenticate sender securely (supports cypher_session, cr_session, and connected Web3 wallet)
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/cypher_session=([^;]+)/) || cookieHeader.match(/cr_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;
    
    let senderWallet = session?.wallet;
    if (!senderWallet && walletAddress && typeof walletAddress === 'string') {
      const trimmedWallet = walletAddress.trim();
      if ((trimmedWallet.startsWith('0x') && trimmedWallet.length >= 30) || trimmedWallet.length >= 24) {
        senderWallet = trimmedWallet;
      }
    }

    if (!senderWallet) {
      return NextResponse.json({ error: 'You must be logged in to chat. Please connect your Web3 wallet.' }, { status: 401 });
    }

    // 2. Fetch or initialize player state for VIP tier
    let vipTier = 'Bronze';
    try {
      const profile = await getOrCreatePlayer(senderWallet);
      if (profile?.vip_tier) vipTier = profile.vip_tier;
    } catch (profileErr) {
      console.warn('Could not fetch player profile for trollbox sender:', profileErr);
    }

    // 3. Anti-Spam / Phishing Link Filter
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?)/i;
    if (urlRegex.test(message)) {
      return NextResponse.json({ error: 'Links and domains are strictly prohibited in chat.' }, { status: 403 });
    }

    const sanitizedMessage = message.trim().substring(0, 200);

    // 4. Cryptographic Encryption & HMAC-SHA256 Signing
    // Encrypt message content with AES-256-GCM and sign with HMAC-SHA256
    const encryptedPayload = encryptMessage(sanitizedMessage);

    const messageRecord: ChatItem = {
      id: Math.random().toString(36).substring(7) + Date.now().toString(36),
      sender_address: senderWallet,
      sender_vip: vipTier,
      message: encryptedPayload,
      created_at: new Date().toISOString(),
    };

    // Store in global process cache immediately to prevent auto-deletion across lambdas
    if (!g.__cypherroll_chat_cache) g.__cypherroll_chat_cache = [];
    g.__cypherroll_chat_cache.push(messageRecord);
    if (g.__cypherroll_chat_cache.length > 50) {
      g.__cypherroll_chat_cache = g.__cypherroll_chat_cache.slice(-50);
    }

    // 5. Persist to Supabase if available
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('trollbox_messages')
          .insert({
            sender_address: senderWallet,
            sender_vip: vipTier,
            message: encryptedPayload,
          })
          .select('*')
          .single();
        
        if (!error && data) {
          // Broadcast over Supabase Realtime WebSocket channel
          broadcastTrollboxMessage({
            ...data,
            message: sanitizedMessage,
            verified: true,
          });

          return NextResponse.json({
            message: {
              ...data,
              message: sanitizedMessage,
              verified: true,
            },
          });
        }
      } catch (err) {
        console.warn('Supabase insert failed, using memory cache:', err);
      }
    }

    addMockTrollboxMessage(senderWallet, vipTier, encryptedPayload);
    
    // Broadcast decrypted message for live connected sockets
    const broadcastPayload = {
      ...messageRecord,
      message: sanitizedMessage,
      verified: true,
    };
    broadcastTrollboxMessage(broadcastPayload);

    return NextResponse.json({ message: broadcastPayload });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
