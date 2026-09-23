'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/web3/Navbar';
import DiceGame from '@/components/games/DiceGame';
import CrashGame from '@/components/games/CrashGame';
import MinesGame from '@/components/games/MinesGame';
import PlinkoGame from '@/components/games/PlinkoGame';
import BankrollVault from '@/components/web3/BankrollVault';
import FAQSection from '@/components/rollbit/FAQSection';
import Trollbox from '@/components/rollbit/Trollbox';
import LiveBetsTicker from '@/components/rollbit/LiveBetsTicker';
import VIPRakebackModal from '@/components/rollbit/VIPRakebackModal';
import CashierModal from '@/components/rollbit/CashierModal';
import SecurityModal from '@/components/rollbit/SecurityModal';
import ProvablyFairModal from '@/components/games/ProvablyFairModal';
import { SupportModal } from "@/components/rollbit/SupportModal";
import { useAuth } from '@/lib/web3/useAuth';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { truncateHash } from '@/lib/utils';
import { Sparkles, ShieldCheck, Flame, Wallet, Dices, Rocket, Bomb, CircleDot, Landmark, KeyRound, CheckCircle2, ArrowRight } from 'lucide-react';

export default function CasinoHome() {
  const [activeTab, setActiveTab] = useState<'DICE' | 'CRASH' | 'MINES' | 'PLINKO' | 'VAULT'>('DICE');
  const {
    user,
    setUser,
    isAuthenticated,
    isAuthenticating,
    solanaConnected,
    solanaPublicKey,
    evmConnected,
    evmAddress,
    signInSolana,
    signInEVM,
    signOut,
    disconnectWallet,
    walletMismatch,
    switchWalletSession,
  } = useAuth();

  const { setVisible: setSolanaModalVisible } = useWalletModal();
  const [heroChain, setHeroChain] = useState<'SOL' | 'EVM'>('SOL');

  // Real vs Demo Mode state
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [realBalance, setRealBalance] = useState<number>(0);
  const [demoBalance, setDemoBalance] = useState<number>(1000);
  const [vipTier, setVipTier] = useState<string>('Bronze');
  const [accumulatedRakeback, setAccumulatedRakeback] = useState<number>(0);
  const [totalWagered, setTotalWagered] = useState<number>(0);
  const [serverSeedHash, setServerSeedHash] = useState<string>('0304473b50e479dcb7b54818671aa40746a0dabd4b7427c5cf358253e7d7426f');
  const [clientSeed, setClientSeed] = useState<string>('player_lucky_seed');
  const [nonce, setNonce] = useState<number>(1);

  // Load persisted demo balance on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cypher_demo_balance');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed > 0) setDemoBalance(parsed);
      }
    }
  }, []);

  // Sync state when authenticated profile loads
  useEffect(() => {
    if (user) {
      setRealBalance(user.balance);
      setVipTier(user.vipTier);
      setAccumulatedRakeback(user.accumulatedRakeback);
      setTotalWagered(user.totalWagered);
      setIsDemoMode(false); // Seamlessly switch to Real Mode when authenticated
    } else {
      setRealBalance(0);
      setIsDemoMode(true); // Default to Demo Mode for guest visitors
    }
  }, [user]);

  const activeBalance = isDemoMode ? demoBalance : realBalance;

  const handleSetBalance = (valOrUpdater: React.SetStateAction<number>) => {
    if (isDemoMode) {
      setDemoBalance((prev) => {
        const nextVal = typeof valOrUpdater === 'function' ? (valOrUpdater as any)(prev) : valOrUpdater;
        if (typeof window !== 'undefined') {
          localStorage.setItem('cypher_demo_balance', nextVal.toString());
        }
        return nextVal;
      });
    } else {
      setRealBalance(valOrUpdater);
    }
  };

  const handleResetDemoBalance = () => {
    setDemoBalance(1000);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cypher_demo_balance', '1000');
    }
  };

  // Modals state
  const [isCashierOpen, setIsCashierOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isVIPOpen, setIsVIPOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isProvablyFairOpen, setIsProvablyFairOpen] = useState(false);
  const [isTrollboxOpen, setIsTrollboxOpen] = useState(false);

  const handleBetPlaced = (rakebackEarned: number, updatedVip: string) => {
    if (!isDemoMode) {
      setAccumulatedRakeback((prev) => parseFloat((prev + rakebackEarned).toFixed(4)));
      if (updatedVip) setVipTier(updatedVip);
    }
  };

  const handleDeposit = (amount: number) => {
    setRealBalance((prev) => parseFloat((prev + amount).toFixed(2)));
  };

  const handleWithdraw = (amount: number) => {
    setRealBalance((prev) => parseFloat((prev - amount).toFixed(2)));
  };

  const handleClaimRakeback = async () => {
    try {
      const res = await fetch('/api/user/claim-rakeback', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setRealBalance(data.newBalance);
        setAccumulatedRakeback(0);
      }
    } catch (e) {
      console.error("Failed to claim rakeback:", e);
    }
  };

  const handleRotateSeeds = async (newSeed: string) => {
    try {
      const res = await fetch('/api/games/provably-fair/rotate-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSeed: newSeed,
          isDemo: isDemoMode,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setClientSeed(data.clientSeed);
        setNonce(data.nonce || 1);
        setServerSeedHash(data.newServerSeedHash);
        return;
      }
    } catch (e) {
      console.warn('Seed rotation fallback:', e);
    }
    setClientSeed(newSeed);
    setNonce(1);
  };

  const activeWallet = user?.wallet || (solanaConnected ? solanaPublicKey : evmAddress) || '';

  return (
    <main className="min-h-screen bg-[#07090e] text-slate-200 flex flex-col relative overflow-x-hidden pb-28 lg:pb-12">
      {/* Background Ambience */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        isAuthenticated={isAuthenticated}
        isAuthenticating={isAuthenticating}
        solanaConnected={solanaConnected}
        solanaPublicKey={solanaPublicKey}
        evmConnected={evmConnected}
        evmAddress={evmAddress}
        onSignInSolana={signInSolana}
        onSignInEVM={signInEVM}
        onSignOut={signOut}
        onDisconnectWallet={disconnectWallet}
        walletMismatch={walletMismatch}
        onSwitchWallet={switchWalletSession}
        onOpenCashier={() => setIsCashierOpen(true)}
        onOpenVIP={() => setIsVIPOpen(true)}
        onOpenSecurity={() => setIsSecurityOpen(true)}
        onOpenFairness={() => setIsProvablyFairOpen(true)}
        onToggleTrollbox={() => setIsTrollboxOpen(!isTrollboxOpen)}
        isTrollboxOpen={isTrollboxOpen}
        isDemoMode={isDemoMode}
        onToggleDemoMode={() => setIsDemoMode((prev) => !prev)}
        balance={activeBalance}
        onResetDemoBalance={handleResetDemoBalance}
        onOpenSupport={() => setIsSupportOpen(true)}
      />

      {/* Ambient Cyber Light Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-96 bg-gradient-to-b from-amber-500/10 via-purple-600/5 to-transparent pointer-events-none blur-3xl -z-10" />

      {/* ── HERO SECTION ────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 w-full text-center">
        {/* Provably Fair Trust Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/30 text-amber-300 text-[11px] font-mono mb-4 shadow-lg shadow-amber-500/10 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span className="font-bold tracking-wider uppercase">100% Provably Fair · Non-Custodial · Instant Settlement</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading font-black tracking-tight text-foreground uppercase mb-3 drop-shadow-md">
          AUTONOMOUS <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-purple-400 bg-clip-text text-transparent">PROVABLY FAIR</span> CASINO
        </h1>
        <p className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-400 font-mono mb-6">
          Bustabit & HMAC-SHA256 mathematical odds. Zero house tampering, non-custodial payouts on Solana & EVM.
        </p>

        {/* ── RESPONSIVE MULTI-CHAIN WALLET HUB (100% Visible, Never Clipped) ──── */}
        <div className="max-w-3xl mx-auto mb-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-xs font-heading font-bold text-slate-200 uppercase tracking-wider">Web3 Multi-Chain Gateway</span>
            </div>
            {/* Chain toggle buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setHeroChain('SOL')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  heroChain === 'SOL'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>◎ Solana</span>
              </button>
              <button
                onClick={() => setHeroChain('EVM')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  heroChain === 'EVM'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>⬡ EVM (Base/ETH)</span>
              </button>
            </div>
          </div>

          {/* Dynamic Active Chain Panel — Full width, no clipping */}
          {heroChain === 'SOL' ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/80 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3 text-left w-full sm:w-auto">
                <div className="w-10 h-10 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-xl shrink-0">
                  👻
                </div>
                <div>
                  <div className="text-sm font-heading font-bold text-white flex items-center gap-2">
                    <span>Phantom / Solflare</span>
                    {solanaConnected && (
                      <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.2 rounded-full">
                        Connected
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 truncate max-w-[240px] sm:max-w-xs">
                    {solanaConnected && solanaPublicKey ? truncateHash(solanaPublicKey, 8, 8) : 'Solana High-Speed Layer 1'}
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-auto flex items-center gap-2 shrink-0">
                {solanaConnected && solanaPublicKey ? (
                  <button
                    onClick={signInSolana}
                    disabled={isAuthenticating}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-heading font-black text-xs rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isAuthenticating ? 'Signing...' : 'Sign In with Solana'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setSolanaModalVisible(true)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-heading font-black text-xs rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Connect Phantom</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <ConnectButton.Custom>
              {({ account, chain: evmChain, openConnectModal, mounted }) => {
                const connected = mounted && account && evmChain;
                return (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/80 border border-purple-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-3 text-left w-full sm:w-auto">
                      <div className="w-10 h-10 rounded-xl bg-amber-900/30 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
                        🦊
                      </div>
                      <div>
                        <div className="text-sm font-heading font-bold text-white flex items-center gap-2">
                          <span>MetaMask / Base / Coinbase</span>
                          {connected && (
                            <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.2 rounded-full">
                              {evmChain.name}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate max-w-[240px] sm:max-w-xs">
                          {connected ? truncateHash(account.address, 8, 8) : 'EVM Smart Contract Layer 2 & Mainnet'}
                        </div>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto flex items-center gap-2 shrink-0">
                      {connected ? (
                        <button
                          onClick={signInEVM}
                          disabled={isAuthenticating}
                          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-heading font-black text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>{isAuthenticating ? 'Signing...' : 'Sign In with EVM'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={openConnectModal}
                          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-heading font-black text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>Connect MetaMask</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              }}
            </ConnectButton.Custom>
          )}
        </div>

        {/* ── QUICK GAME SWITCHER CARDS ───────────────────────────── */}
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-6">
          {[
            { id: 'DICE' as const, name: 'CypherDice', rtp: '98% RTP', icon: '🎲', border: 'hover:border-amber-500/50', activeBg: 'bg-amber-500/15 border-amber-500 text-amber-300' },
            { id: 'CRASH' as const, name: 'CypherCrash', rtp: 'Multiplayer', icon: '🚀', border: 'hover:border-purple-500/50', activeBg: 'bg-purple-500/15 border-purple-500 text-purple-300' },
            { id: 'MINES' as const, name: 'CypherMines', rtp: '5×5 Matrix', icon: '💎', border: 'hover:border-emerald-500/50', activeBg: 'bg-emerald-500/15 border-emerald-500 text-emerald-300' },
            { id: 'PLINKO' as const, name: 'CypherPlinko', rtp: 'Up to 1000×', icon: '🎯', border: 'hover:border-cyan-500/50', activeBg: 'bg-cyan-500/15 border-cyan-500 text-cyan-300' },
            { id: 'VAULT' as const, name: 'Bankroll LP', rtp: 'Earn Yield', icon: '🏦', border: 'hover:border-slate-500/50', activeBg: 'bg-slate-700/40 border-slate-400 text-white' },
          ].map(game => (
            <button
              key={game.id}
              onClick={() => setActiveTab(game.id)}
              className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
                activeTab === game.id
                  ? `${game.activeBg} shadow-lg scale-[1.02]`
                  : `bg-slate-900/80 border-slate-800 text-slate-400 ${game.border} hover:bg-slate-800/60`
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xl">{game.icon}</span>
                <span className="text-[9px] font-mono uppercase bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
                  {game.rtp}
                </span>
              </div>
              <div className="text-xs font-heading font-black tracking-wide">{game.name}</div>
            </button>
          ))}
        </div>
      </div>

      {isDemoMode && (
        <div className="max-w-7xl mx-auto px-6 md:px-8 w-full mb-4">
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-amber-300 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
              <span className="font-bold uppercase tracking-wider text-sm">Demo Mode Active:</span>
              <span className="text-slate-300 hidden sm:block">
                Playing with free virtual credits (${demoBalance.toFixed(2)} DEMO). Provably fair math active, no real money at risk.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetDemoBalance}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-xs font-bold transition-colors"
              >
                Reset Credits
              </button>
              {isAuthenticated ? (
                <button
                  onClick={() => setIsDemoMode(false)}
                  className="px-4 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition-colors hover:bg-emerald-400 shadow-md shadow-emerald-500/30"
                >
                  Switch to Real Mode
                </button>
              ) : (
                <span className="text-slate-400 text-xs hidden md:inline">Connect wallet for Real Mode</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-4 w-full flex-1 flex items-center justify-center">
        {activeTab === 'DICE' && (
          <DiceGame
            userWallet={activeWallet}
            balance={activeBalance}
            setBalance={handleSetBalance}
            onBetPlaced={handleBetPlaced}
            isDemoMode={isDemoMode}
          />
        )}
        {activeTab === 'CRASH' && (
          <CrashGame
            userWallet={activeWallet}
            balance={activeBalance}
            setBalance={handleSetBalance}
            onBetPlaced={handleBetPlaced}
            isDemoMode={isDemoMode}
          />
        )}
        {activeTab === 'MINES' && (
          <MinesGame
            userWallet={activeWallet}
            balance={activeBalance}
            setBalance={handleSetBalance}
            onBetPlaced={handleBetPlaced}
            isDemoMode={isDemoMode}
          />
        )}
        {activeTab === 'PLINKO' && (
          <PlinkoGame
            userWallet={activeWallet}
            balance={activeBalance}
            setBalance={handleSetBalance}
            onBetPlaced={handleBetPlaced}
            isDemoMode={isDemoMode}
          />
        )}
        {activeTab === 'VAULT' && <BankrollVault />}
      </div>

      <FAQSection />

      <LiveBetsTicker />

      {isSupportOpen && <SupportModal onClose={() => setIsSupportOpen(false)} />}
      
      <CashierModal
        isOpen={isCashierOpen}
        onClose={() => setIsCashierOpen(false)}
        userWallet={activeWallet}
        balance={realBalance}
        onDepositSuccess={handleDeposit}
        onWithdrawSuccess={handleWithdraw}
      />

      <VIPRakebackModal
        isOpen={isVIPOpen}
        onClose={() => setIsVIPOpen(false)}
        vipTier={vipTier}
        totalWagered={totalWagered}
        accumulatedRakeback={accumulatedRakeback}
        onClaim={handleClaimRakeback}
      />

      <SecurityModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
        serverSeedHash={serverSeedHash}
        clientSeed={clientSeed}
        nonce={nonce}
        onRotateSeeds={handleRotateSeeds}
        onOpenFairness={() => setIsProvablyFairOpen(true)}
      />

      <ProvablyFairModal
        isOpen={isProvablyFairOpen}
        onClose={() => setIsProvablyFairOpen(false)}
        initialServerSeedHash={serverSeedHash}
        initialClientSeed={clientSeed}
        initialNonce={nonce}
        initialGameType={activeTab === 'CRASH' ? 'CRASH' : 'DICE'}
        isDemoMode={isDemoMode}
        onSeedRotated={(newHash, newClientSeed) => {
          setServerSeedHash(newHash);
          setClientSeed(newClientSeed);
          setNonce(1);
        }}
      />

      <Trollbox
        isOpen={isTrollboxOpen}
        onClose={() => setIsTrollboxOpen(false)}
        userWallet={activeWallet}
        userVip={vipTier}
      />
    </main>
  );
}
