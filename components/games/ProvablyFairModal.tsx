'use client';

import React, { useState } from 'react';
import { ShieldCheck, X, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { calculateDiceRoll, calculateCrashPoint } from '@/lib/provably-fair';

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialServerSeed?: string;
  initialClientSeed?: string;
  initialNonce?: number;
}

export default function ProvablyFairModal({
  isOpen,
  onClose,
  initialServerSeed = "",
  initialClientSeed = "client_seed_777",
  initialNonce = 1,
}: ProvablyFairModalProps) {
  const [serverSeed, setServerSeed] = useState(initialServerSeed);
  const [clientSeed, setClientSeed] = useState(initialClientSeed);
  const [nonce, setNonce] = useState(initialNonce);
  const [gameType, setGameType] = useState<'DICE' | 'CRASH'>('DICE');
  const [auditResult, setAuditResult] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleAudit = () => {
    if (!serverSeed.trim()) return;
    try {
      if (gameType === 'DICE') {
        const roll = calculateDiceRoll(serverSeed, clientSeed, nonce);
        setAuditResult(roll);
      } else {
        const crash = calculateCrashPoint(serverSeed, clientSeed, nonce);
        setAuditResult(crash);
      }
    } catch {
      setAuditResult(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2 text-primary font-heading font-semibold text-lg">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span>Cryptographic Fairness Auditor</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-4 font-body leading-relaxed">
          CypherRoll outcomes are generated via deterministic <strong>HMAC-SHA256</strong>. Input your round parameters to independently verify the outcome.
        </p>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              Secret Server Seed (Pre-image hex)
            </label>
            <input
              type="text"
              value={serverSeed}
              onChange={(e) => setServerSeed(e.target.value)}
              placeholder="e.g. 9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              Client Seed (User customizable)
            </label>
            <input
              type="text"
              value={clientSeed}
              onChange={(e) => setClientSeed(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Nonce Counter</label>
              <input
                type="number"
                value={nonce}
                onChange={(e) => setNonce(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Game Algorithm</label>
              <select
                value={gameType}
                onChange={(e) => setGameType(e.target.value as 'DICE' | 'CRASH')}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-primary"
              >
                <option value="DICE">CypherDice (0.00 - 99.99)</option>
                <option value="CRASH">CypherCrash (1.00x - ∞)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audit Button */}
        <button
          onClick={handleAudit}
          className="w-full mt-5 bg-primary hover:bg-amber-500 text-slate-950 font-heading font-bold text-sm py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <RefreshCw className="w-4 h-4" />
          Verify Outcome Mathematically
        </button>

        {/* Audit Result Display */}
        {auditResult !== null && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-emerald-500/40 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-xs font-mono">Audited Outcome:</span>
            </div>
            <span className="text-xl font-heading font-black text-emerald-400">
              {auditResult}
              {gameType === 'CRASH' ? 'x' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
