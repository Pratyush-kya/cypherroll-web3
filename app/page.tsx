'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/web3/Navbar';
import DiceGame from '@/components/games/DiceGame';
import CrashGame from '@/components/games/CrashGame';
import BankrollVault from '@/components/web3/BankrollVault';
import BlenderShowcaseStudio from '@/components/3d/BlenderShowcaseStudio';
import FAQSection from '@/components/rollbit/FAQSection';
import Trollbox from '@/components/rollbit/Trollbox';
import LiveBetsTicker from '@/components/rollbit/LiveBetsTicker';
import VIPRakebackModal from '@/components/rollbit/VIPRakebackModal';
import CashierModal from '@/components/rollbit/CashierModal';
import SecurityModal from '@/components/rollbit/SecurityModal';
import { useAuth } from '@/lib/web3/useAuth';
import { Sparkles, Box } from 'lucide-react';

export default function CasinoHome() {
  const [activeTab, setActiveTab] = useState<'DICE' | 'CRASH' | 'VAULT' | 'SHOWCASE'>('DICE');
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
  } = useAuth();

  const [balance, setBalance] = useState<number>(1000);
  const [vipTier, setVipTier] = useState<string>('Bronze');
  const [accumulatedRakeback, setAccumulatedRakeback] = useState<number>(0);
  const [totalWagered, setTotalWagered] = useState<number>(0);
  const [serverSeedHash, setServerSeedHash] = useState<string>('0304473b50e479dcb7b54818671aa40746a0dabd4b7427c5cf358253e7d7426f');
  const [clientSeed, setClientSeed] = useState<string>('player_lucky_seed');
  const [nonce, setNonce] = useState<number>(1);

  // Sync state when authenticated profile loads
  useEffect(() => {
    if (user) {
      setBalance(user.balance);
      setVipTier(user.vipTier);
      setAccumulatedRakeback(user.accumulatedRakeback);
      setTotalWagered(user.totalWagered);
    }
  }, [user]);

  // Modals state
  const [isCashierOpen, setIsCashierOpen] = useState(false);
  const [isVIPOpen, setIsVIPOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isTrollboxOpen, setIsTrollboxOpen] = useState(false);

  const handleBetPlaced = (rakebackEarned: number, updatedVip: string) => {
    setAccumulatedRakeback((prev) => parseFloat((prev + rakebackEarned).toFixed(4)));
    if (updatedVip) setVipTier(updatedVip);
  };

  const handleDeposit = (amount: number) => {
    setBalance((prev) => parseFloat((prev + amount).toFixed(2)));
  };

  const handleWithdraw = (amount: number) => {
    setBalance((prev) => parseFloat((prev - amount).toFixed(2)));
  };

  const handleClaimRakeback = () => {
    setBalance((prev) => parseFloat((prev + accumulatedRakeback).toFixed(2)));
    setAccumulatedRakeback(0);
  };

  const handleRotateSeeds = (newSeed: string) => {
    setClientSeed(newSeed);
    setNonce(1);
    setServerSeedHash(Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2));
  };

  const activeWallet = user?.wallet || (solanaConnected ? solanaPublicKey : evmAddress) || '';

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Multi-chain Navbar with Real Web3 Integration */}
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
        onOpenCashier={() => setIsCashierOpen(true)}
        onOpenVIP={() => setIsVIPOpen(true)}
        onOpenSecurity={() => setIsSecurityOpen(true)}
        onToggleTrollbox={() => setIsTrollboxOpen(!isTrollboxOpen)}
        isTrollboxOpen={isTrollboxOpen}
      />

      {/* Hero Headline */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-2 w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Multi-Chain Cryptographic Sessions • SIWE & SIWS Verified</span>
          </div>
          <button
            onClick={() => setActiveTab(activeTab === 'SHOWCASE' ? 'DICE' : 'SHOWCASE')}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-cyan-500/10 border border-cyan-500/40 text-xs font-mono text-cyan-300 hover:border-cyan-400 transition-all shadow-sm cursor-pointer"
          >
            <Box className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>{activeTab === 'SHOWCASE' ? '← Back to Games' : '✨ Open 3D Blender Studio'}</span>
          </button>
        </div>
        <h1 className="text-3xl md:text-5xl font-heading font-black tracking-tight text-foreground uppercase">
          Autonomous <span className="text-primary">Provably Fair</span> Gaming
        </h1>
      </div>

      {/* Main Game Stage */}
      <div className="max-w-7xl mx-auto px-4 py-4 w-full flex-1 flex items-center justify-center">
        {activeTab === 'DICE' && (
          <DiceGame
            userWallet={activeWallet}
            balance={balance}
            setBalance={setBalance}
            onBetPlaced={handleBetPlaced}
          />
        )}
        {activeTab === 'CRASH' && (
          <CrashGame
            userWallet={activeWallet}
            balance={balance}
            setBalance={setBalance}
            onBetPlaced={handleBetPlaced}
          />
        )}
        {activeTab === 'VAULT' && <BankrollVault />}
        {activeTab === 'SHOWCASE' && <BlenderShowcaseStudio />}
      </div>

      {/* Interactive FAQ Section */}
      <FAQSection />

      {/* Live Global Activity Ticker (Supabase Realtime Synced) */}
      <LiveBetsTicker />

      {/* Modals */}
      <CashierModal
        isOpen={isCashierOpen}
        onClose={() => setIsCashierOpen(false)}
        userWallet={activeWallet}
        balance={balance}
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
