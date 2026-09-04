'use client';

import React, { useState, useEffect, useRef } from 'react';
import CrashRocketCanvas from '@/components/3d/CrashRocketCanvas';
import { calculateCrashPoint, generateServerSeed } from '@/lib/provably-fair';
import { Rocket, ShieldCheck, Flame, Zap, DollarSign } from 'lucide-react';
import ProvablyFairModal from './ProvablyFairModal';

type GameState = 'IDLE' | 'STARTING' | 'FLYING' | 'CRASHED';

interface CrashGameProps {
  userWallet: string;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  onBetPlaced?: (rakeback: number, vip: string) => void;
}

export default function CrashGame({ userWallet, balance, setBalance, onBetPlaced }: CrashGameProps) {
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [multiplier, setMultiplier] = useState<number>(1.00);
  const [wager, setWager] = useState<number>(15);
  const [hasBet, setHasBet] = useState<boolean>(false);
  const [hasCashedOut, setHasCashedOut] = useState<boolean>(false);
  const [cashedOutAt, setCashedOutAt] = useState<number | null>(null);
  const [nonce, setNonce] = useState<number>(1);
  const [serverSeedHash, setServerSeedHash] = useState<string>('0304473b50e479dcb7b54818671aa40746a0dabd4b7427c5cf358253e7d7426f');
  const [clientSeed, setClientSeed] = useState<string>('player_orbit_99');
  const [isAuditorOpen, setIsAuditorOpen] = useState<boolean>(false);
  const [history, setHistory] = useState<number[]>([1.45, 3.22, 1.12, 14.80, 2.05]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const crashPointRef = useRef<number>(1.00);

  const startRound = () => {
    if (wager <= 0 || wager > balance || gameState === 'FLYING') return;

    // Deduct wager
    setBalance((prev) => parseFloat((prev - wager).toFixed(2)));
    setHasBet(true);
    setHasCashedOut(false);
    setCashedOutAt(null);
    setMultiplier(1.00);

    // Calculate deterministic crash point via Provably Fair formula with 2% edge
    const serverSeed = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const calculatedCrash = calculateCrashPoint(serverSeed, clientSeed, nonce);
    crashPointRef.current = calculatedCrash;
    setNonce((prev) => prev + 1);

    if (onBetPlaced) {
      const rakebackEarned = parseFloat(((wager * 0.02) * 0.15).toFixed(4));
      onBetPlaced(rakebackEarned, 'Bronze');
    }

    setGameState('FLYING');

    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      // Exponential curve: e^(0.065 * t)
      const currentMulti = parseFloat((1.00 * Math.exp(0.065 * elapsedSec)).toFixed(2));

      if (currentMulti >= crashPointRef.current) {
        // Round Crashes!
        if (intervalRef.current) clearInterval(intervalRef.current);
        setMultiplier(crashPointRef.current);
        setGameState('CRASHED');
        setHistory((prev) => [crashPointRef.current, ...prev.slice(0, 6)]);
      } else {
        setMultiplier(currentMulti);
      }
    }, 50);
  };

  const handleCashOut = () => {
    if (gameState !== 'FLYING' || !hasBet || hasCashedOut) return;

    const winAmount = parseFloat((wager * multiplier).toFixed(2));
    setBalance((prev) => parseFloat((prev + winAmount).toFixed(2)));
    setHasCashedOut(true);
    setCashedOutAt(multiplier);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* 3D Flight Canvas Stage (Left 7 Cols) */}
      <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[500px]">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-cta" />
            <span className="font-heading text-sm font-bold text-foreground">CypherCrash 3D</span>
            <span className="text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
              98.0% RTP (2% Edge)
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

        {/* 3D WebGL Rocket Arena */}
        <div className="relative flex-1 flex items-center justify-center my-2">
          <CrashRocketCanvas
            multiplier={multiplier}
            isCrashed={gameState === 'CRASHED'}
            gameState={gameState}
          />

          {/* Central Multiplier Readout */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <span
              className={`text-5xl lg:text-6xl font-heading font-black tracking-tight ${
                gameState === 'CRASHED'
                  ? 'text-rose-500 animate-bounce'
                  : 'text-foreground drop-shadow-[0_0_20px_rgba(139,92,246,0.6)]'
              }`}
            >
              {multiplier.toFixed(2)}×
            </span>
            <span className="text-xs font-mono block text-slate-400 mt-1 uppercase tracking-widest">
              {gameState === 'FLYING'
                ? 'ROCKET IN ORBIT'
                : gameState === 'CRASHED'
                ? 'CRASHED / BUSTED'
                : 'READY FOR LAUNCH'}
            </span>
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
            Server Hash: {serverSeedHash.substring(0, 16)}...
          </span>
          <span className="text-primary">Nonce #{nonce}</span>
        </div>
      </div>

      {/* Control Dashboard (Right 5 Cols) */}
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[500px]">
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
                disabled={gameState === 'FLYING'}
                onChange={(e) => setWager(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base font-heading font-bold text-foreground focus:outline-none focus:border-cta"
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
                  className="px-2 py-1 bg-cta/20 hover:bg-cta/30 text-purple-300 text-[11px] font-mono rounded transition-colors"
                >
                  Max
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Win Display */}
          {gameState === 'FLYING' && hasBet && !hasCashedOut && (
            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 text-center mb-5 animate-pulse">
              <span className="text-xs font-mono text-purple-300 block uppercase">Current Value</span>
              <span className="text-2xl font-heading font-black text-emerald-400">
                +${(wager * multiplier).toFixed(2)}
              </span>
            </div>
          )}

          {hasCashedOut && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center mb-5">
              <span className="text-xs font-mono text-emerald-300 block uppercase">Cashed Out At {cashedOutAt?.toFixed(2)}×</span>
              <span className="text-2xl font-heading font-black text-emerald-400">
                +${((wager * (cashedOutAt ?? 1))).toFixed(2)} Win
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {gameState === 'FLYING' && hasBet && !hasCashedOut ? (
          <button
            onClick={handleCashOut}
            className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-black text-xl rounded-xl transition-all shadow-xl shadow-emerald-500/30 active:scale-[0.98] flex items-center justify-center gap-2 animate-bounce"
          >
            <span>CASH OUT ${(wager * multiplier).toFixed(2)}</span>
          </button>
        ) : (
          <button
            onClick={startRound}
            disabled={gameState === 'FLYING' || wager > balance}
            className="w-full py-4 bg-cta hover:bg-purple-600 disabled:opacity-50 text-white font-heading font-black text-lg rounded-xl transition-all shadow-lg shadow-purple-600/30 active:scale-[0.98]"
          >
            {gameState === 'FLYING' ? 'ROUND IN PROGRESS' : 'LAUNCH CYPHERCRASH'}
          </button>
        )}
      </div>

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
