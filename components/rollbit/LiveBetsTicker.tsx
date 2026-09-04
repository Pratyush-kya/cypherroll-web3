'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Lock, TrendingUp, Sparkles } from 'lucide-react';
import { truncateHash } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface LiveBetItem {
  id: string;
  wallet_address: string;
  game_type: string;
  wager: number;
  target_payout: number;
  outcome?: number;
  won: boolean;
  payout: number;
  profit: number;
  created_at: string;
}

export default function LiveBetsTicker() {
  const [bets, setBets] = useState<LiveBetItem[]>([]);
  const [pulseNew, setPulseNew] = useState<boolean>(false);

  // 1. Fetch initial snapshot of recent bets
  useEffect(() => {
    const fetchRecentBets = async () => {
      try {
        const res = await fetch('/api/bets/recent');
        const data = await res.json();
        if (data.bets && Array.isArray(data.bets)) {
          setBets(data.bets);
        }
      } catch (err) {
        console.error('Failed to load recent bets:', err);
      }
    };

    fetchRecentBets();
    const interval = setInterval(fetchRecentBets, 4000);
    return () => clearInterval(interval);
  }, []);

  // 2. Realtime WebSocket subscription for live bets
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    const channel = client.channel('global_activity', {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'new_bet' }, (payload) => {
        if (payload.payload) {
          const newBet: LiveBetItem = payload.payload;
          setBets((prev) => {
            // Avoid duplicate IDs
            if (prev.some((b) => b.id === newBet.id)) return prev;
            return [newBet, ...prev.slice(0, 9)];
          });
          setPulseNew(true);
          setTimeout(() => setPulseNew(false), 800);
        }
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  return (
    <div className="border-t border-slate-900 bg-slate-950/90 py-3 mt-8 backdrop-blur-md sticky bottom-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        {/* Network Status indicator */}
        <div className="flex items-center gap-2 text-slate-400 flex-shrink-0">
          <Activity className={`w-4 h-4 text-emerald-400 ${pulseNew ? 'animate-ping' : 'animate-pulse'}`} />
          <span className="uppercase tracking-wider font-bold text-[11px] text-slate-300">Live Bets:</span>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
            Realtime
          </span>
        </div>

        {/* Realtime Bets Stream */}
        <div className="flex items-center gap-3 overflow-x-auto text-slate-300 flex-1 max-w-4xl scrollbar-none py-0.5">
          {bets.length === 0 ? (
            <span className="text-slate-500 text-[11px]">Connecting to Realtime Ledger...</span>
          ) : (
            bets.map((bet, idx) => (
              <div
                key={bet.id || idx}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-[11px] flex-shrink-0 transition-all duration-300 ${
                  idx === 0 && pulseNew
                    ? 'scale-105 shadow-md shadow-amber-500/20'
                    : ''
                } ${
                  bet.won
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400'
                }`}
              >
                <span className="text-[10px] px-1 py-0.2 rounded font-bold bg-slate-950/80 border border-slate-700/60">
                  {bet.game_type === 'DICE' ? '🎲 DICE' : '🚀 CRASH'}
                </span>
                <span className="font-medium text-slate-200">
                  {truncateHash(bet.wallet_address, 4, 3)}
                </span>
                <span className="font-bold">
                  {bet.won ? (
                    <span className="text-emerald-400 font-black">
                      +${Number(bet.profit || bet.payout).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-rose-400">
                      -${Math.abs(Number(bet.profit || bet.wager)).toFixed(2)}
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-slate-500">
                  ({Number(bet.target_payout || 1).toFixed(2)}×)
                </span>
              </div>
            ))
          )}
        </div>

        {/* Non-Custodial / Tor guarantee */}
        <div className="hidden lg:flex items-center gap-2 text-slate-500 text-[11px] flex-shrink-0">
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span>Zero IP Logging • Non-Custodial</span>
        </div>
      </div>
    </div>
  );
}
