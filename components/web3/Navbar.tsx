'use client';

import React, { useState } from 'react';
import { Shield, Wallet, Globe, ArrowUpRight, Flame, Layers, Crown, Landmark, MessageSquare, Lock, KeyRound, LogOut } from 'lucide-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { truncateHash } from '@/lib/utils';
import { UserProfile } from '@/lib/web3/useAuth';

interface NavbarProps {
  activeTab: 'DICE' | 'CRASH' | 'VAULT';
  setActiveTab: (tab: 'DICE' | 'CRASH' | 'VAULT') => void;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  solanaConnected: boolean;
  solanaPublicKey?: string;
  evmConnected: boolean;
  evmAddress?: string;
  onSignInSolana: () => void;
  onSignInEVM: () => void;
  onSignOut: () => void;
  onOpenCashier: () => void;
  onOpenVIP: () => void;
  onOpenSecurity: () => void;
  onToggleTrollbox: () => void;
  isTrollboxOpen: boolean;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  user,
  isAuthenticated,
  isAuthenticating,
  solanaConnected,
  solanaPublicKey,
  evmConnected,
  evmAddress,
  onSignInSolana,
  onSignInEVM,
  onSignOut,
  onOpenCashier,
  onOpenVIP,
  onOpenSecurity,
  onToggleTrollbox,
  isTrollboxOpen,
}: NavbarProps) {
  const { setVisible: setSolanaModalVisible } = useWalletModal();
  const [selectedChain, setSelectedChain] = useState<'SOL' | 'EVM'>('SOL');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Badges */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('DICE')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Flame className="w-5 h-5 text-slate-950 fill-current" />
            </div>
            <span className="font-heading font-black text-lg sm:text-xl tracking-wider text-foreground">
              CYPHER<span className="text-primary">ROLL</span>
            </span>
          </div>

          {/* Privacy & Tor Indicator */}
          <button
            onClick={onOpenSecurity}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] font-mono text-slate-400 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Tor v3 Shielded</span>
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
            className={`hidden sm:block px-3 sm:px-4 py-1.5 rounded-lg text-xs font-heading font-bold transition-all ${
              activeTab === 'VAULT'
                ? 'bg-slate-800 text-foreground border border-slate-700'
                : 'text-slate-400 hover:text-foreground'
            }`}
          >
            Bankroll LP
          </button>
        </nav>

        {/* Right: Rollbit Action Controls & Real Web3 Connect */}
        <div className="flex items-center gap-2">
          {/* Cashier Vault Button */}
          <button
            onClick={onOpenCashier}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-heading font-bold text-slate-200 transition-colors"
          >
            <Landmark className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Cashier</span>
          </button>

          {/* VIP Rakeback Button */}
          <button
            onClick={onOpenVIP}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/30 text-xs font-mono font-bold text-purple-300 transition-colors"
          >
            <Crown className="w-3.5 h-3.5 text-cta" />
            <span>{user?.vipTier || 'Bronze'}</span>
            {user?.accumulatedRakeback ? (
              <span className="bg-emerald-500 text-slate-950 px-1 py-0.2 rounded text-[9px]">
                ${user.accumulatedRakeback.toFixed(2)}
              </span>
            ) : null}
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

          {/* Chain Selector */}
          <div className="hidden lg:flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setSelectedChain('SOL')}
              className={`px-2 py-1 rounded ${selectedChain === 'SOL' ? 'bg-primary/20 text-primary font-bold' : 'text-slate-400'}`}
            >
              SOL
            </button>
            <button
              onClick={() => setSelectedChain('EVM')}
              className={`px-2 py-1 rounded ${selectedChain === 'EVM' ? 'bg-cta/20 text-purple-300 font-bold' : 'text-slate-400'}`}
            >
              EVM
            </button>
          </div>

          {/* Real Web3 Auth Controls */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-primary/40 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-mono font-bold text-primary">
                {truncateHash(user.wallet, 4, 3)}
              </span>
              <button
                onClick={onSignOut}
                title="Disconnect & Sign Out"
                className="ml-1 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : selectedChain === 'SOL' ? (
            solanaConnected && solanaPublicKey ? (
              <button
                onClick={onSignInSolana}
                disabled={isAuthenticating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-heading font-bold transition-all shadow-md shadow-amber-500/20 animate-pulse"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{isAuthenticating ? "Verifying..." : "Sign In to Play"}</span>
              </button>
            ) : (
              <button
                onClick={() => setSolanaModalVisible(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-amber-500 text-slate-950 text-xs font-heading font-bold transition-all shadow-lg shadow-amber-500/20"
              >
                <Wallet className="w-4 h-4" />
                <span>Phantom / Solflare</span>
              </button>
            )
          ) : (
            <ConnectButton.Custom>
              {({ account, chain, openConnectModal, mounted }) => {
                const connected = mounted && account && chain;
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cta hover:bg-purple-600 text-white text-xs font-heading font-bold transition-all shadow-lg shadow-purple-600/20"
                    >
                      <Wallet className="w-4 h-4" />
                      <span>MetaMask / Base</span>
                    </button>
                  );
                }
                return (
                  <button
                    onClick={onSignInEVM}
                    disabled={isAuthenticating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-heading font-bold transition-all shadow-md shadow-purple-500/20 animate-pulse"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isAuthenticating ? "Verifying..." : "Sign In with EVM"}</span>
                  </button>
                );
              }}
            </ConnectButton.Custom>
          )}
        </div>
      </div>
    </header>
  );
}
