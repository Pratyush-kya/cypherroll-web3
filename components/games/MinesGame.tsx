'use client';

import React, { useState } from 'react';
import MinesCanvas from '@/components/3d/MinesCanvas';
import { getMinesMultiplier } from '@/lib/provably-fair';
import { ShieldCheck, Bomb, Gem, History } from 'lucide-react';
import ProvablyFairModal from './ProvablyFairModal';

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

export default function MinesGame({ userWallet, balance, setBalance, onBetPlaced, isDemoMode }: MinesGameProps) {
  const [mineCount, setMineCount] = useState<number>(3);
  const [wager, setWager] = useState<number>(10);
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [gameId, setGameId] = useState<string>('');
  
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);
  const [lastWon, setLastWon] = useState<boolean | null>(null);

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

  const potentialProfit = parseFloat(((wager * currentMultiplier) - wager).toFixed(2));
  const nextMultiplier = getMinesMultiplier(mineCount, revealedTiles.length + 1);

  const handleStart = async () => {
    if (wager <= 0 || wager > balance || gameActive) return;

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

      if (!isDemoMode && data.newBalance !== undefined) {
        setBalance(data.newBalance);
      }
      
      setGameId(data.gameId);
      if (data.serverSeedHash) setServerSeedHash(data.serverSeedHash);
      setGameActive(true);
    } catch (err: any) {
      alert(err.message || "Failed to start game");
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
          tileIndex: index,
          isDemo: Boolean(isDemoMode),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reveal failed');

      if (data.isMine) {
        // Boom! Game Over
        setGameActive(false);
        setLastWon(false);
        setMinePositions(data.minePositions);
        
        if (data.newBalance !== undefined) setBalance(data.newBalance);
        if (data.newNonce) setNonce(data.newNonce);
        if (onBetPlaced && !isDemoMode) onBetPlaced(data.rakeback, data.vipTier);

        addToHistory(false, 0, -wager);
      } else {
        // Gem found
        setRevealedTiles(prev => [...prev, index]);
        setCurrentMultiplier(data.currentMultiplier);
        
        // Auto cashout check - if all safe tiles revealed
        if (data.gemsRevealed === 25 - mineCount) {
          await handleCashout();
        }
      }
    } catch (err: any) {
      alert(err.message || "Failed to reveal tile");
    }
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
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cashout failed');

      setGameActive(false);
      setLastWon(true);
      setMinePositions(data.minePositions);
      
      if (isDemoMode) {
        setBalance(prev => parseFloat((prev + data.payout).toFixed(2)));
      } else if (data.newBalance !== undefined) {
        setBalance(data.newBalance);
      }
      
      if (data.newNonce) setNonce(data.newNonce);
      if (onBetPlaced && !isDemoMode) onBetPlaced(data.rakeback, data.vipTier);

      addToHistory(true, data.multiplier, data.profit);
    } catch (err: any) {
      alert(err.message || "Cashout failed");
    }
  };

  const addToHistory = (won: boolean, multiplier: number, profit: number) => {
    setHistory((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        mineCount,
        wager,
        profit,
        won,
        multiplier,
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

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* 3D Game Stage (Left 7 Cols) */}
      <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[480px]">
        {/* Top Badges */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
          <div className="flex items-center gap-2">
            <Bomb className="w-5 h-5 text-primary" />
            <span className="font-heading text-sm font-bold text-foreground">CypherMines 3D</span>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
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

        {/* 3D WebGL Canvas */}
        <div className="relative flex-1 flex items-center justify-center my-2">
          <MinesCanvas
            gameActive={gameActive}
            revealedTiles={revealedTiles}
            minePositions={minePositions}
            onTileClick={handleTileClick}
          />
          
          {/* Game Over Overlay */}
          {!gameActive && lastWon !== null && (
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-3 rounded-2xl border backdrop-blur-md transition-all animate-in zoom-in-75 duration-200 pointer-events-none ${
                lastWon
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-xl shadow-emerald-500/20'
                  : 'bg-rose-950/80 border-rose-500 text-rose-400 shadow-xl shadow-rose-500/20'
              }`}
            >
              <div className="text-[11px] font-mono uppercase text-center tracking-wider">
                {lastWon ? 'WINNER!' : 'BUSTED'}
              </div>
              <div className="text-4xl font-heading font-black tracking-tight text-center">
                {lastWon ? `${currentMultiplier}x` : '0x'}
              </div>
            </div>
          )}
        </div>

        {/* Mine Count Selector (Only when not active) */}
        {!gameActive && (
          <div className="mt-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs font-mono mb-2">
              <span className="text-slate-400">Mines: <strong className="text-primary font-bold">{mineCount}</strong></span>
              <span className="text-slate-400">Safe Tiles: <strong className="text-emerald-400 font-bold">{25 - mineCount}</strong></span>
            </div>
            <input
              type="range"
              min="1"
              max="24"
              step="1"
              value={mineCount}
              onChange={(e) => setMineCount(parseInt(e.target.value))}
              className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        )}

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
                disabled={gameActive}
                onChange={(e) => setWager(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base font-heading font-bold text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
              />
              {!gameActive && (
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
              )}
            </div>
          </div>

          {/* Stats Readout */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Multiplier</span>
              <span className="text-lg font-heading font-black text-primary">{currentMultiplier}×</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">
                {gameActive ? 'Next Multiplier' : 'Profit on Win'}
              </span>
              <span className="text-lg font-heading font-black text-emerald-400">
                {gameActive ? `${nextMultiplier}×` : `+$${potentialProfit}`}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {gameActive ? (
          <button
            onClick={handleCashout}
            disabled={revealedTiles.length === 0}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-heading font-black text-lg rounded-xl transition-all shadow-lg shadow-emerald-600/30 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>CASHOUT ${(wager * currentMultiplier).toFixed(2)}</span>
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={wager > balance}
            className="w-full py-4 bg-cta hover:bg-purple-600 disabled:opacity-50 text-white font-heading font-black text-lg rounded-xl transition-all shadow-lg shadow-purple-600/30 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isDemoMode ? (
              <span>DEMO BET (${wager})</span>
            ) : (
              <span>BET (${wager})</span>
            )}
          </button>
        )}

        {/* Recent Bets Mini Ticker */}
        {history.length > 0 && (
          <div className="mt-5 border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Recent Games</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openVerifier(item)}
                  title={`Click to 1-Click Verify`}
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
