import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { adminControlsState } from '@/lib/admin-controls-state';
import { supabaseAdmin, supabase, getOrCreatePlayer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // 1. Enforce Admin Session
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized: Operator session required' }, { status: 401 });
  }

  // 2. Anti-CSRF Custom Header Guard
  const csrfGuard = req.headers.get('x-admin-guard');
  if (csrfGuard !== 'cypher-authenticated') {
    return NextResponse.json({ error: 'Forbidden: Missing CSRF security token' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, payload } = body;
    const client = supabaseAdmin || supabase;

    switch (action) {
      // 1. Fetch Players with Search & Pagination
      case 'GET_PLAYERS': {
        const search = (payload?.search || '').trim().toLowerCase();
        if (client) {
          let query = client
            .from('profiles')
            .select('id, wallet_address, chain_type, balance_usdc, total_wagered, total_won, vip_tier, created_at, updated_at')
            .order('total_wagered', { ascending: false })
            .limit(50);

          if (search) {
            query = query.ilike('wallet_address', `%${search}%`);
          }

          const { data, error } = await query;
          if (error) throw new Error(error.message);
          return NextResponse.json({ success: true, players: data || [] });
        }
        return NextResponse.json({ success: true, players: [] });
      }

      // 2. Adjust Player Balance (Audited & Hard-Capped at $500 max per single adjustment)
      case 'ADJUST_BALANCE': {
        const { walletAddress, amount, reason } = payload || {};
        if (!walletAddress || typeof walletAddress !== 'string') {
          return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 });
        }
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount === 0) {
          return NextResponse.json({ error: 'Invalid adjustment amount' }, { status: 400 });
        }

        // Hard Cap Guard: Maximum $500 credit or debit per single operation
        if (Math.abs(numAmount) > 500) {
          return NextResponse.json(
            { error: 'Security Hard-Cap Exceeded: Maximum adjustment is $500 per transaction.' },
            { status: 400 }
          );
        }

        if (!reason || reason.trim().length < 4) {
          return NextResponse.json({ error: 'Mandatory reason required for audit trail' }, { status: 400 });
        }

        const profile = await getOrCreatePlayer(walletAddress);
        const currentBalance = Number(profile.balance_usdc) || 0;
        const newBalance = parseFloat(Math.max(0, currentBalance + numAmount).toFixed(2));

        if (client) {
          await client
            .from('profiles')
            .update({ balance_usdc: newBalance, updated_at: new Date().toISOString() })
            .eq('wallet_address', walletAddress);

          // Log in transactions
          await client.from('transactions').insert({
            player_id: profile.id,
            wallet_address: walletAddress,
            type: numAmount > 0 ? 'BONUS' : 'WITHDRAWAL',
            amount: Math.abs(numAmount),
            currency: 'USDC',
            status: 'CONFIRMED',
            tx_hash: `ADMIN_ADJ_${Date.now()}_${reason.replace(/\s+/g, '_').substring(0, 20)}`,
          });
        } else {
          profile.balance_usdc = newBalance;
        }

        // Record in Admin Audit Log
        adminControlsState.logAction({
          action: 'BALANCE_ADJUSTMENT',
          operator: 'OPERATOR',
          target: walletAddress,
          details: `${numAmount > 0 ? 'Credited' : 'Debited'} $${Math.abs(numAmount).toFixed(2)} (${reason}). New balance: $${newBalance.toFixed(2)}`,
        });

        return NextResponse.json({
          success: true,
          walletAddress,
          previousBalance: currentBalance,
          newBalance,
        });
      }

      // 3. Toggle Global Maintenance Mode
      case 'TOGGLE_MAINTENANCE': {
        const { enabled } = payload || {};
        adminControlsState.setMaintenanceMode(Boolean(enabled), 'OPERATOR');
        return NextResponse.json({
          success: true,
          maintenanceMode: adminControlsState.getMaintenanceMode(),
        });
      }

      // 4. Toggle Game Engine Pause
      case 'TOGGLE_ENGINE': {
        const { game, paused } = payload || {};
        if (game !== 'CRASH' && game !== 'DICE') {
          return NextResponse.json({ error: 'Invalid game identifier' }, { status: 400 });
        }
        adminControlsState.setEnginePaused(game, Boolean(paused), 'OPERATOR');
        return NextResponse.json({
          success: true,
          game,
          paused: adminControlsState.getEnginePaused(game),
        });
      }

      // 5. Resolve Quarantined AML Deposit
      case 'RESOLVE_AML': {
        const { txHash, resolution } = payload || {};
        if (!txHash) return NextResponse.json({ error: 'txHash required' }, { status: 400 });

        if (client) {
          if (resolution === 'RELEASE') {
            // Remove from quarantine
            await client.from('aml_sanctions_quarantine').delete().eq('tx_hash', txHash);
          } else {
            // Confirm block
            await client.from('aml_sanctions_quarantine').update({ reason: 'CONFIRMED_OFAC_SANCTION' }).eq('tx_hash', txHash);
          }
        }

        adminControlsState.logAction({
          action: `AML_${resolution}`,
          operator: 'OPERATOR',
          target: txHash,
          details: `Quarantined transaction ${txHash} was ${resolution === 'RELEASE' ? 'RELEASED & APPROVED' : 'PERMANENTLY CONFISCATED'}`,
        });

        return NextResponse.json({ success: true, txHash, resolution });
      }

      // 6. Fetch Live Audit Logs & Controls Status
      case 'GET_STATUS': {
        return NextResponse.json({
          success: true,
          maintenanceMode: adminControlsState.getMaintenanceMode(),
          crashPaused: adminControlsState.getEnginePaused('CRASH'),
          dicePaused: adminControlsState.getEnginePaused('DICE'),
          auditLogs: adminControlsState.getAuditLogs(),
        });
      }

      default:
        return NextResponse.json({ error: `Unknown control action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Operator control action failed' }, { status: 500 });
  }
}
