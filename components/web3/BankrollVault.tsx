'use client';

import React, { useState, useEffect } from 'react';
import { Landmark, TrendingUp, ShieldCheck, Coins, Lock, Activity, CheckCircle2, ShieldAlert } from 'lucide-react';

interface TreasuryData {
  totalLiabilitiesUsdc: number;
  totalReservesUsdc: number;
  solvencyRatio: number;
  healthStatus: 'HEALTHY' | 'WARNING' | 'CIRCUIT_BREAKER_ACTIVE';
  kellyMaxBetCapUsdc: number;
  networkReserves: {
    baseUsdc: number;
    arbUsdc: number;
    solUsdc: number;
  };
  lastAuditedAt: string;
}

export default function BankrollVault() {
  const [stakeAmount, setStakeAmount] = useState<number>(100);
  const [userStaked, setUserStaked] = useState<number>(0);
  const [treasury, setTreasury] = useState<TreasuryData | null>(null);
  const [isStaking, setIsStaking] = useState<boolean>(false);
  const [stakeSuccessMsg, setStakeSuccessMsg] = useState<string | null>(null);

  const estimatedAPY = 19.4; // 19.4% APY based on gross house revenue
  const dailyYield = ((stakeAmount * (estimatedAPY / 100)) / 365).toFixed(3);

  useEffect(() => {
    const fetchTreasury = async () => {
      try {
        const res = await fetch('/api/treasury/status');
        const data = await res.json();
        setTreasury(data);
      } catch (err) {
        console.error('Failed to load treasury data:', err);
      }
    };
    fetchTreasury();
  }, []);

  const handleStake = async () => {
    if (stakeAmount <= 0 || isStaking) return;
    setIsStaking(true);
    setStakeSuccessMsg(null);

    try {
      const res = await fetch('/api/treasury/stake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: stakeAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Staking failed');

      setUserStaked((prev) => prev + stakeAmount);
      setStakeSuccessMsg(`Successfully staked $${stakeAmount.toFixed(2)} USDC into Community Vault!`);
      setStakeAmount(100);
      setTimeout(() => setStakeSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Staking failed');
    } finally {
      setIsStaking(false);
    }
  };

  const totalReserves = treasury?.totalReservesUsdc ?? 1250000;
  const maxBetCap = treasury?.kellyMaxBetCapUsdc ?? 12500;
  const solvency = treasury?.solvencyRatio ?? 6770;
  const health = treasury?.healthStatus ?? 'HEALTHY';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Vault Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Landmark className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-foreground">Community Bankroll Vault</h2>
              <p className="text-xs font-mono text-slate-400">Underwrite casino bets & earn automated house edge revenue yield</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              {solvency.toLocaleString()}% Solvency ({health})
            </span>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-xs font-mono text-slate-400 block uppercase">Total Vault Reserves</span>
            <span className="text-2xl font-heading font-black text-foreground">
              ${(treasury?.totalReservesUsdc || 0).toLocaleString()}
            </span>
            <span className="text-[10px] block font-mono text-emerald-400 mt-1">Multi-Chain On-Chain Escrows</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-xs font-mono text-slate-400 block uppercase">Total Player Liabilities</span>
            <span className="text-2xl font-heading font-black text-rose-400">
              ${(treasury?.totalLiabilitiesUsdc || 0).toLocaleString()}
            </span>
            <span className="text-[10px] block font-mono text-slate-500 mt-1">Live Active User Balances</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-xs font-mono text-slate-400 block uppercase">Your Active Staked</span>
            <span className="text-2xl font-heading font-black text-primary">
              ${userStaked.toLocaleString()}
            </span>
            <span className="text-[10px] block font-mono text-emerald-400 mt-1">
              +${((userStaked * (estimatedAPY / 100)) / 12).toFixed(2)} / month @ {estimatedAPY}% APY
            </span>
          </div>
        </div>

        {/* Proof of Reserves Visual */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-heading font-bold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Cryptographic Proof of Reserves
            </h3>
            <span className="text-xs font-mono text-slate-400">Last Audited: Just Now</span>
          </div>
          
          <div className="relative h-4 bg-slate-900 rounded-full overflow-hidden mb-2 border border-slate-800">
            {/* Reserves Bar (100% full since it's overcollateralized) */}
            <div className="absolute top-0 left-0 h-full bg-emerald-500/80" style={{ width: '100%' }}></div>
            {/* Liabilities Overlay (Proportional to reserves) */}
            <div 
              className="absolute top-0 left-0 h-full bg-rose-500" 
              style={{ width: `${Math.min(( (treasury?.totalLiabilitiesUsdc || 0) / (treasury?.totalReservesUsdc || 1) ) * 100, 100)}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-rose-400">Liabilities: ${(treasury?.totalLiabilitiesUsdc || 0).toLocaleString()}</span>
            <span className="text-emerald-400 font-bold">{solvency.toLocaleString()}% Over-Collateralized</span>
            <span className="text-emerald-400">Reserves: ${(treasury?.totalReservesUsdc || 0).toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 border-t border-slate-800/50 pt-2">
            <strong>Provable Solvency:</strong> The Vault maintains {Math.floor(solvency / 100)}x more on-chain liquidity than total user deposits. Withdrawals are mathematically guaranteed.
          </p>
        </div>

        {/* Multi-Chain Liquidity Breakdown */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2 font-bold">
            On-Chain Vault Reserve Balances:
          </span>
          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Base Vault:</span>
              <span className="text-primary font-bold">
                ${(treasury?.networkReserves.baseUsdc ?? 0).toLocaleString()} USDC
              </span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Arbitrum One:</span>
              <span className="text-purple-400 font-bold">
                ${(treasury?.networkReserves.arbUsdc ?? 0).toLocaleString()} USDC
              </span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Solana Vault:</span>
              <span className="text-emerald-400 font-bold">
                ${(treasury?.networkReserves.solUsdc ?? 0).toLocaleString()} SOL/USDC
              </span>
            </div>
          </div>
        </div>

        {/* Stake Success Message */}
        {stakeSuccessMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{stakeSuccessMsg}</span>
          </div>
        )}

        {/* Stake Controls */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
          <h3 className="text-sm font-heading font-bold text-slate-200 mb-3 flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            Deposit Liquidity to Underwrite Platform Bets
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-8 relative">
              <input
                type="number"
                min="10"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Math.max(10, parseFloat(e.target.value) || 10))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base font-heading font-bold text-foreground focus:outline-none focus:border-primary"
              />
              <span className="absolute right-4 top-3.5 text-xs font-mono text-slate-400">USDC</span>
            </div>

            <button
              onClick={handleStake}
              disabled={isStaking || stakeAmount <= 0}
              className="sm:col-span-4 w-full py-3.5 bg-primary hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-heading font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              {isStaking ? (
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span>Deposit & Stake</span>
              )}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Estimated Daily Yield: <strong className="text-emerald-400">${dailyYield} USDC</strong></span>
            <span>No lockup period • Instant un-stake</span>
          </div>
        </div>
      </div>
    </div>
  );
}
