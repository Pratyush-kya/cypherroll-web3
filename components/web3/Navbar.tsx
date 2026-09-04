'use client';

import React, { useState } from 'react';
import { Shield, Wallet, Globe, ArrowUpRight, Flame, Layers, Crown, Landmark, MessageSquare, Lock } from 'lucide-react';
import { truncateHash } from '@/lib/utils';

interface NavbarProps {
  activeTab: 'DICE' | 'CRASH' | 'VAULT';
  setActiveTab: (tab: 'DICE' | 'CRASH' | 'VAULT') => void;
  userWallet: string;
  setUserWallet: (w: string) => void;
  balance: number;
  vipTier: string;
  accumulatedRakeback: number;
  onOpenCashier: () => void;
  onOpenVIP: () => void;
  onOpenSecurity: () => void;
  onToggleTrollbox: () => void;
  isTrollboxOpen: boolean;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  userWallet,
  setUserWallet,
  balance,
  vipTier,
  accumulatedRakeback,
  onOpenCashier,
  onOpenVIP,
  onOpenSecurity,
  onToggleTrollbox,
  isTrollboxOpen,
}: NavbarProps) {
  const [selectedChain, setSelectedChain] = useState<'SOL' | 'EVM'>('SOL');

  const handleConnect = () => {
    if (!userWallet) {
      const mockAddr = selectedChain === 'SOL'
        ? "7XwZ...9q2P"
        : "0x89...4dF2";
      setUserWallet(mockAddr);
    } else {
      setUserWallet("");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Badges */}
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('DICE')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Flame className="w-5 h-5 text-slate-950 fill-current" />
            </div>
            <span className="font-heading font-black text-xl tracking-wider text-foreground">
              CYPHER<span className="text-primary">ROLL</span>
            </span>
          </div>

          {/* Privacy & Tor Indicator */}
          <button
            onClick={onOpenSecurity}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] font-mono text-slate-400 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Tor v3 Protected</span>
          </button>
        </div>

        {/* Center: Game Navigation */}
        <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('DICE')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-heading font-bold transition-all ${
              activeTab === 'DICE'
                ? 'bg-primary text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-foreground'
            }`}
          >
            CypherDice
          </button>
          <button
            onClick={() => setActiveTab('CRASH')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-heading font-bold transition-all ${
              activeTab === 'CRASH'
                ? 'bg-cta text-white shadow-md shadow-purple-600/20'
                : 'text-slate-400 hover:text-foreground'
            }`}
          >
            CypherCrash
          </button>
          <button
            onClick={() => setActiveTab('VAULT')}
            className={`hidden md:block px-3 sm:px-4 py-1.5 rounded-lg text-xs font-heading font-bold transition-all ${
              activeTab === 'VAULT'
                ? 'bg-slate-800 text-foreground border border-slate-700'
                : 'text-slate-400 hover:text-foreground'
            }`}
          >
            Bankroll LP
          </button>
        </nav>

        {/* Right: Rollbit Action Controls */}
        <div className="flex items-center gap-2">
          {/* Cashier Vault Button */}
          <button
            onClick={onOpenCashier}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-heading font-bold text-slate-200 transition-colors"
          >
            <Landmark className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Cashier</span>
          </button>

          {/* VIP Rakeback Button */}
          <button
            onClick={onOpenVIP}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/30 text-xs font-mono font-bold text-purple-300 transition-colors"
          >
            <Crown className="w-3.5 h-3.5 text-cta" />
            <span>{vipTier}</span>
            {accumulatedRakeback > 0 && (
              <span className="bg-emerald-500 text-slate-950 px-1 py-0.2 rounded text-[9px]">
                ${accumulatedRakeback.toFixed(2)}
              </span>
            )}
          </button>

          {/* Trollbox Toggle */}
          <button
            onClick={onToggleTrollbox}
            className={`p-2 rounded-xl border transition-colors ${
              isTrollboxOpen
                ? 'bg-primary text-slate-950 border-primary'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Connect Wallet */}
          <button
            onClick={handleConnect}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold transition-all ${
              userWallet
                ? 'bg-slate-900 border border-primary/50 text-primary'
                : 'bg-primary hover:bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>{userWallet ? userWallet : "Connect"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
