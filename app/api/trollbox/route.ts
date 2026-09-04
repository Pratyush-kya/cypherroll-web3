import { NextResponse } from 'next/server';
import { supabase, getMockTrollbox, addMockTrollboxMessage, broadcastTrollboxMessage } from '@/lib/supabase';

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
    const { sender, vip, message } = await req.json();
    if (!sender || !message || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('trollbox_messages')
        .insert({
          sender_address: sender,
          sender_vip: vip || 'Bronze',
          message: message.trim().substring(0, 200),
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);

      // Broadcast over Supabase Realtime WebSocket channel
      broadcastTrollboxMessage(data);

      return NextResponse.json({ message: data });
    }

    const newMsg = addMockTrollboxMessage(sender, vip || 'Bronze', message.trim().substring(0, 200));
    broadcastTrollboxMessage(newMsg);
    return NextResponse.json({ message: newMsg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
