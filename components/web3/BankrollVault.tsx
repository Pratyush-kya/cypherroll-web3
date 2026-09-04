'use client';

import React, { useState } from 'react';
import { Landmark, TrendingUp, ShieldCheck, Coins, Lock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export default function BankrollVault() {
  const [stakeAmount, setStakeAmount] = useState<number>(100);
  const [userStaked, setUserStaked] = useState<number>(500);

  const totalVaultLiquidity = 1250000; // $1.25M
  const estimatedAPY = 19.4; // 19.4% APY based on GGR
  const dailyYield = ((stakeAmount * (estimatedAPY / 100)) / 365).toFixed(3);

  const handleStake = () => {
    if (stakeAmount <= 0) return;
    setUserStaked((prev) => prev + stakeAmount);
    setStakeAmount(100);
  };

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
              <p className="text-xs font-mono text-slate-400">Be the House: Underwrite casino bets & earn gross gaming revenue</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
              {estimatedAPY}% Real APY
            </span>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-xs font-mono text-slate-400 block uppercase">Total Vault Reserves</span>
            <span className="text-2xl font-heading font-black text-foreground">
              ${totalVaultLiquidity.toLocaleString()}
            </span>
            <span className="text-[10px] block font-mono text-slate-500 mt-1">Multi-sig Non-Custodial</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-xs font-mono text-slate-400 block uppercase">Your Active Staked</span>
            <span className="text-2xl font-heading font-black text-primary">
              ${userStaked.toLocaleString()}
            </span>
            <span className="text-[10px] block font-mono text-emerald-400 mt-1">
              +${((userStaked * (estimatedAPY / 100)) / 12).toFixed(2)} / month est.
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-xs font-mono text-slate-400 block uppercase">Max Bet Cap (1% Rule)</span>
            <span className="text-2xl font-heading font-black text-purple-400">
              ${(totalVaultLiquidity * 0.01).toLocaleString()}
            </span>
            <span className="text-[10px] block font-mono text-slate-500 mt-1">Kelly Criterion Enforcement</span>
          </div>
        </div>

        {/* Stake Controls */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
          <h3 className="text-sm font-heading font-bold text-slate-200 mb-3 flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            Deposit Liquidity to Earn Daily Payouts
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
              className="sm:col-span-4 w-full py-3.5 bg-primary hover:bg-amber-500 text-slate-950 font-heading font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20"
            >
              Deposit & Stake
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Estimated Daily Yield: <strong className="text-emerald-400">${dailyYield} USDC</strong></span>
            <span>No lockup • Withdraw anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
