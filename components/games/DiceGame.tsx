'use client';

import React, { useState, useEffect, useRef } from 'react';
import DiceCanvas from '@/components/3d/DiceCanvas';
import { getDiceMultiplier } from '@/lib/provably-fair';
import { ShieldCheck, Dices, Zap, TrendingUp, TrendingDown, Flame, Trophy, Target, RefreshCw } from 'lucide-react';
import ProvablyFairModal from './ProvablyFairModal';

interface BetHistoryItem {
  id: string;
  roll: number;
  target: number;
  wager: number;
  profit: number;
  won: boolean;
  multiplier: number;
  serverSeed?: string;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
}

interface DiceGameProps {
  userWallet: string;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  onBetPlaced?: (rakeback: number, vip: string) => void;
  isDemoMode?: boolean;
}

// Animated number counter
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 2, className = '' }: { value: number; prefix?: string; suffix?: string; decimals?: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    const start = prev.current;
    const end = value;
    const duration = 400;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setDisplay(parseFloat((start + (end - start) * eased).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(tick);
      else setDisplay(end);
    };
    requestAnimationFrame(tick);
    prev.current = value;
  }, [value, decimals]);

  return <span className={className}>{prefix}{display.toFixed(decimals)}{suffix}</span>;
}

// Rolling number that cycles before landing
function RollingCounter({ value, isRolling }: { value: number | null; isRolling: boolean }) {
  const [display, setDisplay] = useState('--');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRolling) {
      let count = 0;
      intervalRef.current = setInterval(() => {
        setDisplay((Math.random() * 99.99).toFixed(2));
        count++;
      }, 60);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplay(value !== null ? value.toFixed(2) : '--');
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRolling, value]);

  return <span>{display}</span>;
}

export default function DiceGame({ userWallet, balance, setBalance, onBetPlaced, isDemoMode }: DiceGameProps) {
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
  const [modalSeedParams, setModalSeedParams] = useState<{ serverSeed?: string; serverSeedHash?: string; clientSeed?: string; nonce?: number }>({});

  // Auto-bet state
  const [isAutoBet, setIsAutoBet] = useState(false);
  const [autoBetCount, setAutoBetCount] = useState(10);
  const [autoBetLeft, setAutoBetLeft] = useState(0);
  const autoBetRef = useRef(false);
  const autoBetLeftRef = useRef(0);

  // Streak tracker
  const [streak, setStreak] = useState(0); // positive = win streak, negative = loss streak
  const [bestStreak, setBestStreak] = useState(0);
  const [totalWagered, setTotalWagered] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

  // Show result overlay with animation flag
  const [showResult, setShowResult] = useState(false);

  const multiplier = getDiceMultiplier(target);
  const winChance = target;
  const potentialProfit = parseFloat(((wager * multiplier) - wager).toFixed(2));

  // Win stats
  const wins = history.filter(h => h.won).length;
  const losses = history.filter(h => !h.won).length;
  const winRate = history.length > 0 ? ((wins / history.length) * 100).toFixed(1) : '0.0';


  const handleRoll = async () => {
    if (wager <= 0 || wager > balance || isRolling) return;

    setIsRolling(true);
    setShowResult(false);
    setLastRoll(null);
    setLastWon(null);

    try {
      const res = await fetch('/api/games/dice/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: userWallet || (isDemoMode ? 'Demo_Player' : ''),
          target,
          wager,
          clientSeed,
          isDemo: Boolean(isDemoMode),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Roll failed');

      // Show rolling animation for a moment then reveal
      setTimeout(() => {
        setLastRoll(data.roll);
        setLastWon(data.won);
        setShowResult(true);

        if (isDemoMode) {
          setBalance(prev => parseFloat((prev + data.profit).toFixed(2)));
        } else {
          setBalance(data.newBalance);
        }
        if (data.newNonce) setNonce(data.newNonce);
        if (data.serverSeedHash) setServerSeedHash(data.serverSeedHash);
        if (onBetPlaced && !isDemoMode) onBetPlaced(data.rakeback, data.vipTier);

        // Update streaks
        setStreak(prev => {
          const newStreak = data.won ? (prev >= 0 ? prev + 1 : 1) : (prev <= 0 ? prev - 1 : -1);
          setBestStreak(bs => Math.max(bs, Math.abs(newStreak)));
          return newStreak;
        });
        setTotalWagered(prev => parseFloat((prev + wager).toFixed(2)));
        setTotalProfit(prev => parseFloat((prev + data.profit).toFixed(2)));

        setHistory(prev => [{
          id: Math.random().toString(36).substring(7),
          roll: data.roll,
          target,
          wager,
          profit: data.profit,
          multiplier,
          won: data.won,
          serverSeed: data.serverSeed || '',
          serverSeedHash: data.serverSeedHash || serverSeedHash,
          clientSeed,
          nonce,
        }, ...prev.slice(0, 19)]);

        setIsRolling(false);
      }, 700);
    } catch (err: any) {
      alert(err.message || 'Failed to execute roll');
      setIsRolling(false);
    }
  };

  // Auto-bet engine
  const startAutoBet = async () => {
    autoBetRef.current = true;
    autoBetLeftRef.current = autoBetCount;
    setIsAutoBet(true);
    setAutoBetLeft(autoBetCount);

    const runNext = async () => {
      if (!autoBetRef.current || autoBetLeftRef.current <= 0) {
        setIsAutoBet(false);
        autoBetRef.current = false;
        return;
      }
      autoBetLeftRef.current--;
      setAutoBetLeft(autoBetLeftRef.current);
      await handleRoll();
      setTimeout(runNext, 900);
    };
    await runNext();
  };

  const stopAutoBet = () => {
    autoBetRef.current = false;
    setIsAutoBet(false);
    setAutoBetLeft(0);
  };

  const openVerifierForRoll = (item: BetHistoryItem) => {
    setModalSeedParams({ serverSeed: item.serverSeed || '', serverSeedHash: item.serverSeedHash || serverSeedHash, clientSeed: item.clientSeed || clientSeed, nonce: item.nonce || (nonce > 1 ? nonce - 1 : 1) });
    setIsAuditorOpen(true);
  };

  // Streak color helper
  const streakColor = streak > 2 ? 'text-emerald-400' : streak < -2 ? 'text-rose-400' : 'text-slate-400';
  const streakIcon = streak > 0 ? '🔥' : streak < 0 ? '❄️' : '➖';

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-5">

      {/* ── TOP STATS BAR ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Win Rate', value: `${winRate}%`, icon: <Target className="w-4 h-4" />, color: 'text-emerald-400' },
          { label: 'Streak', value: `${streakIcon} ${Math.abs(streak)}`, icon: <Flame className="w-4 h-4" />, color: streakColor },
          { label: 'Total Wagered', value: `$${totalWagered.toFixed(2)}`, icon: <TrendingUp className="w-4 h-4" />, color: 'text-primary' },
          { label: 'Session P&L', value: `${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}`, icon: totalProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />, color: totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
            <span className={`${color} opacity-70`}>{icon}</span>
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">{label}</div>
              <div className={`font-heading font-bold text-sm ${color}`}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN GAME GRID ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* LEFT: 3D Stage */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl relative overflow-hidden flex flex-col min-h-[520px]">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Dices className="w-5 h-5 text-primary" />
              <span className="font-heading text-sm font-bold text-foreground">CypherDice</span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">96% RTP (4% Edge)</span>
            </div>
            <button onClick={() => setIsAuditorOpen(true)} className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-primary transition-colors bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />Audit
            </button>
          </div>

          {/* 3D Canvas */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden" style={{ minHeight: '300px' }}>
            <DiceCanvas isRolling={isRolling} targetRoll={target} lastRoll={lastRoll} lastWon={lastWon} />

            {/* Rolling number display — overlaid on canvas */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`transition-all duration-300 ${showResult || isRolling ? 'opacity-100' : 'opacity-0'}`}>
                <div className={`px-7 py-4 rounded-2xl border backdrop-blur-sm text-center ${
                  isRolling
                    ? 'bg-slate-950/60 border-amber-500/50'
                    : lastWon
                    ? 'bg-emerald-950/80 border-emerald-500 shadow-2xl shadow-emerald-500/30'
                    : 'bg-rose-950/80 border-rose-500 shadow-2xl shadow-rose-500/30'
                }`}>
                  <div className={`text-[11px] font-mono uppercase tracking-[0.2em] mb-1 ${
                    isRolling ? 'text-amber-400 animate-pulse' : lastWon ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {isRolling ? '⚡ RESOLVING...' : lastWon ? '✦ WINNER ✦' : '✕ BUST'}
                  </div>
                  <div className={`text-5xl font-heading font-black tracking-tight ${
                    isRolling ? 'text-amber-300' : lastWon ? 'text-emerald-300' : 'text-rose-300'
                  }`}>
                    <RollingCounter value={lastRoll} isRolling={isRolling} />
                  </div>
                  {!isRolling && lastRoll !== null && (
                    <div className="text-[11px] font-mono text-slate-400 mt-1">
                      Target: under {target.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* WIN AMOUNT POPUP */}
            {showResult && !isRolling && lastWon && (
              <div className="absolute top-4 right-4 animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="bg-emerald-500 text-slate-950 px-3 py-1.5 rounded-xl font-heading font-black text-sm shadow-lg shadow-emerald-500/40">
                  +${((wager * multiplier) - wager).toFixed(2)} 💰
                </div>
              </div>
            )}
          </div>

          {/* Slider Section */}
          <div className="px-5 pb-5">
            {/* Target + Win Chance row */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: 'Roll Under', value: target.toFixed(2), color: 'text-primary' },
                { label: 'Win Chance', value: `${winChance.toFixed(1)}%`, color: 'text-emerald-400' },
                { label: 'Multiplier', value: `${multiplier}×`, color: 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-center">
                  <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{label}</div>
                  <div className={`font-heading font-black text-base ${color}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Slider with colored track */}
            <div className="relative mb-2">
              {/* Color track bar */}
              <div className="w-full h-3 rounded-full overflow-hidden bg-slate-800 relative">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{
                    width: `${((target - 2) / 96) * 100}%`,
                    background: `linear-gradient(to right, #10b981, #ffd700, #ef4444)`,
                  }}
                />
              </div>
              <input
                type="range"
                min="2"
                max="95"
                step="1"
                value={target}
                disabled={isRolling || isAutoBet}
                onChange={e => setTarget(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>2 → High Risk / High Reward</span>
              <span>95 → Safe / Low Reward</span>
            </div>

            {/* Seed hash row */}
            <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-600 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/80">
              <span className="truncate max-w-[220px]">Hash: {serverSeedHash.substring(0, 12)}...</span>
              <span className="text-primary shrink-0">Nonce #{nonce}</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Controls */}
        <div className="lg:col-span-5 flex flex-col gap-4">

          {/* Balance */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">Balance</div>
              <AnimatedNumber value={balance} prefix="$" className="text-2xl font-heading font-black text-primary" />
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Potential Win</div>
              <div className="text-lg font-heading font-bold text-emerald-400">+${potentialProfit.toFixed(2)}</div>
            </div>
          </div>

          {/* Wager Input */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Wager ($1 – $500)</label>
            <div className="relative mb-3">
              <input
                type="number"
                min="1"
                max={Math.min(balance, 500)}
                value={wager}
                disabled={isRolling || isAutoBet}
                onChange={e => setWager(Math.max(1, Math.min(500, parseFloat(e.target.value) || 1)))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xl font-heading font-bold text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[['½', () => setWager(prev => Math.max(1, Math.floor(prev / 2)))], ['2×', () => setWager(prev => Math.min(500, prev * 2))], ['Min', () => setWager(1)], ['Max', () => setWager(Math.min(balance, 500))]].map(([label, fn]) => (
                <button
                  key={label as string}
                  type="button"
                  onClick={fn as () => void}
                  disabled={isRolling || isAutoBet}
                  className="py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[11px] font-mono font-bold rounded-lg text-slate-300 transition-colors"
                >
                  {label as string}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Target Presets */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="text-[10px] font-mono text-slate-500 uppercase mb-2">Quick Targets</div>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { label: '2×', target: 48, pct: '48%' },
                { label: '3×', target: 32, pct: '32%' },
                { label: '5×', target: 19, pct: '19%' },
                { label: '10×', target: 10, pct: '10%' },
                { label: '48×', target: 2, pct: '2%' },
              ].map(({ label, target: t, pct }) => (
                <button
                  key={label}
                  onClick={() => setTarget(t)}
                  disabled={isRolling || isAutoBet}
                  className={`py-2 rounded-lg text-[10px] font-mono font-bold border transition-all disabled:opacity-40 ${
                    target === t
                      ? 'bg-primary text-slate-950 border-primary shadow-md shadow-amber-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  <div>{label}</div>
                  <div className="text-[8px] opacity-70">{pct}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Roll Button */}
          <button
            onClick={handleRoll}
            disabled={isRolling || isAutoBet || wager > balance || wager < 1}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-violet-700 hover:from-purple-500 hover:to-violet-600 disabled:opacity-40 text-white font-heading font-black text-xl rounded-2xl transition-all shadow-xl shadow-purple-700/40 active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {isRolling ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Resolving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                ROLL UNDER {target} — ${wager}
              </span>
            )}
          </button>

          {/* Auto-Bet */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Auto-Bet</span>
              {isAutoBet && (
                <span className="text-[10px] font-mono text-amber-400 animate-pulse">{autoBetLeft} rolls left</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="2"
                max="1000"
                value={autoBetCount}
                disabled={isAutoBet}
                onChange={e => setAutoBetCount(Math.max(2, parseInt(e.target.value) || 2))}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                placeholder="# of bets"
              />
              {isAutoBet ? (
                <button
                  onClick={stopAutoBet}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-heading font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Stop
                </button>
              ) : (
                <button
                  onClick={startAutoBet}
                  disabled={isRolling || wager > balance}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-heading font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Auto
                </button>
              )}
            </div>
          </div>

          {/* Stats: W/L */}
          {history.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Session Stats</span>
                <Trophy className="w-4 h-4 text-primary opacity-60" />
              </div>
              <div className="flex gap-3 text-center">
                <div className="flex-1 bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-2">
                  <div className="text-lg font-heading font-black text-emerald-400">{wins}</div>
                  <div className="text-[9px] font-mono text-emerald-600">WINS</div>
                </div>
                <div className="flex-1 bg-rose-950/30 border border-rose-800/30 rounded-xl p-2">
                  <div className="text-lg font-heading font-black text-rose-400">{losses}</div>
                  <div className="text-[9px] font-mono text-rose-600">LOSSES</div>
                </div>
                <div className="flex-1 bg-slate-950/60 border border-slate-800 rounded-xl p-2">
                  <div className="text-lg font-heading font-black text-amber-400">{bestStreak}</div>
                  <div className="text-[9px] font-mono text-slate-500">BEST STREAK</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BET HISTORY TIMELINE ──────────────────────────── */}
      {history.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Recent Rolls — Click to Verify</span>
            <button
              onClick={() => setIsAuditorOpen(true)}
              className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1 font-bold"
            >
              <ShieldCheck className="w-3 h-3" /> Provably Fair Audit
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => openVerifierForRoll(item)}
                title={`Roll: ${item.roll.toFixed(2)} | Target: ${item.target} | ${item.won ? 'WIN' : 'LOSS'}`}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border text-[11px] font-mono font-bold transition-all hover:scale-105 active:scale-95 ${
                  item.won
                    ? 'bg-emerald-950/50 border-emerald-600/40 text-emerald-400'
                    : 'bg-rose-950/50 border-rose-600/40 text-rose-400'
                }`}
              >
                <span className="text-base font-heading">{item.roll.toFixed(2)}</span>
                <span className="text-[9px] opacity-60">{item.won ? `+$${item.profit.toFixed(2)}` : `-$${item.wager}`}</span>
                <ShieldCheck className="w-2.5 h-2.5 mt-0.5 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Audit Modal */}
      <ProvablyFairModal
        isOpen={isAuditorOpen}
        onClose={() => setIsAuditorOpen(false)}
        initialServerSeed={modalSeedParams.serverSeed || ''}
        initialServerSeedHash={modalSeedParams.serverSeedHash || serverSeedHash}
        initialClientSeed={modalSeedParams.clientSeed || clientSeed}
        initialNonce={modalSeedParams.nonce || (nonce > 1 ? nonce - 1 : 1)}
        initialGameType="DICE"
        isDemoMode={isDemoMode}
        onSeedRotated={(newHash, newClient) => {
          setServerSeedHash(newHash);
          setClientSeed(newClient);
          setNonce(1);
        }}
      />
    </div>
  );
}
