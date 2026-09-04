'use client';

import React, { useState } from 'react';
import DiceCanvas from '@/components/3d/DiceCanvas';
import { getDiceMultiplier } from '@/lib/provably-fair';
import { ShieldCheck, Dices, Flame, History, Award } from 'lucide-react';
import ProvablyFairModal from './ProvablyFairModal';

interface BetHistoryItem {
  id: string;
  roll: number;
  target: number;
  wager: number;
  profit: number;
  won: boolean;
}

interface DiceGameProps {
  userWallet: string;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  onBetPlaced?: (rakeback: number, vip: string) => void;
}

export default function DiceGame({ userWallet, balance, setBalance, onBetPlaced }: DiceGameProps) {
  const [target, setTarget] = useState<number>(50);
  const [wager, setWager] = useState<number>(10);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [lastWon, setLastWon] = useState<boolean | null>(null);
  const [history, setHistory] = useState<BetHistoryItem[]>([]);
  const [nonce, setNonce] = useState<number>(1);
  const [serverSeedHash, setServerSeedHash] = useState<string>('0304473b50e479dcb7b54818671aa40746a0dabd4b7427c5cf358253e7d7426f');
  const [clientSeed, setClientSeed] = useState<string>('player_lucky_777');
  const [isAuditorOpen, setIsAuditorOpen] = useState<boolean>(false);

  const multiplier = getDiceMultiplier(target);
  const winChance = target;
  const potentialProfit = parseFloat(((wager * multiplier) - wager).toFixed(2));

  const handleRoll = async () => {
    if (wager <= 0 || wager > balance || isRolling) return;

    setIsRolling(true);
    setLastRoll(null);

    try {
      // Dispatches to Server-Authoritative API
      const res = await fetch('/api/games/dice/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: userWallet || 'Anon_Guest',
          target,
          wager,
          clientSeed,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Roll failed');

      setTimeout(() => {
        setLastRoll(data.roll);
        setLastWon(data.won);
        setBalance(data.newBalance);
        setNonce(data.newNonce);
        if (data.serverSeedHash) setServerSeedHash(data.serverSeedHash);

        if (onBetPlaced) {
          onBetPlaced(data.rakeback, data.vipTier);
        }

        setHistory((prev) => [
          {
            id: Math.random().toString(36).substring(7),
            roll: data.roll,
            target,
            wager,
            profit: data.profit,
            won: data.won,
          },
          ...prev.slice(0, 7),
        ]);

        setIsRolling(false);
      }, 500);
    } catch (err: any) {
      alert(err.message || "Failed to execute roll");
      setIsRolling(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* 3D Game Stage (Left 7 Cols) */}
      <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[480px]">
        {/* Top Badges */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
          <div className="flex items-center gap-2">
            <Dices className="w-5 h-5 text-primary" />
            <span className="font-heading text-sm font-bold text-foreground">CypherDice 3D</span>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              99.0% RTP (1% Edge)
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

        {/* 3D WebGL Canvas */}
        <div className="relative flex-1 flex items-center justify-center my-2">
          <DiceCanvas
            isRolling={isRolling}
            targetRoll={target}
            lastRoll={lastRoll}
            lastWon={lastWon}
          />

          {/* Large Roll Result Callout */}
          {lastRoll !== null && (
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-3 rounded-2xl border backdrop-blur-md transition-all animate-in zoom-in-75 duration-200 ${
                lastWon
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-xl shadow-emerald-500/20'
                  : 'bg-rose-950/80 border-rose-500 text-rose-400 shadow-xl shadow-rose-500/20'
              }`}
            >
              <div className="text-[11px] font-mono uppercase text-center tracking-wider">
                {lastWon ? 'WINNER!' : 'BUST'}
              </div>
              <div className="text-4xl font-heading font-black tracking-tight text-center">
                {lastRoll.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Interactive Roll Slider */}
        <div className="mt-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-xs font-mono mb-2">
            <span className="text-slate-400">Roll Under: <strong className="text-primary font-bold">{target.toFixed(2)}</strong></span>
            <span className="text-slate-400">Win Chance: <strong className="text-emerald-400 font-bold">{winChance.toFixed(2)}%</strong></span>
          </div>
          <input
            type="range"
            min="2"
            max="98"
            step="1"
            value={target}
            disabled={isRolling}
            onChange={(e) => setTarget(parseFloat(e.target.value))}
            className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
            <span>2.00 (High Risk)</span>
            <span>50.00 (Even)</span>
            <span>98.00 (Low Risk)</span>
          </div>
        </div>

        {/* Seed Pre-commitment Hash Display */}
        <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-500 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/80">
          <span className="truncate max-w-[280px]">
            Server Hash: {serverSeedHash.substring(0, 16)}...
          </span>
          <span className="text-primary">Nonce #{nonce}</span>
        </div>
      </div>

      {/* Betting Dashboard (Right 5 Cols) */}
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[480px]">
        <div>
          {/* Balance Widget */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-5 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">Player Bankroll</span>
            <div className="text-right">
              <span className="text-xl font-heading font-black text-primary">
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] block font-mono text-emerald-400">Server-Authoritative</span>
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
                disabled={isRolling}
                onChange={(e) => setWager(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base font-heading font-bold text-foreground focus:outline-none focus:border-primary"
              />
              <div className="absolute right-2 top-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => setWager((prev) => Math.max(1, parseFloat((prev / 2).toFixed(2))))}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-mono rounded text-slate-300 transition-colors"
                >
                  ½
                </button>
                <button
                  type="button"
                  onClick={() => setWager((prev) => Math.min(balance, parseFloat((prev * 2).toFixed(2))))}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-mono rounded text-slate-300 transition-colors"
                >
                  2×
                </button>
                <button
                  type="button"
                  onClick={() => setWager(balance)}
                  className="px-2 py-1 bg-primary/20 hover:bg-primary/30 text-primary text-[11px] font-mono rounded transition-colors"
                >
                  Max
                </button>
              </div>
            </div>
          </div>

          {/* Stats Readout */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Multiplier</span>
              <span className="text-lg font-heading font-black text-primary">{multiplier}×</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Profit on Win</span>
              <span className="text-lg font-heading font-black text-emerald-400">+${potentialProfit}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRoll}
          disabled={isRolling || wager > balance}
          className="w-full py-4 bg-cta hover:bg-purple-600 disabled:opacity-50 text-white font-heading font-black text-lg rounded-xl transition-all shadow-lg shadow-purple-600/30 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isRolling ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
              Resolving On Server...
            </span>
          ) : (
            <span>ROLL DICE UNDER {target}</span>
          )}
        </button>

        {/* Recent Bets Mini Ticker */}
        {history.length > 0 && (
          <div className="mt-5 border-t border-slate-800 pt-3">
            <span className="text-[10px] font-mono text-slate-500 block mb-2 uppercase">Recent Rolls</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  className={`px-2 py-1 rounded text-[11px] font-mono font-bold flex-shrink-0 border ${
                    item.won
                      ? 'bg-emerald-950/60 border-emerald-600/40 text-emerald-400'
                      : 'bg-rose-950/60 border-rose-600/40 text-rose-400'
                  }`}
                >
                  {item.roll.toFixed(2)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Auditor Modal */}
      <ProvablyFairModal
        isOpen={isAuditorOpen}
        onClose={() => setIsAuditorOpen(false)}
        initialServerSeed=""
        initialClientSeed={clientSeed}
        initialNonce={nonce > 1 ? nonce - 1 : 1}
      />
    </div>
  );
}
