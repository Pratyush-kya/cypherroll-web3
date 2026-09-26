'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { LifeBuoy, ShieldCheck, Wallet, Flame, Crown, Landmark, MessageSquare, KeyRound, LogOut, Sparkles, Terminal, ChevronDown, Bomb, Layers } from 'lucide-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { truncateHash } from '@/lib/utils';
import { UserProfile } from '@/lib/web3/useAuth';

interface NavbarProps {
  activeTab: 'DICE' | 'CRASH' | 'MINES' | 'PLINKO' | 'VAULT';
  setActiveTab: (tab: 'DICE' | 'CRASH' | 'MINES' | 'PLINKO' | 'VAULT') => void;
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

// Games config — single source of truth for nav tabs
const GAMES = [
  { id: 'DICE' as const,   label: 'Dice',   emoji: '🎲', color: 'text-amber-400',   active: 'bg-amber-500 text-slate-950 shadow-amber-500/25'   },
  { id: 'CRASH' as const,  label: 'Crash',  emoji: '🚀', color: 'text-purple-400',  active: 'bg-purple-600 text-white shadow-purple-600/25'       },
  { id: 'MINES' as const,  label: 'Mines',  emoji: '💎', color: 'text-emerald-400', active: 'bg-emerald-500 text-slate-950 shadow-emerald-500/25' },
  { id: 'PLINKO' as const, label: 'Plinko', emoji: '🎯', color: 'text-cyan-400',    active: 'bg-cyan-500 text-slate-950 shadow-cyan-500/25'       },
  { id: 'VAULT' as const,  label: 'Vault',  emoji: '🏦', color: 'text-slate-400',   active: 'bg-slate-700 text-foreground'                        },
] as const;

export default function Navbar({
  activeTab, setActiveTab,
  user, isAuthenticated, isAuthenticating,
  solanaConnected, solanaPublicKey,
  evmConnected, evmAddress,
  onSignInSolana, onSignInEVM, onSignOut, onDisconnectWallet,
  onOpenCashier, onOpenVIP, onOpenSecurity, onOpenFairness,
  onToggleTrollbox, isTrollboxOpen,
  isDemoMode, onToggleDemoMode,
  walletMismatch, onSwitchWallet,
  balance, onResetDemoBalance, onOpenSupport,
}: NavbarProps) {
  const { setVisible: setSolanaModalVisible } = useWalletModal();
  const [chain, setChain] = useState<'SOL' | 'EVM'>('SOL');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletDropOpen, setWalletDropOpen] = useState(false);
  const walletDropRef = useRef<HTMLDivElement>(null);

  // Close wallet dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (walletDropRef.current && !walletDropRef.current.contains(e.target as Node)) {
        setWalletDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Wallet button — always fully visible, uses a dropdown panel ────────
  const WalletSection = () => {
    if (walletMismatch) {
      return (
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSwitchWallet}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-heading font-bold transition-all shadow-md shadow-amber-500/30 animate-pulse"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Switch Wallet</span>
          </button>
          <button onClick={onSignOut} className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    if (isAuthenticated && user) {
      return (
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-emerald-300 whitespace-nowrap">
              {truncateHash(user.wallet, 4, 3)}
            </span>
            <span className="text-[9px] font-mono text-slate-400 uppercase px-1 py-0.5 bg-slate-800 rounded shrink-0">
              {user.chain || chain}
            </span>
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-xs font-heading font-bold text-slate-300 hover:text-rose-300 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      );
    }

    // Not authenticated — show chain picker + wallet connect as a unified dropdown
    return (
      <div className="relative" ref={walletDropRef}>
        <button
          onClick={() => setWalletDropOpen(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-slate-950 text-xs font-heading font-bold transition-all shadow-lg shadow-purple-600/20"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Connect Wallet</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${walletDropOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown panel — boundary safe on all screens, never clips off-screen */}
        {walletDropOpen && (
          <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-20 sm:top-full sm:right-0 mt-1 sm:mt-2 w-auto sm:w-84 max-w-[calc(100vw-24px)] bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Chain selector tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/60">
              {(['SOL', 'EVM'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setChain(c)}
                  className={`flex-1 py-3 px-3 text-xs font-heading font-bold transition-all flex items-center justify-center gap-1.5 ${
                    chain === c
                      ? c === 'SOL'
                        ? 'bg-amber-500/15 text-amber-400 border-b-2 border-amber-500 shadow-inner'
                        : 'bg-purple-500/15 text-purple-400 border-b-2 border-purple-500 shadow-inner'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <span className="text-sm">{c === 'SOL' ? '◎' : '⬡'}</span>
                  <span>{c === 'SOL' ? 'Solana Ecosystem' : 'EVM Networks'}</span>
                </button>
              ))}
            </div>

            <div className="p-4 space-y-3">
              {chain === 'SOL' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Connect Solana Wallet:</span>
                    <span className="text-amber-400 font-bold">Phantom / Solflare</span>
                  </div>
                  {solanaConnected && solanaPublicKey ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-slate-800/90 border border-emerald-500/40 rounded-xl px-3 py-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-mono text-slate-400">Solana Connected</div>
                          <div className="text-xs font-mono font-bold text-emerald-300 truncate">{truncateHash(solanaPublicKey, 6, 6)}</div>
                        </div>
                        <span className="text-[9px] font-mono text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">Active</span>
                      </div>
                      <button
                        onClick={() => { onSignInSolana(); setWalletDropOpen(false); }}
                        disabled={isAuthenticating}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-sm font-heading font-black transition-all shadow-lg shadow-amber-500/25 active:scale-[0.98] disabled:opacity-60"
                      >
                        <KeyRound className="w-4 h-4" />
                        {isAuthenticating ? 'Authenticating Signature...' : 'Sign In with Solana'}
                      </button>
                      {onDisconnectWallet && (
                        <button onClick={onDisconnectWallet} className="w-full text-xs font-mono text-slate-500 hover:text-rose-400 py-1 transition-colors">
                          Disconnect wallet
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => { setSolanaModalVisible(true); setWalletDropOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-purple-950/70 to-slate-900 hover:from-purple-900/80 hover:to-slate-800 border border-purple-500/30 hover:border-purple-400 text-white text-xs font-heading font-bold transition-all shadow-md group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#ab9ff2]/20 flex items-center justify-center text-[#ab9ff2] font-black text-sm">
                            👻
                          </div>
                          <div className="text-left">
                            <div className="text-white font-bold group-hover:text-amber-300 transition-colors">Phantom Wallet</div>
                            <div className="text-[10px] text-slate-400 font-mono">Popular Solana Extension</div>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">Connect</span>
                      </button>

                      <button
                        onClick={() => { setSolanaModalVisible(true); setWalletDropOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-heading font-bold transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-black text-sm">
                            🔥
                          </div>
                          <div className="text-left">
                            <div>Solflare / Other</div>
                            <div className="text-[10px] text-slate-500 font-mono">Mobile & Hardware</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">Select →</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Connect EVM Web3 Wallet:</span>
                    <span className="text-purple-400 font-bold">Base / Ethereum</span>
                  </div>
                  <ConnectButton.Custom>
                    {({ account, chain: evmChain, openConnectModal, mounted }) => {
                      const connected = mounted && account && evmChain;
                      if (!connected) {
                        return (
                          <div className="space-y-2">
                            <button
                              onClick={() => { openConnectModal(); setWalletDropOpen(false); }}
                              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-amber-950/40 to-slate-900 hover:from-amber-900/50 hover:to-slate-800 border border-amber-500/30 hover:border-amber-400 text-white text-xs font-heading font-bold transition-all shadow-md group"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-black text-sm">
                                  🦊
                                </div>
                                <div className="text-left">
                                  <div className="text-white font-bold group-hover:text-purple-300 transition-colors">MetaMask</div>
                                  <div className="text-[10px] text-slate-400 font-mono">Browser Extension & Mobile</div>
                                </div>
                              </div>
                              <span className="text-[11px] font-mono text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/30">Connect</span>
                            </button>

                            <button
                              onClick={() => { openConnectModal(); setWalletDropOpen(false); }}
                              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-heading font-bold transition-all"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-black text-sm">
                                  🔵
                                </div>
                                <div className="text-left">
                                  <div>Coinbase / Base / Rainbow</div>
                                  <div className="text-[10px] text-slate-500 font-mono">WalletConnect Protocol</div>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">Select →</span>
                            </button>
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 bg-slate-800/90 border border-purple-500/40 rounded-xl px-3 py-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-mono text-slate-400">{evmChain.name || 'EVM'} Connected</div>
                              <div className="text-xs font-mono font-bold text-purple-300 truncate">{truncateHash(account.address, 6, 6)}</div>
                            </div>
                            <span className="text-[9px] font-mono text-purple-400 uppercase bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded">Active</span>
                          </div>
                          <button
                            onClick={() => { onSignInEVM(); setWalletDropOpen(false); }}
                            disabled={isAuthenticating}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-heading font-black transition-all shadow-lg shadow-purple-600/30 active:scale-[0.98] disabled:opacity-60"
                          >
                            <KeyRound className="w-4 h-4" />
                            {isAuthenticating ? 'Verifying Signature...' : 'Sign In with EVM'}
                          </button>
                          {onDisconnectWallet && (
                            <button onClick={onDisconnectWallet} className="w-full text-xs font-mono text-slate-500 hover:text-rose-400 py-1 transition-colors">
                              Disconnect wallet
                            </button>
                          )}
                        </div>
                      );
                    }}
                  </ConnectButton.Custom>
                </div>
              )}
            </div>

            {/* Footer links */}
            <div className="border-t border-slate-800/80 bg-slate-950/40 px-4 py-2.5 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500">Non-Custodial · Instant Settlement</span>
              <button
                onClick={() => { setMobileMenuOpen(false); setWalletDropOpen(false); onToggleDemoMode(); }}
                className="text-[10px] font-mono text-amber-400 hover:text-amber-300 font-bold transition-colors"
              >
                {isDemoMode ? 'Real Play →' : 'Switch Demo →'}
              </button>
            </div>
          </div>
        )}

      </div>
    );
  };

  return (
    <>
    {/* ── MAIN HEADER ──────────────────────────────────────────────────── */}
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-lg">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">

        {/* ── LOGO ─────────────────────────────────────────────────────── */}
        <div className="flex-none">
          <button onClick={() => setActiveTab('DICE')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-orange-500 to-purple-600 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
              <Flame className="w-5 h-5 text-slate-950 fill-current" />
            </div>
            <span className="font-heading font-black text-lg tracking-wider text-foreground hidden sm:block">
              CYPHER<span className="text-amber-400">ROLL</span>
            </span>
          </button>
        </div>

        {/* ── DESKTOP GAME TABS — center, scrollable ────────────────────── */}
        <div className="flex-1 hidden lg:flex justify-center min-w-0">
          <nav className="flex items-center gap-0.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
            {GAMES.map(g => (
              <button
                key={g.id}
                onClick={() => setActiveTab(g.id)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-xs font-heading font-bold transition-all shadow-sm ${
                  activeTab === g.id
                    ? g.active
                    : `${g.color} opacity-60 hover:opacity-100`
                }`}
              >
                <span className="mr-1">{g.emoji}</span>{g.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── RIGHT SECTION ─────────────────────────────────────────────── */}
        <div className="flex-none flex items-center gap-1.5 ml-auto">

          {/* Balance pill — always visible on sm+ */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1.5 rounded-xl text-[11px] font-mono whitespace-nowrap">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDemoMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span className={`font-bold ${isDemoMode ? 'text-amber-300' : 'text-primary'}`}>
              ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-slate-600">{isDemoMode ? 'DEMO' : 'REAL'}</span>
            {isDemoMode && onResetDemoBalance && (
              <button onClick={onResetDemoBalance} className="text-[9px] text-slate-400 hover:text-amber-300 bg-slate-800 px-1 py-0.5 rounded border border-slate-700 transition-colors">↺</button>
            )}
          </div>

          {/* Cashier */}
          <button
            onClick={onOpenCashier}
            title="Cashier — deposit or withdraw"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/30 text-xs font-heading font-bold text-slate-200 hover:text-emerald-300 transition-colors whitespace-nowrap"
          >
            <Landmark className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden md:inline">Cashier</span>
          </button>

          {/* VIP */}
          <button
            onClick={onOpenVIP}
            title="VIP rewards"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/30 text-xs font-mono font-bold text-purple-300 transition-colors whitespace-nowrap"
          >
            <Crown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>{user?.vipTier || 'Bronze'}</span>
            {user?.accumulatedRakeback ? (
              <span className="bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded text-[9px] font-bold">
                ${user.accumulatedRakeback.toFixed(2)}
              </span>
            ) : null}
          </button>

          {/* REAL / DEMO toggle */}
          <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => { if (isDemoMode) onToggleDemoMode(); }}
              title="Real Mode"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold transition-all ${!isDemoMode ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-foreground'}`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span className="hidden xs:inline">REAL</span>
            </button>
            <button
              onClick={() => { if (!isDemoMode) onToggleDemoMode(); }}
              title="Demo Mode"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold transition-all ${isDemoMode ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-foreground'}`}
            >
              <Sparkles className="w-3 h-3" />
              <span className="hidden xs:inline">DEMO</span>
            </button>
          </div>

          {/* Chat */}
          <button
            onClick={onToggleTrollbox}
            title="Global chat"
            className={`p-2 rounded-xl border transition-colors ${isTrollboxOpen ? 'bg-primary text-slate-950 border-primary' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-foreground'}`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Support */}
          {onOpenSupport && (
            <button
              onClick={onOpenSupport}
              className="hidden sm:flex p-2 rounded-xl border bg-slate-900 text-blue-400 border-slate-800 hover:text-blue-300 hover:border-blue-500/40 transition-colors"
              title="Support"
            >
              <LifeBuoy className="w-4 h-4" />
            </button>
          )}

          {/* ── WALLET SECTION — always fully visible via dropdown ──── */}
          <WalletSection />

          {/* Hamburger for mobile */}
          <button
            onClick={() => setMobileMenuOpen(v => !v)}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            <div className="w-4 h-3.5 flex flex-col justify-between">
              <span className={`block h-0.5 bg-current rounded-full transition-all ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`block h-0.5 bg-current rounded-full transition-all ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 bg-current rounded-full transition-all ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* ── MOBILE SLIDE-DOWN MENU ───────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-3">
          {/* Game tabs grid */}
          <div className="grid grid-cols-5 gap-1.5">
            {GAMES.map(g => (
              <button
                key={g.id}
                onClick={() => { setActiveTab(g.id); setMobileMenuOpen(false); }}
                className={`flex flex-col items-center py-2.5 rounded-xl text-[10px] font-heading font-bold transition-all ${
                  activeTab === g.id ? g.active + ' shadow-md' : `bg-slate-900 border border-slate-800 ${g.color}`
                }`}
              >
                <span className="text-lg mb-0.5">{g.emoji}</span>
                {g.label}
              </button>
            ))}
          </div>

          {/* Balance + utilities row */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-xl text-[11px] font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${isDemoMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className={`font-bold ${isDemoMode ? 'text-amber-300' : 'text-primary'}`}>
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              {isDemoMode && onResetDemoBalance && (
                <button onClick={onResetDemoBalance} className="text-[9px] text-slate-400 hover:text-amber-300 bg-slate-800 px-1 py-0.5 rounded border border-slate-700">↺</button>
              )}
            </div>
            <button onClick={onOpenCashier} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-heading font-bold text-slate-200 transition-colors">
              <Landmark className="w-3.5 h-3.5 text-emerald-400" />Cashier
            </button>
            <button onClick={onOpenVIP} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs font-mono font-bold text-purple-300 transition-colors">
              <Crown className="w-3.5 h-3.5" />{user?.vipTier || 'Bronze'}
            </button>
            {onOpenSupport && (
              <button onClick={onOpenSupport} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-blue-400 transition-colors">
                <LifeBuoy className="w-3.5 h-3.5" />Support
              </button>
            )}
          </div>
        </div>
      )}
    </header>

    {/* ── MOBILE BOTTOM NAV ─────────────────────────────────────────────── */}
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/98 backdrop-blur-xl border-t border-slate-800/80 pb-safe shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.7)]">
      <div className="flex items-center justify-around px-1 py-1.5">
        {GAMES.slice(0, 2).map(g => (
          <button
            key={g.id}
            onClick={() => setActiveTab(g.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === g.id ? `${g.active} scale-105 shadow-sm` : `text-slate-500 ${g.color}`
            }`}
          >
            <span className="text-lg leading-none">{g.emoji}</span>
            <span className="text-[9px] font-heading font-bold">{g.label.toUpperCase()}</span>
          </button>
        ))}

        {/* Center Cashier FAB */}
        <div className="relative -top-4">
          <button
            onClick={onOpenCashier}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-400 via-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center shadow-2xl shadow-emerald-500/40 border-4 border-slate-950 transition-transform active:scale-95"
          >
            <Landmark className="w-6 h-6" />
          </button>
        </div>

        {GAMES.slice(2, 4).map(g => (
          <button
            key={g.id}
            onClick={() => setActiveTab(g.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === g.id ? `${g.active} scale-105 shadow-sm` : `text-slate-500 ${g.color}`
            }`}
          >
            <span className="text-lg leading-none">{g.emoji}</span>
            <span className="text-[9px] font-heading font-bold">{g.label.toUpperCase()}</span>
          </button>
        ))}

        <button
          onClick={onToggleTrollbox}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
            isTrollboxOpen ? 'text-primary scale-105' : 'text-slate-500'
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
