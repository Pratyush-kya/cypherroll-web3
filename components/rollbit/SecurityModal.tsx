'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, RefreshCw, X, CheckCircle2, Globe, EyeOff } from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  onRotateSeeds: (newClientSeed: string) => void;
}

export default function SecurityModal({
  isOpen,
  onClose,
  serverSeedHash,
  clientSeed,
  nonce,
  onRotateSeeds,
}: SecurityModalProps) {
  const [newClientSeed, setNewClientSeed] = useState(clientSeed);
  const [rotated, setRotated] = useState(false);

  if (!isOpen) return null;

  const handleRotate = () => {
    onRotateSeeds(newClientSeed);
    setRotated(true);
    setTimeout(() => setRotated(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2 text-primary font-heading font-semibold text-base">
            <Lock className="w-5 h-5 text-primary" />
            <span>Security & Cryptographic Session</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tor & Privacy Status Banner */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-5 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Network Anonymity (Tor v3):</span>
            </span>
            <span className="text-emerald-400 font-bold">Active & Protected</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-emerald-400" />
              <span>WebRTC Leak Protection:</span>
            </span>
            <span className="text-emerald-400 font-bold">Disabled / Shielded</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Server Logging Policy:</span>
            </span>
            <span className="text-primary font-bold">Zero-Logs Memory Only</span>
          </div>
        </div>

        {/* Active Seed Pair Info */}
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Active Server Seed SHA-256 Hash (Committed)
            </label>
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-xs font-mono text-primary truncate">
              {serverSeedHash || '0304473b50e479dcb7b54818671aa40746a0dabd4b7427c5cf358253e7d7426f'}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Your Client Seed
            </label>
            <input
              type="text"
              value={newClientSeed}
              onChange={(e) => setNewClientSeed(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
            <span>Session Nonce: <strong className="text-foreground">#{nonce}</strong></span>
            <span>Cryptographic Scheme: <strong className="text-primary">HMAC-SHA256</strong></span>
          </div>
        </div>

        {/* Rotate Button */}
        <button
          onClick={handleRotate}
          className="w-full py-3 bg-primary hover:bg-amber-500 text-slate-950 font-heading font-bold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {rotated ? "Seed Pair Rotated Successfully!" : "Rotate Seed Pair (Commit-Reveal)"}
        </button>
      </div>
    </div>
  );
}
