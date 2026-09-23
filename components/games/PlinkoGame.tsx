'use client';

import React, { useState } from 'react';
import PlinkoCanvas from '@/components/3d/PlinkoCanvas';
import { getPlinkoMultipliers } from '@/lib/provably-fair';
import { ShieldCheck, CircleDot, Zap, Trophy, TrendingUp, TrendingDown, Flame, Sparkles } from 'lucide-react';
import ProvablyFairModal from './ProvablyFairModal';

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

export default function PlinkoGame({ userWallet, balance, setBalance, onBetPlaced, isDemoMode }: PlinkoGameProps) {
  const [wager, setWager] = useState<number>(10);
  const [rows, setRows] = useState<number>(8);
  const [risk, setRisk] = useState<RiskLevel>('MEDIUM');
  
  const [isDropping, setIsDropping] = useState<boolean>(false);
  const [lastPath, setLastPath] = useState<number[] | null>(null);
  const [lastSlot, setLastSlot] = useState<number | null>(null);
  const [lastMultiplier, setLastMultiplier] = useState<number | null>(null);
  const [lastWon, setLastWon] = useState<boolean | null>(null);
  
  const [history, setHistory] = useState<BetHistoryItem[]>([]);
  const [nonce, setNonce] = useState<number>(1);
  const [serverSeedHash, setServerSeedHash] = useState<string>('0304473b50e479dcb7b54818671aa40746a0dabd4b7427c5cf358253e7d7426f');
  const [clientSeed, setClientSeed] = useState<string>('player_plinko_seed');
  
  const [isAuditorOpen, setIsAuditorOpen] = useState<boolean>(false);
  const [modalSeedParams, setModalSeedParams] = useState<{
    serverSeed?: string;
    serverSeedHash?: string;
    clientSeed?: string;
    nonce?: number;
  }>({});

  // Stats
  const [totalDrops, setTotalDrops] = useState<number>(0);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [bestMultiplier, setBestMultiplier] = useState<number>(0);

  const multipliers = getPlinkoMultipliers(rows, risk);

  const handleDrop = async () => {
    if (wager <= 0 || wager > balance || isDropping) return;

    setIsDropping(true);
    setLastPath(null);
    setLastSlot(null);
    setLastMultiplier(null);
    setLastWon(null);

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

      setLastPath(data.path);
      setLastSlot(data.slot);

      // Animate arrival after path completes
      setTimeout(() => {
        setLastMultiplier(data.multiplier);
        setLastWon(data.won);

        if (isDemoMode) {
          setBalance((prev) => parseFloat((prev + data.profit).toFixed(2)));
        } else if (data.newBalance !== undefined) {
          setBalance(data.newBalance);
        }

        if (data.newNonce) setNonce(data.newNonce);
        if (data.serverSeedHash) setServerSeedHash(data.serverSeedHash);

        if (onBetPlaced && !isDemoMode) {
          onBetPlaced(data.rakeback, data.vipTier);
        }

        setTotalDrops(td => td + 1);
        setTotalProfit(tp => parseFloat((tp + data.profit).toFixed(2)));
        setBestMultiplier(bm => Math.max(bm, data.multiplier));

        setHistory((prev) => [
          {
            id: Math.random().toString(36).substring(7),
            wager,
            multiplier: data.multiplier,
            profit: data.profit,
            won: data.won,
            rows,
            risk,
            serverSeed: data.serverSeed || '',
            serverSeedHash: data.serverSeedHash || serverSeedHash,
            clientSeed,
            nonce,
          },
          ...prev.slice(0, 7),
        ]);

        setIsDropping(false);
      }, rows * 60 + 500);
    } catch (err: any) {
      alert(err.message || "Failed to execute drop");
      setIsDropping(false);
    }
  };

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
    const isWinner = lastSlot === idx && !isDropping;
    if (mult >= 20) {
      return {
        bg: isWinner ? 'bg-rose-500 text-slate-950 ring-2 ring-rose-400 scale-110' : 'bg-gradient-to-b from-rose-950/80 to-amber-950/40 text-rose-300 border-rose-500/60 shadow-rose-500/20',
      };
    }
    if (mult >= 5) {
      return {
        bg: isWinner ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 scale-110' : 'bg-amber-950/60 text-amber-300 border-amber-500/50 shadow-amber-500/10',
      };
    }
    if (mult >= 1.5) {
      return {
        bg: isWinner ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300 scale-110' : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
      };
    }
    return {
      bg: isWinner ? 'bg-slate-400 text-slate-950 ring-2 ring-slate-300 scale-110' : 'bg-slate-900/80 text-slate-400 border-slate-800',
    };
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-5">
      {/* ── TOP STATS BAR ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Risk / Rows', value: `${risk} · ${rows}R`, icon: <Zap className="w-4 h-4" />, color: risk === 'HIGH' ? 'text-rose-400' : risk === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400' },
          { label: 'Best Multiplier', value: bestMultiplier > 0 ? `${bestMultiplier}×` : '--', icon: <Trophy className="w-4 h-4" />, color: 'text-amber-400' },
          { label: 'Total Drops', value: `${totalDrops}`, icon: <CircleDot className="w-4 h-4" />, color: 'text-cyan-400' },
          { label: 'Session P&L', value: `${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}`, icon: totalProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />, color: totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400' },
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
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[520px]">
          {/* Top Stage Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <CircleDot className="w-5 h-5 text-cyan-400" />
              <span className="font-heading text-sm font-bold text-foreground">CypherPlinko 3D</span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                ~98.0% RTP
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
          <div className="relative flex-1 flex items-center justify-center my-2 min-h-[340px]">
            <PlinkoCanvas
              isDropping={isDropping}
              rows={rows}
              path={lastPath}
              slot={lastSlot}
              multiplier={lastMultiplier}
            />

            {/* Large Result Callout */}
            {lastMultiplier !== null && !isDropping && (
              <div
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-7 py-4 rounded-2xl border backdrop-blur-xl transition-all animate-in zoom-in-90 duration-200 pointer-events-none shadow-2xl ${
                  lastWon
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-emerald-500/30'
                    : 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-rose-500/30'
                }`}
              >
                <div className="text-[11px] font-mono uppercase text-center tracking-[0.2em] mb-0.5">
                  {lastWon ? '✦ PAYOUT HIT ✦' : '✕ BELOW BREAK-EVEN'}
                </div>
                <div className="text-4xl font-heading font-black tracking-tight text-center">
                  {lastMultiplier.toFixed(2)}×
                </div>
                <div className="text-[10px] font-mono text-center mt-1 text-slate-400">
                  {lastWon ? `+$${((wager * lastMultiplier) - wager).toFixed(2)} Profit` : `-$${wager.toFixed(2)}`}
                </div>
              </div>
            )}
          </div>
          
          {/* Multiplier Slots UI Spectrum Overlay */}
          <div className="mt-2 flex justify-between gap-1 overflow-x-auto pb-2 scrollbar-none">
            {multipliers.map((mult, idx) => {
              const { bg } = getSlotStyle(mult, idx);
              return (
                <div 
                  key={idx} 
                  className={`flex-1 min-w-[32px] py-1.5 text-center rounded-lg text-[10px] font-mono font-bold border transition-all duration-200 ${bg}`}
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
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between min-h-[520px]">
          <div>
            {/* Balance Widget */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Bankroll</span>
                <span className="text-2xl font-heading font-black text-primary">
                  ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Max Possible Win</span>
                <span className="text-lg font-heading font-bold text-amber-400">
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
                  disabled={isDropping}
                  onChange={(e) => setWager(Math.max(1, Math.min(500, parseFloat(e.target.value) || 1)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-lg font-heading font-bold text-foreground focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  ['½', () => setWager(prev => Math.max(1, Math.floor(prev / 2)))],
                  ['2×', () => setWager(prev => Math.min(500, prev * 2))],
                  ['Min', () => setWager(1)],
                  ['Max', () => setWager(Math.min(balance, 500))],
                ].map(([lbl, fn]) => (
                  <button
                    key={lbl as string}
                    type="button"
                    disabled={isDropping}
                    onClick={fn as () => void}
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
                      disabled={isDropping}
                      onClick={() => setRisk(r)}
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
                      disabled={isDropping}
                      onClick={() => setRows(r)}
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
          </div>

          {/* Action Button & History */}
          <div>
            <button
              onClick={handleDrop}
              disabled={isDropping || wager > balance || wager < 1}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-heading font-black text-lg rounded-xl transition-all shadow-xl shadow-cyan-500/30 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isDropping ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-slate-950 border-t-transparent" />
                  DROPPING BALL...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  DROP PLINKO (${wager})
                </span>
              )}
            </button>

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
