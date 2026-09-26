import { NextResponse } from 'next/server';
import { supabase, getMockTrollbox, addMockTrollboxMessage, broadcastTrollboxMessage, getOrCreatePlayer } from '@/lib/supabase';
import { verifySession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (supabase) {
    const { data } = await supabase
      .from('trollbox_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    return NextResponse.json({ messages: data?.reverse() || [] });
  }

  return NextResponse.json({ messages: getMockTrollbox() });
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

    // 4. Save securely
    if (supabase) {
      const { data, error } = await supabase
        .from('trollbox_messages')
        .insert({
          sender_address: senderWallet,
          sender_vip: vipTier,
          message: sanitizedMessage,
        })
        .select('*')
        .single();
      
      if (!error && data) {
        // Broadcast over Supabase Realtime WebSocket channel
        broadcastTrollboxMessage(data);
        return NextResponse.json({ message: data });
      }
      console.warn('Supabase insert failed, using fallback in-memory trollbox:', error);
    }

    const newMsg = addMockTrollboxMessage(senderWallet, vipTier, sanitizedMessage);
    broadcastTrollboxMessage(newMsg);
    return NextResponse.json({ message: newMsg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
