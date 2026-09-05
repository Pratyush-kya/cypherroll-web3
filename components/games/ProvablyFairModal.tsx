'use client';

import React, { useState } from 'react';
import { ShieldCheck, X, RefreshCw, CheckCircle2, AlertTriangle, Link2, Sparkles, Cpu } from 'lucide-react';
import { calculateDiceRoll, calculateCrashPoint } from '@/lib/provably-fair';
import { VRFRoundReceipt } from '@/lib/web3/vrf-entropy';

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
  const [activeMode, setActiveMode] = useState<'HMAC' | 'VRF'>('HMAC');
  const [serverSeed, setServerSeed] = useState(initialServerSeed);
  const [clientSeed, setClientSeed] = useState(initialClientSeed);
  const [nonce, setNonce] = useState(initialNonce);
  const [gameType, setGameType] = useState<'DICE' | 'CRASH'>('DICE');
  const [auditResult, setAuditResult] = useState<number | null>(null);

  // VRF state
  const [vrfReceipt, setVrfReceipt] = useState<VRFRoundReceipt | null>(null);
  const [isRequestingVRF, setIsRequestingVRF] = useState(false);
  const [vrfVerified, setVrfVerified] = useState<boolean | null>(null);

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

  const handleRequestVRF = async () => {
    setIsRequestingVRF(true);
    setVrfVerified(null);
    try {
      const res = await fetch('/api/games/vrf/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientSeed, nonce, chain: 'Base' }),
      });
      const data = await res.json();
      if (data.receipt) {
        setVrfReceipt(data.receipt);
      }
    } catch (err) {
      console.error('Failed to request VRF proof:', err);
    } finally {
      setIsRequestingVRF(false);
    }
  };

  const handleVerifyVRF = async () => {
    if (!vrfReceipt) return;
    try {
      const res = await fetch('/api/games/vrf/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt: vrfReceipt }),
      });
      const data = await res.json();
      setVrfVerified(data.verified === true);
    } catch {
      setVrfVerified(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl overflow-hidden">
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

        {/* Mode Selector */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4 text-xs font-mono">
          <button
            onClick={() => setActiveMode('HMAC')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              activeMode === 'HMAC' ? 'bg-primary text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            HMAC-SHA256 Commit-Reveal
          </button>
          <button
            onClick={() => setActiveMode('VRF')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeMode === 'VRF' ? 'bg-cta text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Chainlink VRF v2.5</span>
          </button>
        </div>

        {activeMode === 'HMAC' ? (
          <>
            <p className="text-xs text-muted-foreground mb-4 font-body leading-relaxed">
              CypherRoll outcomes are generated via deterministic <strong>HMAC-SHA256</strong>. Input your round parameters to independently verify the outcome.
            </p>

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
                  <label className="block text-xs font-mono text-slate-400 mb-1">Game Model</label>
                  <select
                    value={gameType}
                    onChange={(e) => setGameType(e.target.value as 'DICE' | 'CRASH')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-primary"
                  >
                    <option value="DICE">CypherDice (0 - 100)</option>
                    <option value="CRASH">CypherCrash (1.00x+)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleAudit}
                className="w-full mt-2 py-2.5 bg-primary hover:bg-amber-400 text-slate-950 font-heading font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Verify Mathematical Outcome</span>
              </button>

              {auditResult !== null && (
                <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-emerald-500/40 flex items-center justify-between animate-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cryptographic Verification Passed</span>
                  </div>
                  <div className="font-heading font-bold text-lg text-primary">
                    {gameType === 'DICE' ? auditResult.toFixed(2) : `${auditResult.toFixed(2)}x`}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-body leading-relaxed">
              Decentralized On-Chain Verifiable Randomness via <strong>Chainlink VRF v2.5</strong> (Base / Arbitrum). Randomness is generated by decentralized oracle consensus with zero operator trust.
            </p>

            <button
              onClick={handleRequestVRF}
              disabled={isRequestingVRF}
              className="w-full py-2.5 bg-cta hover:bg-purple-600 text-white font-heading font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isRequestingVRF ? 'Requesting VRF Randomness...' : 'Request On-Chain VRF Proof'}</span>
            </button>

            {vrfReceipt && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-[11px] font-mono">
                <div className="flex justify-between border-b border-slate-850 pb-1">
                  <span className="text-slate-400">VRF Coordinator:</span>
                  <span className="text-purple-300 truncate max-w-[200px]">{vrfReceipt.vrfCoordinator}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850 pb-1">
                  <span className="text-slate-400">Random Word (256-bit):</span>
                  <span className="text-amber-400 truncate max-w-[200px]">{vrfReceipt.randomWord}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850 pb-1">
                  <span className="text-slate-400">Derived Outcome:</span>
                  <span className="text-primary font-bold">{vrfReceipt.derivedOutcome.toFixed(2)}</span>
                </div>

                <button
                  onClick={handleVerifyVRF}
                  className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg font-mono text-xs transition-colors border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verify VRF Proof Integrity</span>
                </button>

                {vrfVerified === true && (
                  <div className="p-2 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>On-Chain VRF Cryptographic Integrity 100% Verified</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
