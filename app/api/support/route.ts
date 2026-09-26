import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

const globalStore = global as any;
if (!globalStore.supportTickets) {
  globalStore.supportTickets = [];
}
if (globalStore.discordWebhookUrl === undefined) {
  globalStore.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL || '';
}

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const sessionMatch = cookieHeader.match(/cypher_session=([^;]+)/) || cookieHeader.match(/cr_session=([^;]+)/);
    const session = sessionMatch ? verifySession(sessionMatch[1]) : null;

    const body = await req.json().catch(() => ({}));
    const { issueType, message, walletAddress } = body;

    const wallet = session?.wallet || walletAddress || 'UNAUTHENTICATED_GUEST';

    if (!issueType || !message) {
      return NextResponse.json({ error: 'Missing required issue type or message fields' }, { status: 400 });
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

    const webhookUrl = globalStore.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL;
    let discordDelivery = 'NOT_CONFIGURED';
    let discordDetail = '';

    if (webhookUrl && webhookUrl.trim().startsWith('http')) {
      let color = 3447003; // Blue
      if (issueType === 'Deposit / Cashier') color = 5763719; // Green
      if (issueType === 'Game Engine Bug') color = 15548997; // Red
      if (issueType === 'Account / Security') color = 15105570; // Gold

      const discordPayload = {
        content: `🚨 **[CypherRoll Support] New Ticket Submitted** • \`${ticket.id}\``,
        embeds: [
          {
            title: `Support Ticket: ${ticket.id}`,
            color,
            fields: [
              { name: 'Issue Category', value: issueType, inline: true },
              { name: 'Player Wallet', value: `\`${wallet}\``, inline: true },
              { name: 'Status', value: '🟢 OPEN', inline: true },
              { name: 'Ticket Message', value: message }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'CypherRoll Internal Support System' }
          }
        ]
      };

      try {
        const discordRes = await fetch(webhookUrl.trim(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'CypherRoll-SupportBot/1.0',
          },
          body: JSON.stringify(discordPayload)
        });

        if (discordRes.ok) {
          discordDelivery = 'DELIVERED';
        } else {
          const errText = await discordRes.text();
          discordDelivery = `FAILED_HTTP_${discordRes.status}`;
          discordDetail = errText;
          console.error(`[DISCORD WEBHOOK FAILED] Status: ${discordRes.status}, Error:`, errText);
        }
      } catch (err: any) {
        discordDelivery = 'NETWORK_ERROR';
        discordDetail = err.message;
        console.error('[DISCORD WEBHOOK ERROR]', err);
      }
    } else {
      console.warn('[DISCORD WEBHOOK] No webhook URL configured in DISCORD_WEBHOOK_URL or Admin Settings.');
    }

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      discordDelivery,
      discordDetail: discordDetail || undefined
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function isValidDiscordWebhook(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('https://discord.com/api/webhooks/') ||
    trimmed.startsWith('https://discordapp.com/api/webhooks/')
  );
}

export async function GET(req: NextRequest) {
  const adminGuard = req.headers.get('x-admin-guard');
  if (adminGuard !== 'cypher-authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tickets = [...globalStore.supportTickets].reverse();
  const currentWebhook = (globalStore.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL || '').trim();
  const isChannelUrl = currentWebhook.includes('discord.com/channels/');
  const isValidWebhook = isValidDiscordWebhook(currentWebhook);

  let webhookStatus = 'Not Configured';
  if (isValidWebhook) {
    webhookStatus = 'Connected';
  } else if (isChannelUrl) {
    webhookStatus = 'Channel Link (Need Webhook URL)';
  } else if (currentWebhook) {
    webhookStatus = 'Invalid Webhook URL';
  }

  const maskedWebhook = isValidWebhook
    ? currentWebhook.replace(/(webhooks\/\d+\/)(.+)/, '$1************')
    : (isChannelUrl ? currentWebhook : '');

  return NextResponse.json({
    tickets,
    webhookConfigured: isValidWebhook,
    webhookStatus,
    isChannelUrl,
    maskedWebhook,
  });
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

/**
 * PUT: Configure or Test Discord Webhook from Admin Dashboard
 */
export async function PUT(req: NextRequest) {
  try {
    const adminGuard = req.headers.get('x-admin-guard');
    if (adminGuard !== 'cypher-authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, webhookUrl } = body;

    if (action === 'SET_WEBHOOK') {
      if (!webhookUrl || typeof webhookUrl !== 'string') {
        return NextResponse.json({ error: 'Invalid webhook URL provided' }, { status: 400 });
      }

      const trimmed = webhookUrl.trim();
      if (!isValidDiscordWebhook(trimmed)) {
        if (trimmed.includes('discord.com/channels/')) {
          return NextResponse.json({
            error: 'You entered a Discord Channel browser link (discord.com/channels/...). You need a Webhook URL (starts with https://discord.com/api/webhooks/...). To create one: In Discord, go to Channel Settings ➔ Integrations ➔ Webhooks ➔ New Webhook ➔ Copy Webhook URL.'
          }, { status: 400 });
        }
        return NextResponse.json({
          error: 'Invalid URL. Discord Webhook URLs must start with https://discord.com/api/webhooks/...'
        }, { status: 400 });
      }

      globalStore.discordWebhookUrl = trimmed;
      return NextResponse.json({
        success: true,
        message: 'Discord Webhook URL updated successfully in server memory'
      });
    }

    if (action === 'TEST_WEBHOOK') {
      const targetUrl = (webhookUrl || globalStore.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL || '').trim();
      if (!targetUrl) {
        return NextResponse.json({ error: 'No Discord Webhook URL has been configured yet' }, { status: 400 });
      }

      if (!isValidDiscordWebhook(targetUrl)) {
        if (targetUrl.includes('discord.com/channels/')) {
          return NextResponse.json({
            success: false,
            error: 'Discord Delivery Blocked: The configured URL is a Discord Channel link (discord.com/channels/...), not an API Webhook URL. Please generate a Webhook URL in Discord (Channel Settings ➔ Integrations ➔ Webhooks ➔ Copy Webhook URL).'
          }, { status: 400 });
        }
        return NextResponse.json({
          success: false,
          error: 'The configured URL is not a valid Discord Webhook URL (must start with https://discord.com/api/webhooks/...)'
        }, { status: 400 });
      }

      const testPayload = {
        content: '✅ **[CypherRoll Admin]** Discord Webhook connection verified successfully!',
        embeds: [
          {
            title: '⚡ CypherRoll Operational Test Embed',
            description: 'This is a test notification confirming that the CypherRoll Support Desk is connected to this Discord channel.',
            color: 65280, // Green
            fields: [
              { name: 'Status', value: '🟢 ACTIVE & VERIFIED', inline: true },
              { name: 'Environment', value: 'Production / Vercel', inline: true },
              { name: 'Operator', value: 'Master Administrator', inline: true }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'CypherRoll Autonomous Casino System' }
          }
        ]
      };

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CypherRoll-SupportBot/1.0',
        },
        body: JSON.stringify(testPayload)
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({
          success: false,
          error: `Discord rejected the request with HTTP ${res.status}: ${errText}`
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Test message delivered to Discord successfully! Check your Discord channel.'
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
