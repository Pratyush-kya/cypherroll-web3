'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/web3/Navbar';
import DiceGame from '@/components/games/DiceGame';
import CrashGame from '@/components/games/CrashGame';
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
import { Sparkles } from 'lucide-react';

export default function CasinoHome() {
  const [activeTab, setActiveTab] = useState<'DICE' | 'CRASH' | 'VAULT'>('DICE');
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

      <div className="max-w-7xl mx-auto px-6 md:px-8 pt-12 pb-8 w-full text-center">
        <h1 className="text-4xl md:text-6xl font-heading font-black tracking-tight text-foreground uppercase mb-8 drop-shadow-sm mt-4">
          Autonomous <span className="text-primary">Provably Fair</span> Gaming
        </h1>
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
