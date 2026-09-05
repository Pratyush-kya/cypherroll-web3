'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Shield, LifeBuoy, ShieldCheck, Wallet, Globe, ArrowUpRight, Flame, Layers, Crown, Landmark, MessageSquare, Lock, KeyRound, LogOut, Sparkles, Terminal } from 'lucide-react';
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
  onDisconnectWallet?: () => void;
  onOpenCashier: () => void;
  onOpenVIP: () => void;
  onOpenSecurity: () => void;
  onOpenFairness?: () => void;
  onToggleTrollbox: () => void;
  isTrollboxOpen: boolean;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  walletMismatch?: boolean;
  onSwitchWallet?: () => void;
  balance: number;
  onResetDemoBalance?: () => void;
  onOpenSupport?: () => void;
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
  onDisconnectWallet,
  onOpenCashier,
  onOpenVIP,
  onOpenSecurity,
  onOpenFairness,
  onToggleTrollbox,
  isTrollboxOpen,
  isDemoMode,
  onToggleDemoMode,
  walletMismatch,
  onSwitchWallet,
  balance,
  onResetDemoBalance,
  onOpenSupport,
}: NavbarProps) {
  const { setVisible: setSolanaModalVisible } = useWalletModal();
  const [selectedChain, setSelectedChain] = useState<'SOL' | 'EVM'>('SOL');

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-[1600px] mx-auto px-6 md:px-8 h-16 flex items-center justify-between gap-4">

        {/* Left Side: Logo */}
        <div className="flex-none">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('DICE')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Flame className="w-5 h-5 text-slate-950 fill-current" />
            </div>
            <span className="font-heading font-black text-lg sm:text-xl tracking-wider text-foreground">
              CYPHER<span className="text-primary">ROLL</span>
            </span>
          </div>
        </div>

        {/* Center: Flex Centered Nav Tabs (Won't Overlap) */}
        <div className="flex-1 hidden lg:flex justify-center">
          <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('DICE')}
              title="CypherDice - Provably fair dice game with adjustable win chance"
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
              title="CypherCrash - Real-time multiplayer crash game with high multipliers"
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
              title="Bankroll LP - Stake your USDC to earn yield from house winnings"
              className={`hidden sm:block px-3 sm:px-4 py-1.5 rounded-lg text-xs font-heading font-bold transition-all ${
                activeTab === 'VAULT'
                  ? 'bg-slate-800 text-foreground border border-slate-700'
                  : 'text-slate-400 hover:text-foreground'
              }`}
            >
              Bankroll LP
            </button>
          </nav>
        </div>

        {/* Right Side: Account Actions */}
        <div className="flex-none flex items-center justify-end gap-2">

          <button
            onClick={onOpenCashier}
            title="Cashier - Deposit or withdraw funds to play"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-heading font-bold text-slate-200 transition-colors"
          >
            <Landmark className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Cashier</span>
          </button>


          <button
            onClick={onOpenVIP}
            title="VIP Rewards - Claim your accumulated rakeback and track your tier"
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


          <button
            onClick={onToggleTrollbox}
            title="Trollbox - Global chat to talk with other players"
            className={`p-2 rounded-xl border transition-colors ${
              isTrollboxOpen
                ? 'bg-primary text-slate-950 border-primary'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {onOpenSupport && (
            <button
              onClick={onOpenSupport}
              className="p-2 rounded-xl border bg-slate-900 text-blue-400 border-slate-800 hover:text-blue-300 hover:border-blue-500/50 transition-colors shadow-sm"
              title="Helpdesk - Report bugs or payment issues directly to the admin"
            >
              <LifeBuoy className="w-4 h-4" />
            </button>
          )}


          <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => {
                if (isDemoMode) onToggleDemoMode();
              }}
              title="Real Mode - Play with your actual connected wallet balance"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                !isDemoMode
                  ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-foreground'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>REAL</span>
            </button>
            <button
              onClick={() => {
                if (!isDemoMode) onToggleDemoMode();
              }}
              title="Demo Mode - Play risk-free with virtual test credits"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                isDemoMode
                  ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/20'
                  : 'text-slate-400 hover:text-foreground'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>DEMO</span>
            </button>
          </div>


          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-xl text-[11px] font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${isDemoMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
            <span className="text-slate-400">{isDemoMode ? 'Demo:' : 'Real:'}</span>
            <span className={`font-bold ${isDemoMode ? 'text-amber-300' : 'text-primary'}`}>
              ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {isDemoMode && onResetDemoBalance && (
              <button
                onClick={onResetDemoBalance}
                title="Reset demo credits to $1,000.00"
                className="ml-1 text-[9px] text-slate-400 hover:text-amber-300 bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-700 font-bold transition-colors"
              >
                Reset
              </button>
            )}
          </div>


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


          <Link
            href="/admin"
            title="Operator Command Center (/admin)"
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-emerald-950/50 border border-slate-800 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400 transition-colors flex items-center justify-center shadow-sm"
          >
            <Terminal className="w-3.5 h-3.5" />
          </Link>


          {walletMismatch ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onSwitchWallet}
                title="Active wallet changed in extension. Click to switch account."
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-heading font-bold transition-all shadow-md shadow-amber-500/20 animate-pulse"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Switch Wallet</span>
              </button>
              <button
                onClick={onSignOut}
                title="Sign Out"
                className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-primary/40 px-2.5 py-1.5 rounded-xl shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-mono font-bold text-primary">
                  {truncateHash(user.wallet, 4, 3)}
                </span>
                <span className="text-[9px] font-mono text-slate-400 uppercase px-1 py-0.5 bg-slate-800 rounded">
                  {user.chain || selectedChain}
                </span>
              </div>
              <button
                onClick={onSignOut}
                title="Disconnect Wallet & Sign Out"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/50 text-xs font-heading font-bold text-slate-300 hover:text-rose-300 transition-all shadow-sm group"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400 transition-colors" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : selectedChain === 'SOL' ? (
            solanaConnected && solanaPublicKey ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onSignInSolana}
                  disabled={isAuthenticating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-heading font-bold transition-all shadow-md shadow-amber-500/20 animate-pulse"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{isAuthenticating ? "Verifying..." : "Sign In to Play"}</span>
                </button>
                {onDisconnectWallet && (
                  <button
                    onClick={onDisconnectWallet}
                    title="Disconnect Solana Wallet"
                    className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
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
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={onSignInEVM}
                      disabled={isAuthenticating}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-heading font-bold transition-all shadow-md shadow-purple-500/20 animate-pulse"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{isAuthenticating ? "Verifying..." : "Sign In with EVM"}</span>
                    </button>
                    {onDisconnectWallet && (
                      <button
                        onClick={onDisconnectWallet}
                        title="Disconnect EVM Wallet"
                        className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          )}
        </div>
      </div>
    </header>

    {/* =========================================
        MOBILE & TABLET BOTTOM NAVIGATION 
        (Only visible on < lg screens)
    ========================================= */}
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 pb-safe shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-around p-2">
        <button
          onClick={() => setActiveTab('DICE')}
          className={`flex flex-col items-center gap-1 p-2 w-16 rounded-xl transition-all ${
            activeTab === 'DICE' 
              ? 'text-primary scale-110 bg-primary/10' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="text-xl">🎲</span>
          <span className="text-[9px] font-heading font-bold">DICE</span>
        </button>

        <button
          onClick={() => setActiveTab('CRASH')}
          className={`flex flex-col items-center gap-1 p-2 w-16 rounded-xl transition-all ${
            activeTab === 'CRASH' 
              ? 'text-cta scale-110 bg-cta/10' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="text-xl">🚀</span>
          <span className="text-[9px] font-heading font-bold">CRASH</span>
        </button>

        {/* Floating Action Button for Cashier */}
        <div className="relative -top-5">
          <button
            onClick={onOpenCashier}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-600 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 border-4 border-slate-950 transition-transform active:scale-95"
          >
            <Landmark className="w-6 h-6" />
          </button>
        </div>

        <button
          onClick={() => setActiveTab('VAULT')}
          className={`flex flex-col items-center gap-1 p-2 w-16 rounded-xl transition-all ${
            activeTab === 'VAULT' 
              ? 'text-emerald-400 scale-110 bg-emerald-500/10' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="text-xl">🏦</span>
          <span className="text-[9px] font-heading font-bold">VAULT</span>
        </button>

        <button
          onClick={onToggleTrollbox}
          className={`flex flex-col items-center gap-1 p-2 w-16 rounded-xl transition-all ${
            isTrollboxOpen 
              ? 'text-primary scale-110 bg-primary/10' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[9px] font-heading font-bold">CHAT</span>
        </button>
      </div>
    </nav>
    </>
  );
}
