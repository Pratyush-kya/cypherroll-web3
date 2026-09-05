import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

const globalStore = global as any;
if (!globalStore.supportTickets) {
  globalStore.supportTickets = [];
}

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('cr_session')?.value;
    const session = sessionCookie ? await verifySession(sessionCookie) : null;
    
    const wallet = session?.wallet || 'UNAUTHENTICATED_GUEST';
    const { issueType, message } = await req.json();

    if (!issueType || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const ticket = {
      id: `TKT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      wallet,
      issueType,
      message,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };
    
    globalStore.supportTickets.push(ticket);

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      let color = 3447003; 
      if (issueType === 'Deposit / Cashier') color = 5763719; 
      if (issueType === 'Game Engine Bug') color = 15548997; 
      if (issueType === 'Account / Security') color = 15105570; 

      const embed = {
        title: `🚨 New Support Ticket: ${ticket.id}`,
        color,
        fields: [
          { name: 'Issue Type', value: issueType, inline: true },
          { name: 'Wallet Address', value: `\`${wallet}\``, inline: true },
          { name: 'Message', value: message }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'CypherRoll Internal Support System' }
      };

      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ embeds: [embed] })
        });
      } catch (err) {
        console.error('Failed to send Discord webhook:', err);
      }
    }

    return NextResponse.json({ success: true, ticketId: ticket.id });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const adminGuard = req.headers.get('x-admin-guard');
  if (adminGuard !== 'cypher-authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tickets = [...globalStore.supportTickets].reverse();
  return NextResponse.json({ tickets });
}

export async function PATCH(req: NextRequest) {
  try {
    const adminGuard = req.headers.get('x-admin-guard');
    if (adminGuard !== 'cypher-authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketId, status } = await req.json();
    const ticket = globalStore.supportTickets.find((t: any) => t.id === ticketId);
    
    if (ticket) {
      ticket.status = status;
      return NextResponse.json({ success: true, ticket });
    } else {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
