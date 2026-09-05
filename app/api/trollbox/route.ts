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
    // 1. Authenticate sender securely (No Spoofing)
    const sessionMatch = req.headers.get('cookie')?.match(/cr_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;
    
    if (!session || !session.wallet) {
      return NextResponse.json({ error: 'You must be logged in to chat.' }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    // 2. Fetch authoritative player state
    const profile = await getOrCreatePlayer(session.wallet);

    // 3. Wager-Gating (Anti-Bot Protection)
    if (profile.total_wagered < 100) {
      return NextResponse.json({ 
        error: `Chat locked. You must wager $100 to unlock chat. (Current: $${profile.total_wagered})` 
      }, { status: 403 });
    }

    // 4. Anti-Spam / Phishing Link Filter
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?)/i;
    if (urlRegex.test(message)) {
      return NextResponse.json({ error: 'Links and domains are strictly prohibited in chat.' }, { status: 403 });
    }

    const sanitizedMessage = message.trim().substring(0, 200);

    // 5. Save securely
    if (supabase) {
      const { data, error } = await supabase
        .from('trollbox_messages')
        .insert({
          sender_address: session.wallet,
          sender_vip: profile.vip_tier,
          message: sanitizedMessage,
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);

      // Broadcast over Supabase Realtime WebSocket channel
      broadcastTrollboxMessage(data);

      return NextResponse.json({ message: data });
    }

    const newMsg = addMockTrollboxMessage(session.wallet, profile.vip_tier, sanitizedMessage);
    broadcastTrollboxMessage(newMsg);
    return NextResponse.json({ message: newMsg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
