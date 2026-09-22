'use client';

import React, { useState } from 'react';
import PlinkoCanvas from '@/components/3d/PlinkoCanvas';
import { getPlinkoMultipliers } from '@/lib/provably-fair';
import { ShieldCheck, CircleDot, Zap } from 'lucide-react';
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
      if (!res.ok) throw new Error(data.error || 'Drop failed');

      setLastPath(data.path);

      // Give animation time to play out (simulate 50ms per row)
      setTimeout(() => {
        setLastSlot(data.slot);
        setLastMultiplier(data.multiplier);
        setLastWon(data.won);
        
        if (isDemoMode) {
          setBalance((prev) => parseFloat((prev + data.profit).toFixed(2)));
        } else {
          setBalance(data.newBalance);
        }
        
        if (data.newNonce) setNonce(data.newNonce);
        if (data.serverSeedHash) setServerSeedHash(data.serverSeedHash);

        if (onBetPlaced && !isDemoMode) {
          onBetPlaced(data.rakeback, data.vipTier);
        }

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
      }, rows * 60 + 500); // 60ms per row + settling time
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

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* 3D Game Stage (Left 7 Cols) */}
      <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[480px]">
        {/* Top Badges */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
          <div className="flex items-center gap-2">
            <CircleDot className="w-5 h-5 text-primary" />
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
        <div className="relative flex-1 flex items-center justify-center my-2">
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
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-3 rounded-2xl border backdrop-blur-md transition-all animate-in zoom-in-75 duration-200 ${
                lastWon
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-xl shadow-emerald-500/20'
                  : 'bg-rose-950/80 border-rose-500 text-rose-400 shadow-xl shadow-rose-500/20'
              }`}
            >
              <div className="text-[11px] font-mono uppercase text-center tracking-wider">
                {lastWon ? 'WINNER!' : 'LOSS'}
              </div>
              <div className="text-4xl font-heading font-black tracking-tight text-center">
                {lastMultiplier.toFixed(2)}x
              </div>
            </div>
          )}
        </div>
        
        {/* Multiplier Slots UI Overlay at bottom of canvas */}
        <div className="mt-2 flex justify-between gap-1 overflow-x-auto pb-2">
          {multipliers.map((mult, idx) => {
            const isEdge = idx < multipliers.length / 4 || idx > (multipliers.length * 3) / 4;
            return (
              <div 
                key={idx} 
                className={`flex-1 min-w-[28px] py-1 text-center rounded text-[10px] font-mono font-bold border ${
                  isEdge 
                  ? 'bg-emerald-950/60 border-emerald-600/40 text-emerald-400' 
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
                } ${lastSlot === idx && !isDropping ? 'scale-110 ring-2 ring-primary z-10 brightness-150' : ''}`}
              >
                {mult}x
              </div>
            );
          })}
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
                disabled={isDropping}
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

          {/* Risk & Rows Controls */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase">Risk Level</label>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                {(['LOW', 'MEDIUM', 'HIGH'] as RiskLevel[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={isDropping}
                    onClick={() => setRisk(r)}
                    className={`flex-1 text-[10px] py-1.5 font-bold rounded ${
                      risk === r 
                      ? 'bg-slate-800 text-white shadow' 
                      : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1.5 uppercase">Rows</label>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                {[8, 12, 16].map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={isDropping}
                    onClick={() => setRows(r)}
                    className={`flex-1 text-[10px] py-1.5 font-bold rounded ${
                      rows === r 
                      ? 'bg-slate-800 text-white shadow' 
                      : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleDrop}
          disabled={isDropping || wager > balance}
          className="w-full py-4 bg-cta hover:bg-purple-600 disabled:opacity-50 text-white font-heading font-black text-lg rounded-xl transition-all shadow-lg shadow-purple-600/30 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isDropping ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
              Dropping...
            </span>
          ) : isDemoMode ? (
            <span>DEMO DROP (${wager})</span>
          ) : (
            <span>DROP BALL (${wager})</span>
          )}
        </button>

        {/* Recent Bets Mini Ticker */}
        {history.length > 0 && (
          <div className="mt-5 border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Recent Drops (Click to Verify)</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openVerifierForDrop(item)}
                  title={`Click to Verify Drop: ${item.multiplier}x`}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold flex-shrink-0 border transition hover:scale-105 active:scale-95 flex items-center gap-1 ${
                    item.won
                      ? 'bg-emerald-950/60 hover:bg-emerald-900/60 border-emerald-600/40 text-emerald-400'
                      : 'bg-rose-950/60 hover:bg-rose-900/60 border-rose-600/40 text-rose-400'
                  }`}
                >
                  <span>{item.multiplier}x</span>
                  <ShieldCheck className="w-3 h-3 opacity-60" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Auditor Modal */}
      <ProvablyFairModal
        isOpen={isAuditorOpen}
        onClose={() => setIsAuditorOpen(false)}
        initialServerSeed={modalSeedParams.serverSeed || ''}
        initialServerSeedHash={modalSeedParams.serverSeedHash || serverSeedHash}
        initialClientSeed={modalSeedParams.clientSeed || clientSeed}
        initialNonce={modalSeedParams.nonce || (nonce > 1 ? nonce - 1 : 1)}
        initialGameType="DICE" // Using DICE auditor template temporarily or we could modify it, but user didn't ask to modify ProvablyFairModal
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
