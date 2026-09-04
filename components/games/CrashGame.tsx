'use client';

import React, { useState, useEffect, useRef } from 'react';
import CrashRocketCanvas from '@/components/3d/CrashRocketCanvas';
import { Rocket, ShieldCheck, Flame, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import ProvablyFairModal from './ProvablyFairModal';
import { truncateHash } from '@/lib/utils';

type GameStatus = 'STARTING' | 'FLYING' | 'CRASHED';

interface ActiveBet {
  wallet: string;
  wager: number;
  cashedOut: boolean;
  cashedOutAt?: number;
}

interface CrashGameProps {
  userWallet: string;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  onBetPlaced?: (rakeback: number, vip: string) => void;
}

export default function CrashGame({ userWallet, balance, setBalance, onBetPlaced }: CrashGameProps) {
  const [status, setStatus] = useState<GameStatus>('STARTING');
  const [multiplier, setMultiplier] = useState<number>(1.00);
  const [countdown, setCountdown] = useState<number>(5.0);
  const [crashPoint, setCrashPoint] = useState<number | undefined>(undefined);
  const [serverSeedHash, setServerSeedHash] = useState<string>('');
  const [activeBets, setActiveBets] = useState<ActiveBet[]>([]);
  const [history, setHistory] = useState<number[]>([1.45, 3.22, 1.12, 14.80, 2.05]);

  const [wager, setWager] = useState<number>(15);
  const [hasBetThisRound, setHasBetThisRound] = useState<boolean>(false);
  const [hasCashedOut, setHasCashedOut] = useState<boolean>(false);
  const [cashedOutAt, setCashedOutAt] = useState<number | null>(null);
  const [isAuditorOpen, setIsAuditorOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Connect to Realtime Multiplayer SSE Stream
  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/games/crash/stream');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setStatus(data.status);
          setMultiplier(data.multiplier);
          setCountdown(data.countdown);
          setCrashPoint(data.crashPoint);
          if (data.serverSeedHash) setServerSeedHash(data.serverSeedHash);
          if (data.activeBets) setActiveBets(data.activeBets);
          if (data.history) setHistory(data.history);

          // Reset user bet flags on new round countdown
          if (data.status === 'STARTING') {
            setHasCashedOut(false);
            setCashedOutAt(null);
          }
        } catch {
          // ignore parsing error
        }
      };
    } catch {
      // Fallback to polling if SSE is blocked
      const interval = setInterval(async () => {
        try {
          const res = await fetch('/api/games/crash/state');
          const data = await res.json();
          setStatus(data.status);
          setMultiplier(data.multiplier);
          setCountdown(data.countdown);
          setCrashPoint(data.crashPoint);
          if (data.serverSeedHash) setServerSeedHash(data.serverSeedHash);
          if (data.activeBets) setActiveBets(data.activeBets);
          if (data.history) setHistory(data.history);
        } catch {}
      }, 200);
      return () => clearInterval(interval);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  // Check if current user is in activeBets
  useEffect(() => {
    if (!userWallet) return;
    const myBet = activeBets.find((b) => b.wallet === userWallet);
    if (myBet) {
      setHasBetThisRound(true);
      if (myBet.cashedOut && myBet.cashedOutAt) {
        setHasCashedOut(true);
        setCashedOutAt(myBet.cashedOutAt);
      }
    } else if (status === 'STARTING') {
      setHasBetThisRound(false);
    }
  }, [activeBets, userWallet, status]);

  const handlePlaceBet = async () => {
    if (wager <= 0 || wager > balance || status !== 'STARTING' || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/games/crash/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: userWallet || 'Anon_Player',
          wager,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place bet');

      setBalance(data.newBalance);
      setHasBetThisRound(true);
    } catch (err: any) {
      alert(err.message || 'Error placing bet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCashOut = async () => {
    if (status !== 'FLYING' || !hasBetThisRound || hasCashedOut || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/games/crash/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: userWallet || 'Anon_Player',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cashout failed');

      setBalance(data.newBalance);
      setHasCashedOut(true);
      setCashedOutAt(data.multiplier);

      if (onBetPlaced) {
        onBetPlaced(data.rakeback, data.vipTier);
      }
    } catch (err: any) {
      alert(err.message || 'Error cashing out');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* 3D Global Rocket Arena (Left 7 Cols) */}
      <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[500px]">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-cta" />
            <span className="font-heading text-sm font-bold text-foreground">Global Multiplayer Crash</span>
            <span className="text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Live Synced
            </span>
          </div>

          <button
            onClick={() => setIsAuditorOpen(true)}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-primary transition-colors bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Audit</span>
          </button>
        </div>

        {/* 3D WebGL Arena */}
        <div className="relative flex-1 flex items-center justify-center my-2">
          <CrashRocketCanvas
            multiplier={multiplier}
            isCrashed={status === 'CRASHED'}
            gameState={status}
          />

          {/* Center Display */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            {status === 'STARTING' ? (
              <div>
                <span className="text-4xl lg:text-5xl font-heading font-black tracking-tight text-primary">
                  {countdown.toFixed(1)}s
                </span>
                <span className="text-xs font-mono block text-slate-400 mt-1 uppercase tracking-widest">
                  Starting Next Round
                </span>
              </div>
            ) : (
              <div>
                <span
                  className={`text-5xl lg:text-6xl font-heading font-black tracking-tight ${
                    status === 'CRASHED'
                      ? 'text-rose-500 animate-bounce'
                      : 'text-foreground drop-shadow-[0_0_20px_rgba(139,92,246,0.6)]'
                  }`}
                >
                  {multiplier.toFixed(2)}×
                </span>
                <span className="text-xs font-mono block text-slate-400 mt-1 uppercase tracking-widest">
                  {status === 'FLYING' ? 'ROCKET IN ORBIT' : 'CRASHED / BUSTED'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Crashes Multipliers */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 border-t border-slate-800 pt-3">
          <span className="text-[10px] font-mono text-slate-500 uppercase flex-shrink-0">Past Crashes:</span>
          {history.map((h, i) => (
            <span
              key={i}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold flex-shrink-0 border ${
                h >= 2.0
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              {h.toFixed(2)}×
            </span>
          ))}
        </div>

        {/* Seed Info */}
        <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-500 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/80">
          <span className="truncate max-w-[280px]">
            Server Hash: {serverSeedHash ? serverSeedHash.substring(0, 16) : 'e3b0c442...'}...
          </span>
          <span className="text-primary flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>{activeBets.length} Players</span>
          </span>
        </div>
      </div>

      {/* Control Dashboard & Live Players List (Right 5 Cols) */}
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[500px]">
        <div>
          {/* Balance Widget */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">Player Bankroll</span>
            <div className="text-right">
              <span className="text-xl font-heading font-black text-primary">
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] block font-mono text-emerald-400">Multiplayer Sync</span>
            </div>
          </div>

          {/* Wager Input */}
          <div className="mb-4">
            <label className="block text-xs font-mono text-slate-400 mb-1.5">Wager Amount ($)</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max={balance}
                value={wager}
                disabled={status === 'FLYING' || hasBetThisRound}
                onChange={(e) => setWager(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base font-heading font-bold text-foreground focus:outline-none focus:border-cta"
              />
              <div className="absolute right-2 top-2 flex gap-1">
                <button
                  type="button"
                  disabled={hasBetThisRound}
                  onClick={() => setWager((prev) => Math.max(1, parseFloat((prev / 2).toFixed(2))))}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-mono rounded text-slate-300 transition-colors"
                >
                  ½
                </button>
                <button
                  type="button"
                  disabled={hasBetThisRound}
                  onClick={() => setWager((prev) => Math.min(balance, parseFloat((prev * 2).toFixed(2))))}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-mono rounded text-slate-300 transition-colors"
                >
                  2×
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Win Display */}
          {status === 'FLYING' && hasBetThisRound && !hasCashedOut && (
            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-center mb-4 animate-pulse">
              <span className="text-xs font-mono text-purple-300 block uppercase">Current Value</span>
              <span className="text-2xl font-heading font-black text-emerald-400">
                +${(wager * multiplier).toFixed(2)}
              </span>
            </div>
          )}

          {hasCashedOut && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center mb-4">
              <span className="text-xs font-mono text-emerald-300 block uppercase">Cashed Out At {cashedOutAt?.toFixed(2)}×</span>
              <span className="text-2xl font-heading font-black text-emerald-400">
                +${(wager * (cashedOutAt ?? 1)).toFixed(2)} Win
              </span>
            </div>
          )}

          {/* Active Round Players List */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4 max-h-36 overflow-y-auto">
            <div className="flex justify-between text-[10px] font-mono text-slate-400 border-b border-slate-800 pb-1 mb-2 uppercase">
              <span>Player</span>
              <span>Bet</span>
              <span>Status</span>
            </div>
            {activeBets.length === 0 ? (
              <span className="text-[11px] font-mono text-slate-500 block text-center py-2">
                No bets placed yet for this round
              </span>
            ) : (
              <div className="space-y-1.5 font-mono text-xs">
                {activeBets.map((b, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-300 truncate max-w-[100px]">
                      {truncateHash(b.wallet, 4, 3)}
                    </span>
                    <span className="text-foreground">${b.wager.toFixed(2)}</span>
                    <span>
                      {b.cashedOut ? (
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          {b.cashedOutAt?.toFixed(2)}×
                        </span>
                      ) : status === 'CRASHED' ? (
                        <span className="text-rose-400 font-bold">Bust</span>
                      ) : (
                        <span className="text-purple-400">In Orbit</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {status === 'FLYING' && hasBetThisRound && !hasCashedOut ? (
          <button
            onClick={handleCashOut}
            disabled={isSubmitting}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-black text-xl rounded-xl transition-all shadow-xl shadow-emerald-500/30 active:scale-[0.98] flex items-center justify-center gap-2 animate-bounce"
          >
            <span>CASH OUT ${(wager * multiplier).toFixed(2)}</span>
          </button>
        ) : status === 'STARTING' ? (
          <button
            onClick={handlePlaceBet}
            disabled={hasBetThisRound || wager > balance || isSubmitting}
            className={`w-full py-4 font-heading font-black text-base rounded-xl transition-all shadow-lg active:scale-[0.98] ${
              hasBetThisRound
                ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400'
                : 'bg-cta hover:bg-purple-600 text-white shadow-purple-600/30'
            }`}
          >
            {hasBetThisRound ? 'BET PLACED (WAITING FOR LAUNCH)' : `BET FOR NEXT ROUND ($${wager})`}
          </button>
        ) : (
          <button
            disabled
            className="w-full py-4 bg-slate-800 text-slate-400 font-heading font-black text-base rounded-xl opacity-60 cursor-not-allowed"
          >
            {status === 'FLYING' ? 'ROUND IN PROGRESS' : 'ROUND CRASHED'}
          </button>
        )}
      </div>

      <ProvablyFairModal
        isOpen={isAuditorOpen}
        onClose={() => setIsAuditorOpen(false)}
        initialServerSeed=""
        initialClientSeed="global_crash_seed_1"
        initialNonce={1}
      />
    </div>
  );
}
