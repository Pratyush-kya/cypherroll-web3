'use client';

import React, { useState } from 'react';
import { Award, Crown, X, Sparkles, CheckCircle2, TrendingUp, Gift } from 'lucide-react';

interface VIPRakebackModalProps {
  isOpen: boolean;
  onClose: () => void;
  vipTier: string;
  totalWagered: number;
  accumulatedRakeback: number;
  onClaim: () => void;
}

const TIERS = [
  { name: 'Bronze', req: 0, rakebackPct: '10%' },
  { name: 'Silver', req: 500, rakebackPct: '12.5%' },
  { name: 'Gold', req: 2500, rakebackPct: '15%' },
  { name: 'Platinum', req: 10000, rakebackPct: '20%' },
  { name: 'Diamond', req: 50000, rakebackPct: '25%' },
];

export default function VIPRakebackModal({
  isOpen,
  onClose,
  vipTier,
  totalWagered,
  accumulatedRakeback,
  onClaim,
}: VIPRakebackModalProps) {
  const [claimed, setClaimed] = useState(false);

  if (!isOpen) return null;

  const currentTierIndex = TIERS.findIndex((t) => t.name.toLowerCase() === vipTier.toLowerCase());
  const nextTier = TIERS[currentTierIndex + 1] || null;
  const currentTierReq = TIERS[currentTierIndex]?.req || 0;
  const nextTierReq = nextTier?.req || 50000;

  const progress = nextTier
    ? Math.min(100, Math.max(0, ((totalWagered - currentTierReq) / (nextTierReq - currentTierReq)) * 100))
    : 100;

  const handleClaimClick = () => {
    if (accumulatedRakeback <= 0) return;
    onClaim();
    setClaimed(true);
    setTimeout(() => setClaimed(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2 text-primary font-heading font-semibold text-lg">
            <Crown className="w-5 h-5 text-primary" />
            <span>VIP Rewards & Rakeback Hub</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Tier Banner */}
        <div className="bg-gradient-to-r from-amber-500/20 via-purple-600/20 to-slate-900 border border-amber-500/30 p-5 rounded-xl mb-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">Current VIP Status</span>
            <div className="text-2xl font-heading font-black text-primary flex items-center gap-2">
              <span>{vipTier} Level</span>
              <Award className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-mono text-slate-300 mt-1 block">
              Total Wagered: ${totalWagered.toLocaleString()} USDC
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">Rakeback Rate</span>
            <span className="text-xl font-heading font-black text-purple-400">
              {TIERS[currentTierIndex]?.rakebackPct || '15%'}
            </span>
          </div>
        </div>

        {/* Level Progression Bar */}
        {nextTier && (
          <div className="mb-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs font-mono mb-2">
              <span className="text-slate-400">Progress to {nextTier.name}</span>
              <span className="text-primary font-bold">{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1.5">
              <span>${totalWagered.toLocaleString()}</span>
              <span>${nextTierReq.toLocaleString()} target</span>
            </div>
          </div>
        )}

        {/* Claimable Rakeback Vault Card */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <Gift className="w-5 h-5 text-cta" />
            </div>
            <div>
              <span className="text-xs font-mono text-slate-400 block uppercase">Unclaimed Rakeback</span>
              <span className="text-2xl font-heading font-black text-emerald-400">
                ${accumulatedRakeback.toFixed(2)} USDC
              </span>
            </div>
          </div>

          <button
            onClick={handleClaimClick}
            disabled={accumulatedRakeback <= 0}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-heading font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20"
          >
            {claimed ? "Claimed!" : "Claim Now"}
          </button>
        </div>

        {/* Tier Benefits Summary */}
        <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px]">
          {TIERS.map((t, idx) => (
            <div
              key={t.name}
              className={`p-2 rounded-lg border ${
                idx <= currentTierIndex
                  ? 'bg-amber-500/10 border-amber-500/30 text-primary font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              <div>{t.name}</div>
              <div className="text-[9px] mt-0.5">{t.rakebackPct}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
