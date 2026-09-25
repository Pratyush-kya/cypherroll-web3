'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import PlinkoCanvas, { PlinkoDropPayload } from '@/components/3d/PlinkoCanvas';
import { getPlinkoMultipliers } from '@/lib/provably-fair';
import {
  ShieldCheck,
  CircleDot,
  Zap,
  Trophy,
  TrendingUp,
  TrendingDown,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  Flame,
} from 'lucide-react';
import ProvablyFairModal from './ProvablyFairModal';
import { sounds } from '@/lib/sound-effects';

interface BetHistoryItem {
  id: string;
  wager: number;
  multiplier: number;
  profit: number;
  won: boolean;
  rows: number;
  risk: string;
  serverSeed?: string;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
}

interface PlinkoGameProps {
  userWallet: string;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  onBetPlaced?: (rakeback: number, vip: string) => void;
  isDemoMode?: boolean;
}

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
type PlayMode = 'MANUAL' | 'AUTO';

export default function PlinkoGame({
  userWallet,
  balance,
  setBalance,
  onBetPlaced,
  isDemoMode,
}: PlinkoGameProps) {
  const [wager, setWager] = useState<number>(10);
  const [rows, setRows] = useState<number>(8);
  const [risk, setRisk] = useState<RiskLevel>('MEDIUM');
  const [playMode, setPlayMode] = useState<PlayMode>('MANUAL');

  // Audio mute state
  const [isMuted, setIsMuted] = useState<boolean>(() => sounds.getMuted());
  const toggleAudio = () => {
    const next = sounds.toggleMute();
    setIsMuted(next);
  };

  // Dropping state & Canvas Bridge
  const [activeDrop, setActiveDrop] = useState<PlinkoDropPayload | null>(null);
  const [isDropping, setIsDropping] = useState<boolean>(false);
  const [inFlightCount, setInFlightCount] = useState<number>(0);
  const [highlightedSlot, setHighlightedSlot] = useState<number | null>(null);

  // Auto drop state
  const [isAutoActive, setIsAutoActive] = useState<boolean>(false);
  const [autoTotal, setAutoTotal] = useState<number>(10);
  const [autoRemaining, setAutoRemaining] = useState<number>(0);
  const autoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Results & Stats
  const [lastMultiplier, setLastMultiplier] = useState<number | null>(null);
  const [lastWon, setLastWon] = useState<boolean | null>(null);
  const [history, setHistory] = useState<BetHistoryItem[]>([]);
  const [nonce, setNonce] = useState<number>(1);
  const [serverSeedHash, setServerSeedHash] = useState<string>(
    '0304473b50e479dcb7b54818671aa40746a0dabd4b7427c5cf358253e7d7426f'
  );
  const [clientSeed, setClientSeed] = useState<string>('player_plinko_seed');

  // Stats
  const [totalDrops, setTotalDrops] = useState<number>(0);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [bestMultiplier, setBestMultiplier] = useState<number>(0);

  // Auditor Modal
  const [isAuditorOpen, setIsAuditorOpen] = useState<boolean>(false);
  const [modalSeedParams, setModalSeedParams] = useState<{
    serverSeed?: string;
    serverSeedHash?: string;
    clientSeed?: string;
    nonce?: number;
  }>({});

  const multipliers = getPlinkoMultipliers(rows, risk);

  // Single Drop Action
  const executeDrop = useCallback(async () => {
    if (wager <= 0 || wager > balance) {
      if (isAutoActive) {
        setIsAutoActive(false);
        if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
      }
      return;
    }

    if (playMode === 'MANUAL' && isDropping) return;
    if (playMode === 'MANUAL') setIsDropping(true);

    sounds.playClick(650);
    setInFlightCount((prev) => prev + 1);

    try {
      const res = await fetch('/api/games/plinko/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: userWallet || (isDemoMode ? 'Demo_Player' : ''),
          wager,
          rows,
          risk,
          clientSeed,
          isDemo: Boolean(isDemoMode),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to drop ball');

      const dropId = `drop_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Pass single drop to 3D canvas
      setActiveDrop({
        id: dropId,
        path: data.path,
        slot: data.slot,
        multiplier: data.multiplier,
      });

      // Update seed information
      if (data.newNonce) setNonce(data.newNonce);
      if (data.serverSeedHash) setServerSeedHash(data.serverSeedHash);

      // Store pending outcome data keyed by dropId for when ball lands
      pendingResultsRef.current.set(dropId, {
        wager,
        multiplier: data.multiplier,
        profit: data.profit,
        won: data.won,
        rows,
        risk,
        serverSeed: data.serverSeed || '',
        serverSeedHash: data.serverSeedHash || serverSeedHash,
        newBalance: data.newBalance,
        rakeback: data.rakeback,
        vipTier: data.vipTier,
      });

      // Release manual drop lock after 500ms debounce
      if (playMode === 'MANUAL') {
        setTimeout(() => setIsDropping(false), 500);
      }
    } catch (err: any) {
      setInFlightCount((prev) => Math.max(0, prev - 1));
      if (playMode === 'MANUAL') setIsDropping(false);
      if (isAutoActive) {
        setIsAutoActive(false);
        if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
      }
    }
  }, [wager, balance, rows, risk, clientSeed, userWallet, isDemoMode, isAutoActive, serverSeedHash, playMode, isDropping]);

  const pendingResultsRef = useRef<Map<string, any>>(new Map());

  // Ball Landed Callback from 3D Canvas
  const handleBallLanded = (landedSlot: number, landedMult: number) => {
    setInFlightCount((prev) => Math.max(0, prev - 1));
    setHighlightedSlot(landedSlot);
    setTimeout(() => setHighlightedSlot(null), 350);

    const won = landedMult >= 1.0;
    setLastMultiplier(landedMult);
    setLastWon(won);

    // Retrieve pending bet info if available
    let latestDropMeta: any = null;
    for (const [key, val] of Array.from(pendingResultsRef.current.entries())) {
      if (val.multiplier === landedMult) {
        latestDropMeta = val;
        pendingResultsRef.current.delete(key);
        break;
      }
    }

    const currentWager = latestDropMeta?.wager ?? wager;
    const profit = latestDropMeta ? latestDropMeta.profit : parseFloat((currentWager * landedMult - currentWager).toFixed(2));

    if (isDemoMode) {
      setBalance((prev) => parseFloat((prev + profit).toFixed(2)));
    } else if (latestDropMeta?.newBalance !== undefined) {
      setBalance(latestDropMeta.newBalance);
    }

    if (latestDropMeta && onBetPlaced && !isDemoMode) {
      onBetPlaced(latestDropMeta.rakeback, latestDropMeta.vipTier);
    }

    setTotalDrops((td) => td + 1);
    setTotalProfit((tp) => parseFloat((tp + profit).toFixed(2)));
    setBestMultiplier((bm) => Math.max(bm, landedMult));

    setHistory((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        wager: currentWager,
        multiplier: landedMult,
        profit,
        won,
        rows,
        risk,
        serverSeed: latestDropMeta?.serverSeed || '',
        serverSeedHash: latestDropMeta?.serverSeedHash || serverSeedHash,
        clientSeed,
        nonce,
      },
      ...prev.slice(0, 7),
    ]);
  };

  // Keep a stable ref to executeDrop so auto-interval never re-triggers unexpectedly
  const executeDropRef = useRef(executeDrop);
  useEffect(() => {
    executeDropRef.current = executeDrop;
  });

  const stopAutoDrop = useCallback(() => {
    setIsAutoActive(false);
    setAutoRemaining(0);
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
  }, []);

  const startAutoDrop = () => {
    if (wager <= 0 || wager > balance) return;
    setIsAutoActive(true);
    setAutoRemaining(autoTotal);
  };

  // Controlled, single-cadence auto-drop loop (no cascading re-renders)
  useEffect(() => {
    if (isAutoActive) {
      // Fire single initial drop
      executeDropRef.current();

      // Paced cadence (650ms) - drops exactly 1 ball per beat
      autoIntervalRef.current = setInterval(() => {
        setAutoRemaining((prev) => {
          if (prev <= 1 && prev !== -1) {
            stopAutoDrop();
            return 0;
          }
          executeDropRef.current();
          return prev === -1 ? -1 : prev - 1;
        });
      }, 650);
    } else {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
        autoIntervalRef.current = null;
      }
    }

    return () => {
      if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    };
  }, [isAutoActive, stopAutoDrop]);

  const openVerifierForDrop = (item: BetHistoryItem) => {
    setModalSeedParams({
      serverSeed: item.serverSeed || '',
      serverSeedHash: item.serverSeedHash || serverSeedHash,
      clientSeed: item.clientSeed || clientSeed,
      nonce: item.nonce || (nonce > 1 ? nonce - 1 : 1),
    });
    setIsAuditorOpen(true);
  };

  // Helper for slot styling based on multiplier magnitude
  const getSlotStyle = (mult: number, idx: number) => {
    const isLandedHighlight = highlightedSlot === idx;

    if (isLandedHighlight) {
      return 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 ring-2 ring-cyan-300 scale-125 z-10 shadow-[0_0_25px_rgba(6,182,212,0.8)] font-black';
    }

    if (mult >= 20) {
      return 'bg-gradient-to-b from-rose-950/80 to-amber-950/40 text-rose-300 border-rose-500/60 shadow-rose-500/20';
    }
    if (mult >= 5) {
      return 'bg-amber-950/60 text-amber-300 border-amber-500/50 shadow-amber-500/10';
    }
    if (mult >= 1.5) {
      return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40';
    }
    return 'bg-slate-900/80 text-slate-400 border-slate-800';
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-5">
      {/* ── TOP STATS BAR ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Risk / Rows',
            value: `${risk} · ${rows}R`,
            icon: <Zap className="w-4 h-4" />,
            color: risk === 'HIGH' ? 'text-rose-400' : risk === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400',
          },
          {
            label: 'Best Multiplier',
            value: bestMultiplier > 0 ? `${bestMultiplier}×` : '--',
            icon: <Trophy className="w-4 h-4" />,
            color: 'text-amber-400',
          },
          {
            label: 'Total Drops',
            value: `${totalDrops}`,
            icon: <CircleDot className="w-4 h-4" />,
            color: 'text-cyan-400',
          },
          {
            label: 'Session P&L',
            value: `${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}`,
            icon: totalProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
            color: totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400',
          },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
            <span className={`${color} opacity-80`}>{icon}</span>
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">{label}</div>
              <div className={`font-heading font-bold text-sm ${color}`}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN GAME GRID ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Stage (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[540px]">
          {/* Top Stage Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <CircleDot className="w-5 h-5 text-cyan-400" />
              <span className="font-heading text-sm font-bold text-foreground">CypherPlinko 3D</span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                ~98.0% RTP
              </span>
              {inFlightCount > 0 && (
                <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full animate-pulse">
                  {inFlightCount} in flight
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Audio Mute Toggle */}
              <button
                type="button"
                onClick={toggleAudio}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>

              <button
                onClick={() => setIsAuditorOpen(true)}
                className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-primary transition-colors bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Audit</span>
              </button>
            </div>
          </div>

          {/* 3D WebGL Canvas */}
          <div className="relative flex-1 flex items-center justify-center my-2 min-h-[350px]">
            <PlinkoCanvas
              rows={rows}
              activeDrop={activeDrop}
              onBallLanded={handleBallLanded}
            />

            {/* Last Hit Multiplier Callout */}
            {lastMultiplier !== null && (
              <div
                className={`absolute top-4 right-4 px-3.5 py-2 rounded-xl border backdrop-blur-xl transition-all duration-300 pointer-events-none shadow-xl ${
                  lastWon
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                }`}
              >
                <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Last Payout</div>
                <div className="text-xl font-heading font-black">{lastMultiplier.toFixed(2)}×</div>
              </div>
            )}
          </div>

          {/* Multiplier Slots UI Spectrum Overlay */}
          <div className="mt-2 flex justify-between gap-1 overflow-x-auto pb-2 scrollbar-none">
            {multipliers.map((mult, idx) => {
              const style = getSlotStyle(mult, idx);
              return (
                <div
                  key={idx}
                  className={`flex-1 min-w-[32px] py-1.5 text-center rounded-lg text-[10px] font-mono font-bold border transition-all duration-150 ${style}`}
                >
                  {mult}×
                </div>
              );
            })}
          </div>

          {/* Seed Pre-commitment Hash Display */}
          <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-500 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/80">
            <span className="truncate max-w-[240px]">Server Hash: {serverSeedHash.substring(0, 16)}...</span>
            <span className="text-cyan-400">Nonce #{nonce}</span>
          </div>
        </div>

        {/* Right Controls (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between min-h-[540px]">
          <div>
            {/* Mode Switch: Manual vs Auto */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4">
              <button
                type="button"
                onClick={() => {
                  stopAutoDrop();
                  setPlayMode('MANUAL');
                  sounds.playClick(500);
                }}
                className={`flex-1 py-1.5 text-xs font-heading font-bold rounded-lg transition-all ${
                  playMode === 'MANUAL'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                MANUAL
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlayMode('AUTO');
                  sounds.playClick(500);
                }}
                className={`flex-1 py-1.5 text-xs font-heading font-bold rounded-lg transition-all ${
                  playMode === 'AUTO'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                AUTO DROP
              </button>
            </div>

            {/* Balance Widget */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Bankroll</span>
                <span className="text-xl font-heading font-black text-primary">
                  ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Max Possible Win</span>
                <span className="text-base font-heading font-bold text-amber-400">
                  ${(wager * Math.max(...multipliers)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Wager Input */}
            <div className="mb-4">
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1.5">Wager ($1 – $500)</label>
              <div className="relative mb-2">
                <input
                  type="number"
                  min="1"
                  max={Math.min(balance, 500)}
                  value={wager}
                  disabled={isAutoActive}
                  onChange={(e) => setWager(Math.max(1, Math.min(500, parseFloat(e.target.value) || 1)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-base font-heading font-bold text-foreground focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  ['½', () => setWager((prev) => Math.max(1, Math.floor(prev / 2)))],
                  ['2×', () => setWager((prev) => Math.min(500, prev * 2))],
                  ['Min', () => setWager(1)],
                  ['Max', () => setWager(Math.min(balance, 500))],
                ].map(([lbl, fn]) => (
                  <button
                    key={lbl as string}
                    type="button"
                    disabled={isAutoActive}
                    onClick={() => {
                      (fn as () => void)();
                      sounds.playClick(700);
                    }}
                    className="py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-mono rounded-lg text-slate-300 font-bold transition-colors disabled:opacity-50"
                  >
                    {lbl as string}
                  </button>
                ))}
              </div>
            </div>

            {/* Risk & Rows Selectors */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1.5 uppercase">Risk Volatility</label>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {(['LOW', 'MEDIUM', 'HIGH'] as RiskLevel[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      disabled={isAutoActive}
                      onClick={() => {
                        setRisk(r);
                        sounds.playClick(600);
                      }}
                      className={`flex-1 text-[10px] py-1.5 font-heading font-bold rounded-lg transition-all ${
                        risk === r
                          ? r === 'HIGH'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                            : r === 'MEDIUM'
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                            : 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1.5 uppercase">Rows</label>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {[8, 12, 16].map((r) => (
                    <button
                      key={r}
                      type="button"
                      disabled={isAutoActive}
                      onClick={() => {
                        setRows(r);
                        sounds.playClick(600);
                      }}
                      className={`flex-1 text-[10px] py-1.5 font-mono font-bold rounded-lg transition-all ${
                        rows === r
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {r}R
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Auto Mode Specific Options */}
            {playMode === 'AUTO' && (
              <div className="mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label className="block text-[10px] font-mono text-slate-500 mb-1.5 uppercase">
                  Number of Bets
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { label: '5', val: 5 },
                    { label: '10', val: 10 },
                    { label: '25', val: 25 },
                    { label: '50', val: 50 },
                    { label: '∞', val: -1 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      disabled={isAutoActive}
                      onClick={() => {
                        setAutoTotal(opt.val);
                        sounds.playClick(600);
                      }}
                      className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                        autoTotal === opt.val
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Button & History */}
          <div>
            {playMode === 'MANUAL' ? (
              <button
                type="button"
                onClick={executeDrop}
                disabled={isDropping || wager > balance || wager < 1}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-heading font-black text-lg rounded-xl transition-all shadow-xl shadow-cyan-500/30 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isDropping ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                    DROPPING...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    DROP BALL (${wager})
                  </span>
                )}
              </button>
            ) : isAutoActive ? (
              <button
                type="button"
                onClick={stopAutoDrop}
                className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-heading font-black text-lg rounded-xl transition-all shadow-xl shadow-rose-600/30 active:scale-[0.98] flex items-center justify-center gap-2 animate-pulse"
              >
                <Square className="w-5 h-5 fill-current" />
                <span>
                  STOP AUTO {autoRemaining > 0 ? `(${autoRemaining} REMAINING)` : '(RUNNING)'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startAutoDrop}
                disabled={wager > balance || wager < 1}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-heading font-black text-lg rounded-xl transition-all shadow-xl shadow-purple-600/30 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>START AUTO DROP</span>
              </button>
            )}

            {/* History Mini Ticker */}
            {history.length > 0 && (
              <div className="mt-4 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Recent Drops</span>
                  <span className="text-[10px] font-mono text-slate-400">Click to Verify</span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openVerifierForDrop(item)}
                      title={`Multiplier: ${item.multiplier}x | ${item.won ? 'WON' : 'LOSS'}`}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold flex-shrink-0 border transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${
                        item.won
                          ? 'bg-emerald-950/60 hover:bg-emerald-900/60 border-emerald-600/40 text-emerald-400'
                          : 'bg-rose-950/60 hover:bg-rose-900/60 border-rose-600/40 text-rose-400'
                      }`}
                    >
                      <span>{item.multiplier.toFixed(2)}×</span>
                      <ShieldCheck className="w-3 h-3 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auditor Modal */}
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
