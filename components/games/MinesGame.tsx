'use client';

import React, { useState } from 'react';
import MinesCanvas from '@/components/3d/MinesCanvas';
import { getMinesMultiplier } from '@/lib/provably-fair';
import { ShieldCheck, Bomb, Gem, Sparkles, Flame, Trophy, TrendingUp, TrendingDown, RefreshCw, Volume2, VolumeX, Dices } from 'lucide-react';
import ProvablyFairModal from './ProvablyFairModal';
import { sounds } from '@/lib/sound-effects';

interface MinesHistoryItem {
  id: string;
  mineCount: number;
  wager: number;
  profit: number;
  won: boolean;
  multiplier: number;
  serverSeed?: string;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
}

interface MinesGameProps {
  userWallet: string;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  onBetPlaced?: (rakeback: number, vip: string) => void;
  isDemoMode?: boolean;
}

const MINE_PRESETS = [
  { count: 1, label: '1 Mine', risk: '96% Safe' },
  { count: 3, label: '3 Mines', risk: 'Standard' },
  { count: 5, label: '5 Mines', risk: 'Spicy' },
  { count: 10, label: '10 Mines', risk: 'High Risk' },
  { count: 24, label: '24 Mines', risk: '24.5× Jackpot' },
];

export default function MinesGame({ userWallet, balance, setBalance, onBetPlaced, isDemoMode }: MinesGameProps) {
  const [mineCount, setMineCount] = useState<number>(10);
  const [wager, setWager] = useState<number>(10);
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [gameId, setGameId] = useState<string>('');
  const [gameToken, setGameToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);
  const [lastWon, setLastWon] = useState<boolean | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(sounds.getMuted());

  const [history, setHistory] = useState<MinesHistoryItem[]>([]);
  const [nonce, setNonce] = useState<number>(1);
  const [serverSeedHash, setServerSeedHash] = useState<string>('0304473b50e479dcb7b54818671aa40746a0dabd4b7427c5cf358253e7d7426f');
  const [clientSeed, setClientSeed] = useState<string>('player_lucky_777');
  const [isAuditorOpen, setIsAuditorOpen] = useState<boolean>(false);
  const [modalSeedParams, setModalSeedParams] = useState<{
    serverSeed?: string;
    serverSeedHash?: string;
    clientSeed?: string;
    nonce?: number;
  }>({});

  // View mode: '3D' or '2D' or 'HYBRID'
  const [viewMode, setViewMode] = useState<'GRID' | '3D'>('GRID');

  // Stats
  const [streak, setStreak] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalWagered, setTotalWagered] = useState(0);

  const potentialProfit = parseFloat(((wager * currentMultiplier) - wager).toFixed(2));
  const nextMultiplier = getMinesMultiplier(mineCount, revealedTiles.length + 1);
  const safeTilesRemaining = 25 - mineCount - revealedTiles.length;

  const handleStart = async () => {
    if (wager <= 0 || wager > balance || gameActive) return;

    sounds.playClick();
    setErrorMessage(null);
    try {
      setRevealedTiles([]);
      setMinePositions([]);
      setCurrentMultiplier(1);
      setLastWon(null);

      const res = await fetch('/api/games/mines/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: userWallet || (isDemoMode ? 'Demo_Player' : ''),
          mineCount,
          wager,
          clientSeed,
          isDemo: Boolean(isDemoMode),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start game');

      if (isDemoMode) {
        setBalance(prev => parseFloat((prev - wager).toFixed(2)));
      } else if (data.newBalance !== undefined) {
        setBalance(data.newBalance);
      }
      
      setGameId(data.gameId);
      setGameToken(data.gameToken || null);
      if (data.serverSeedHash) setServerSeedHash(data.serverSeedHash);
      setGameActive(true);
      setTotalWagered(prev => parseFloat((prev + wager).toFixed(2)));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to start game");
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleTileClick = async (index: number) => {
    if (!gameActive || revealedTiles.includes(index)) return;

    try {
      const res = await fetch('/api/games/mines/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: userWallet || (isDemoMode ? 'Demo_Player' : ''),
          gameId,
          gameToken,
          tileIndex: index,
          isDemo: Boolean(isDemoMode),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'GAME_EXPIRED' || (data.error && data.error.includes('expired'))) {
          setGameActive(false);
          setGameToken(null);
          setErrorMessage('Game expired or reset. Ready to start a fresh round!');
          setTimeout(() => setErrorMessage(null), 4000);
          return;
        }
        throw new Error(data.error || 'Reveal failed');
      }

      if (data.isMine) {
        // Boom! Game Over
        sounds.playExplosion();
        setGameActive(false);
        setGameToken(null);
        setLastWon(false);
        setMinePositions(data.minePositions || [index]);
        
        if (data.newBalance !== undefined) setBalance(data.newBalance);
        if (data.newNonce) setNonce(data.newNonce);
        if (onBetPlaced && !isDemoMode) onBetPlaced(data.rakeback, data.vipTier);

        setStreak(prev => (prev <= 0 ? prev - 1 : -1));
        setTotalProfit(prev => parseFloat((prev - wager).toFixed(2)));
        addToHistory(false, 0, -wager);
      } else {
        // Gem found!
        if (data.gameToken) setGameToken(data.gameToken);
        sounds.playGem(revealedTiles.length + 1);
        setRevealedTiles(prev => [...prev, index]);
        setCurrentMultiplier(data.currentMultiplier);
        
        // Auto cashout check - if all safe tiles revealed
        if (data.gemsRevealed === 25 - mineCount) {
          await handleCashout();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reveal tile");
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handlePickRandom = () => {
    if (!gameActive) return;
    const unrevealed = Array.from({ length: 25 }, (_, i) => i).filter(i => !revealedTiles.includes(i));
    if (unrevealed.length === 0) return;
    const randomIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    handleTileClick(randomIndex);
  };

  const handleCashout = async () => {
    if (!gameActive || revealedTiles.length === 0) return;

    try {
      const res = await fetch('/api/games/mines/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: userWallet || (isDemoMode ? 'Demo_Player' : ''),
          gameId,
          gameToken,
          isDemo: Boolean(isDemoMode),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'GAME_EXPIRED' || (data.error && data.error.includes('expired'))) {
          setGameActive(false);
          setGameToken(null);
          setErrorMessage('Game expired or reset. Ready to start a fresh round!');
          setTimeout(() => setErrorMessage(null), 4000);
          return;
        }
        throw new Error(data.error || 'Cashout failed');
      }

      setGameActive(false);
      setGameToken(null);
      setLastWon(true);
      setMinePositions(data.minePositions || []);
      sounds.playCashout();
      
      if (isDemoMode) {
        setBalance(prev => parseFloat((prev + data.payout).toFixed(2)));
      } else if (data.newBalance !== undefined) {
        setBalance(data.newBalance);
      }
      
      if (data.newNonce) setNonce(data.newNonce);
      if (onBetPlaced && !isDemoMode) onBetPlaced(data.rakeback, data.vipTier);

      setStreak(prev => (prev >= 0 ? prev + 1 : 1));
      setTotalProfit(prev => parseFloat((prev + data.profit).toFixed(2)));
      addToHistory(true, data.multiplier, data.profit);
    } catch (err: any) {
      setErrorMessage(err.message || "Cashout failed");
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const addToHistory = (won: boolean, mult: number, profit: number) => {
    setHistory((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        mineCount,
        wager,
        profit,
        won,
        multiplier: mult,
        serverSeed: '', 
        serverSeedHash,
        clientSeed,
        nonce,
      },
      ...prev.slice(0, 7),
    ]);
  };

  const openVerifier = (item: MinesHistoryItem) => {
    setModalSeedParams({
      serverSeed: item.serverSeed || '',
      serverSeedHash: item.serverSeedHash || serverSeedHash,
      clientSeed: item.clientSeed || clientSeed,
      nonce: item.nonce || (nonce > 1 ? nonce - 1 : 1),
    });
    setIsAuditorOpen(true);
  };

  // Precompute next 5 ladder steps
  const ladderSteps = [1, 2, 3, 4, 5].map(step => {
    const gemCount = revealedTiles.length + step;
    return {
      step: gemCount,
      mult: getMinesMultiplier(mineCount, gemCount),
      isNext: step === 1,
    };
  }).filter(s => s.mult > 0);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-5">
      {/* ── TOP STATS BAR ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Mines / Safe', value: `${mineCount} 💣 / ${25 - mineCount} 💎`, icon: <Bomb className="w-4 h-4" />, color: 'text-amber-400' },
          { label: 'Current Multiplier', value: `${currentMultiplier}×`, icon: <Sparkles className="w-4 h-4" />, color: 'text-emerald-400' },
          { label: 'Safe Remaining', value: gameActive ? `${safeTilesRemaining}` : `${25 - mineCount}`, icon: <Gem className="w-4 h-4" />, color: 'text-cyan-400' },
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
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-emerald-400" />
              <span className="font-heading text-sm font-bold text-foreground">CypherMines</span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                97.0% RTP (3% Edge)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <button
                onClick={() => setIsMuted(sounds.toggleMute())}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-foreground transition-colors"
                title={isMuted ? "Unmute Sound" : "Mute Sound"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                <button
                  onClick={() => setViewMode('GRID')}
                  className={`px-2 py-0.5 rounded font-bold ${viewMode === 'GRID' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
                >
                  Tactical
                </button>
                <button
                  onClick={() => setViewMode('3D')}
                  className={`px-2 py-0.5 rounded font-bold ${viewMode === '3D' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
                >
                  3D View
                </button>
              </div>

              <button
                onClick={() => setIsAuditorOpen(true)}
                className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-primary transition-colors bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Audit</span>
              </button>
            </div>
          </div>

          {/* Multiplier Step Ladder (Live when in game) */}
          {gameActive && ladderSteps.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
              <span className="text-[10px] font-mono text-slate-500 shrink-0 uppercase">Next Steps:</span>
              {ladderSteps.map((step) => (
                <div
                  key={step.step}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 border transition-all ${
                    step.isNext
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-md shadow-emerald-500/20 scale-105'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800'
                  }`}
                >
                  {step.mult}×
                </div>
              ))}
            </div>
          )}

          {/* Game Stage (3D Canvas or Tactical 5x5 Cyber Grid) */}
          <div className="relative flex-1 flex items-center justify-center my-2 min-h-[320px]">
            {viewMode === '3D' ? (
              <MinesCanvas
                gameActive={gameActive}
                revealedTiles={revealedTiles}
                minePositions={minePositions}
                onTileClick={handleTileClick}
              />
            ) : (
              /* Tactical 5x5 Cyber Grid */
              <div className="w-full max-w-[340px] sm:max-w-[380px] aspect-square grid grid-cols-5 gap-2 p-2 bg-slate-950/80 rounded-2xl border border-slate-800/80 shadow-inner">
                {Array.from({ length: 25 }, (_, i) => {
                  const isRevealed = revealedTiles.includes(i);
                  const isMine = minePositions.includes(i);
                  const isGameOver = !gameActive && minePositions.length > 0;

                  return (
                    <button
                      key={i}
                      onClick={() => handleTileClick(i)}
                      disabled={!gameActive || isRevealed}
                      className={`relative rounded-xl border font-mono font-bold transition-all duration-200 flex items-center justify-center aspect-square text-lg select-none ${
                        isRevealed
                          ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300 shadow-lg shadow-emerald-500/30 scale-[0.98]'
                          : isGameOver && isMine
                          ? 'bg-rose-950/90 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/30 animate-pulse'
                          : isGameOver && !isMine
                          ? 'bg-slate-900/60 border-slate-800 text-slate-600 opacity-50'
                          : gameActive
                          ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-750 hover:border-emerald-500/60 text-slate-400 hover:scale-105 active:scale-95 shadow-sm'
                          : 'bg-slate-900/50 border-slate-800/80 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {isRevealed ? (
                        <span className="animate-in zoom-in-50 duration-200">💎</span>
                      ) : isGameOver && isMine ? (
                        <span className="animate-in zoom-in-50 duration-200">💣</span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-800" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Game Result Popup Overlay */}
            {!gameActive && lastWon !== null && (
              <div
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-7 py-4 rounded-2xl border backdrop-blur-xl transition-all animate-in zoom-in-90 duration-200 pointer-events-none shadow-2xl ${
                  lastWon
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-emerald-500/30'
                    : 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-rose-500/30'
                }`}
              >
                <div className="text-[11px] font-mono uppercase text-center tracking-[0.2em] mb-0.5">
                  {lastWon ? '✦ MISSION SUCCESS ✦' : '✕ DETONATED'}
                </div>
                <div className="text-4xl font-heading font-black tracking-tight text-center">
                  {lastWon ? `${currentMultiplier}×` : 'BUST'}
                </div>
                <div className="text-[10px] font-mono text-center mt-1 text-slate-400">
                  {lastWon ? `+$${((wager * currentMultiplier) - wager).toFixed(2)} Profit` : `-$${wager.toFixed(2)}`}
                </div>
              </div>
            )}
          </div>

          {/* Mine Presets (When not active) */}
          {!gameActive && (
            <div className="mt-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-[10px] font-mono mb-2">
                <span className="text-slate-400 uppercase">Preset Difficulty:</span>
                <span className="text-amber-400 font-bold">{mineCount} Mines ({25 - mineCount} Safe Gems)</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                {MINE_PRESETS.map((p) => (
                  <button
                    key={p.count}
                    onClick={() => setMineCount(p.count)}
                    className={`py-1.5 px-1 rounded-lg text-center border text-[10px] font-mono font-bold transition-all ${
                      mineCount === p.count
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>{p.label}</div>
                    <div className="text-[8px] opacity-70">{p.risk}</div>
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={mineCount}
                onChange={(e) => setMineCount(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          )}

          {/* Seed Hash Bar */}
          <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-500 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/80">
            <span className="truncate max-w-[240px]">Server Hash: {serverSeedHash.substring(0, 16)}...</span>
            <span className="text-emerald-400">Nonce #{nonce}</span>
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
                <span className="text-[10px] font-mono text-slate-500 uppercase block">
                  {gameActive ? 'Current Cashout' : 'Potential Max'}
                </span>
                <span className="text-lg font-heading font-bold text-emerald-400">
                  ${gameActive ? (wager * currentMultiplier).toFixed(2) : (wager * getMinesMultiplier(mineCount, 1)).toFixed(2)}
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
                  disabled={gameActive}
                  onChange={(e) => setWager(Math.max(1, Math.min(500, parseFloat(e.target.value) || 1)))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-lg font-heading font-bold text-foreground focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
              {!gameActive && (
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
                      onClick={fn as () => void}
                      className="py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-mono rounded-lg text-slate-300 font-bold transition-colors"
                    >
                      {lbl as string}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Live Multiplier & Profit Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] font-mono text-slate-500 block uppercase">Multiplier</span>
                <span className="text-xl font-heading font-black text-emerald-400">{currentMultiplier}×</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] font-mono text-slate-500 block uppercase">
                  {gameActive ? 'Next Gem Mult' : '1st Gem Mult'}
                </span>
                <span className="text-xl font-heading font-black text-amber-400">
                  {nextMultiplier}×
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div>
            {errorMessage && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-mono text-center animate-in fade-in duration-200">
                {errorMessage}
              </div>
            )}

            {gameActive ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCashout}
                  disabled={revealedTiles.length === 0}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-slate-950 font-heading font-black text-lg rounded-xl transition-all shadow-xl shadow-emerald-500/30 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>CASHOUT ${(wager * currentMultiplier).toFixed(2)} (+${potentialProfit})</span>
                </button>
                <button
                  onClick={handlePickRandom}
                  disabled={!gameActive || revealedTiles.length >= (25 - mineCount)}
                  className="w-full py-2.5 bg-slate-900/90 hover:bg-slate-800 text-amber-400 border border-amber-500/30 hover:border-amber-400/60 font-heading font-bold text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
                >
                  <Dices className="w-4 h-4" />
                  <span>PICK RANDOM TILE</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleStart}
                disabled={wager > balance || wager < 1}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-heading font-black text-lg rounded-xl transition-all shadow-xl shadow-purple-600/30 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Bomb className="w-5 h-5" />
                <span>START GAME (${wager})</span>
              </button>
            )}

            {/* History Mini Ticker */}
            {history.length > 0 && (
              <div className="mt-4 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Recent Games</span>
                  <span className="text-[10px] font-mono text-slate-400">Click to Verify</span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openVerifier(item)}
                      title={`Mines: ${item.mineCount} | ${item.won ? 'WON' : 'BUST'}`}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold flex-shrink-0 border transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${
                        item.won
                          ? 'bg-emerald-950/60 hover:bg-emerald-900/60 border-emerald-600/40 text-emerald-400'
                          : 'bg-rose-950/60 hover:bg-rose-900/60 border-rose-600/40 text-rose-400'
                      }`}
                    >
                      <span>{item.multiplier}×</span>
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
