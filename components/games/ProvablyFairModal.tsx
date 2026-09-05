'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Link2,
  Sparkles,
  Cpu,
  Copy,
  Check,
  ArrowRight,
  HelpCircle,
  Key,
  RotateCw,
  Hash,
  Binary,
  Flame,
  Dices,
} from 'lucide-react';
import { calculateDiceRoll, calculateCrashPoint, getDetailedGameProof, DetailedProof } from '@/lib/provably-fair';
import { VRFRoundReceipt } from '@/lib/web3/vrf-entropy';

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialServerSeed?: string;
  initialServerSeedHash?: string;
  initialClientSeed?: string;
  initialNonce?: number;
  initialGameType?: 'DICE' | 'CRASH';
  isDemoMode?: boolean;
  onSeedRotated?: (newHash: string, newClientSeed: string) => void;
}

export default function ProvablyFairModal({
  isOpen,
  onClose,
  initialServerSeed = '',
  initialServerSeedHash = '',
  initialClientSeed = 'client_seed_777',
  initialNonce = 1,
  initialGameType = 'DICE',
  isDemoMode = false,
  onSeedRotated,
}: ProvablyFairModalProps) {
  const [activeTab, setActiveTab] = useState<'VERIFIER' | 'SEEDS' | 'VRF'>('VERIFIER');
  const [serverSeed, setServerSeed] = useState(initialServerSeed);
  const [expectedServerSeedHash, setExpectedServerSeedHash] = useState(initialServerSeedHash);
  const [clientSeed, setClientSeed] = useState(initialClientSeed);
  const [nonce, setNonce] = useState(initialNonce);
  const [gameType, setGameType] = useState<'DICE' | 'CRASH'>(initialGameType);

  // Seed Rotation State
  const [activeServerSeedHash, setActiveServerSeedHash] = useState(initialServerSeedHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  const [newClientSeedInput, setNewClientSeedInput] = useState(initialClientSeed);
  const [isRotating, setIsRotating] = useState(false);
  const [rotationResult, setRotationResult] = useState<{ previousServerSeed?: string; newHash?: string } | null>(null);

  // Copy feedback state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // VRF state
  const [vrfReceipt, setVrfReceipt] = useState<VRFRoundReceipt | null>(null);
  const [isRequestingVRF, setIsRequestingVRF] = useState(false);
  const [vrfVerified, setVrfVerified] = useState<boolean | null>(null);

  // Update inputs whenever initial props change
  useEffect(() => {
    if (initialServerSeed) setServerSeed(initialServerSeed);
    if (initialServerSeedHash) {
      setExpectedServerSeedHash(initialServerSeedHash);
      setActiveServerSeedHash(initialServerSeedHash);
    }
    if (initialClientSeed) {
      setClientSeed(initialClientSeed);
      setNewClientSeedInput(initialClientSeed);
    }
    if (initialNonce) setNonce(initialNonce);
    if (initialGameType) setGameType(initialGameType);
  }, [initialServerSeed, initialServerSeedHash, initialClientSeed, initialNonce, initialGameType, isOpen]);

  // Real-time live mathematical calculation
  const proof: DetailedProof | null = useMemo(() => {
    if (!serverSeed.trim()) return null;
    try {
      return getDetailedGameProof(serverSeed.trim(), clientSeed.trim() || 'default_seed', Math.max(1, nonce), gameType);
    } catch {
      return null;
    }
  }, [serverSeed, clientSeed, nonce, gameType]);

  // Pre-image hash match verification
  const hashMatches = useMemo(() => {
    if (!proof || !expectedServerSeedHash.trim()) return null;
    return proof.serverSeedHash.toLowerCase() === expectedServerSeedHash.trim().toLowerCase();
  }, [proof, expectedServerSeedHash]);

  if (!isOpen) return null;

  // Copy helper
  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Load Example Presets for 1-Click instant testing
  const loadExample = (type: 'DICE' | 'CRASH') => {
    if (type === 'DICE') {
      setGameType('DICE');
      setServerSeed('4a6b2c89f1e0d375a28c4e5b9d0123456789abcdef0123456789abcdef012345');
      setExpectedServerSeedHash('e2b9c7dd5baef6423985bcf5653457193b2a26c4f0da9eb0f3b4998782a2daec');
      setClientSeed('cypher_lucky_player_777');
      setNonce(1);
    } else {
      setGameType('CRASH');
      setServerSeed('9f8e7d6c5b4a3210fedcba9876543210abcdef01234567890123456789abcdef');
      setExpectedServerSeedHash('f9a26388916d7a4696bc63cfb6d17b2b00195adfeef8246e7f82e38c4b787593');
      setClientSeed('cypher_rocket_squad_99');
      setNonce(4);
    }
  };

  // Rotate Seed Pair Handler
  const handleRotateSeeds = async () => {
    setIsRotating(true);
    setRotationResult(null);
    try {
      const res = await fetch('/api/games/provably-fair/rotate-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSeed: newClientSeedInput.trim(),
          isDemo: isDemoMode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRotationResult({
          previousServerSeed: data.previousServerSeed,
          newHash: data.newServerSeedHash,
        });
        setActiveServerSeedHash(data.newServerSeedHash);

        // Auto-load previous server seed into the verifier!
        if (data.previousServerSeed) {
          setServerSeed(data.previousServerSeed);
        }

        if (onSeedRotated) {
          onSeedRotated(data.newServerSeedHash, newClientSeedInput);
        }
      }
    } catch (err) {
      console.error('Seed rotation error:', err);
    } finally {
      setIsRotating(false);
    }
  };

  // VRF handlers
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0c1017] border border-emerald-500/30 rounded-2xl p-6 shadow-2xl shadow-emerald-950/40 max-h-[92vh] flex flex-col font-mono text-zinc-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
                <span>PROVABLY FAIR VERIFIER</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  100% MATHEMATICALLY TRANSPARENT
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Independent cryptographic proof that game outcomes were predetermined & unmanipulated
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-[#070a0e] p-1 rounded-xl border border-zinc-800 mb-5 text-xs font-bold">
          <button
            onClick={() => setActiveTab('VERIFIER')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-2 ${
              activeTab === 'VERIFIER'
                ? 'bg-emerald-500 text-black font-extrabold shadow-md shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>1-Click Round Verifier</span>
          </button>
          <button
            onClick={() => setActiveTab('SEEDS')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-2 ${
              activeTab === 'SEEDS'
                ? 'bg-emerald-500 text-black font-extrabold shadow-md shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <RotateCw className="w-4 h-4" />
            <span>Rotate & Reveal Seeds</span>
          </button>
          <button
            onClick={() => setActiveTab('VRF')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-2 ${
              activeTab === 'VRF'
                ? 'bg-purple-500 text-white font-extrabold shadow-md shadow-purple-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Chainlink VRF Oracle</span>
          </button>
        </div>

        {/* Tab 1: 1-Click Interactive Verifier */}
        {activeTab === 'VERIFIER' && (
          <div className="overflow-y-auto space-y-4 pr-1 flex-1">
            {/* Quick 1-Click Example Presets */}
            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Test 1-Click Verification Presets:</span>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => loadExample('DICE')}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-300 transition flex items-center gap-1 border border-zinc-700"
                >
                  <Dices className="w-3 h-3 text-cyan-400" />
                  <span>Dice Example</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadExample('CRASH')}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-300 transition flex items-center gap-1 border border-zinc-700"
                >
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>Crash Example</span>
                </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="space-y-3">
              {/* Game Type Selector */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                  Game Model
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGameType('DICE')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                      gameType === 'DICE'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-inner'
                        : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    <Dices className="w-4 h-4" />
                    <span>CypherDice (0.00 - 99.99)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameType('CRASH')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                      gameType === 'CRASH'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-inner'
                        : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    <Flame className="w-4 h-4" />
                    <span>CypherCrash (1.00x - 1,000,000x)</span>
                  </button>
                </div>
              </div>

              {/* Server Seed Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                    <Key className="w-3 h-3 text-emerald-400" />
                    <span>Revealed Server Seed (256-bit Hex)</span>
                  </label>
                  {serverSeed && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(serverSeed, 'serverSeed')}
                      className="text-[10px] text-zinc-500 hover:text-emerald-400 flex items-center gap-1"
                    >
                      {copiedField === 'serverSeed' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={serverSeed}
                  onChange={(e) => setServerSeed(e.target.value)}
                  placeholder="Paste revealed server seed hex to verify..."
                  className="w-full bg-[#070a0e] border border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-mono placeholder-zinc-600 outline-none transition"
                />
              </div>

              {/* Expected Server Seed Hash (Pre-commitment) */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-zinc-500" />
                  <span>Pre-Commitment Hash (SHA-256 published before bet)</span>
                </label>
                <input
                  type="text"
                  value={expectedServerSeedHash}
                  onChange={(e) => setExpectedServerSeedHash(e.target.value)}
                  placeholder="Optional: Paste the hash published before your bet to confirm pre-commitment..."
                  className="w-full bg-[#070a0e] border border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-zinc-300 font-mono placeholder-zinc-600 outline-none transition"
                />
              </div>

              {/* Client Seed & Nonce */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Client Seed (Player Controlled)
                  </label>
                  <input
                    type="text"
                    value={clientSeed}
                    onChange={(e) => setClientSeed(e.target.value)}
                    className="w-full bg-[#070a0e] border border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Nonce Counter
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={nonce}
                    onChange={(e) => setNonce(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#070a0e] border border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Live Verification Results & Explainer */}
            {proof ? (
              <div className="p-4 bg-zinc-900/80 border border-emerald-500/40 rounded-2xl space-y-3.5 mt-2 animate-in zoom-in-95 duration-150">
                {/* Result Hero Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">
                        Cryptographic Verification Result
                      </h4>
                      <p className="text-[10px] text-emerald-400 font-bold">100% Deterministic Mathematical Match</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 uppercase block">Exact Calculated Result</span>
                    <span className="text-2xl font-black text-emerald-400">
                      {gameType === 'DICE' ? proof.outcome.toFixed(2) : `${proof.outcome.toFixed(2)}x`}
                    </span>
                  </div>
                </div>

                {/* Pre-commitment Match Status */}
                {hashMatches !== null && (
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                      hashMatches
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                        : 'bg-red-950/60 border-red-500/50 text-red-300'
                    }`}
                  >
                    {hashMatches ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <p className="font-bold">PRE-COMMITMENT SHA-256 HASH VERIFIED</p>
                          <p className="text-[10px] text-zinc-400">
                            The server seed produces the exact hash published BEFORE you placed your bet. The casino could not have altered this outcome.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <div>
                          <p className="font-bold">HASH MISMATCH WARNING</p>
                          <p className="text-[10px] text-zinc-400">
                            Calculated hash ({proof.serverSeedHash.substring(0, 16)}...) does not match your entered pre-commitment hash.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Mathematical Step-by-Step Breakdown */}
                <div className="space-y-2 text-[11px] bg-[#070a0e] p-3.5 rounded-xl border border-zinc-800/80">
                  <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/60 pb-1.5">
                    <span className="font-bold text-zinc-300">1. Combined Message:</span>
                    <span className="font-mono text-cyan-400">{proof.stepByStep.message}</span>
                  </div>
                  <div className="text-zinc-400 border-b border-zinc-800/60 pb-1.5">
                    <span className="font-bold text-zinc-300 block mb-1">2. Computed HMAC-SHA256 (64 hex characters):</span>
                    <div className="font-mono text-[10px] bg-zinc-950 p-2 rounded border border-zinc-800 text-zinc-400 break-all">
                      <span className="text-emerald-400 font-bold bg-emerald-950/80 px-1 py-0.5 rounded">
                        {proof.subHash}
                      </span>
                      <span>{proof.hmacHex.substring(proof.subHash.length)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/60 pb-1.5">
                    <span className="font-bold text-zinc-300">3. Hex Conversion:</span>
                    <span className="font-mono text-amber-400">
                      0x{proof.subHash} = {proof.decimalValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400 pt-0.5">
                    <span className="font-bold text-zinc-300">4. Mapping Formula:</span>
                    <span className="font-mono text-emerald-400 font-bold">{proof.stepByStep.result}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500 bg-[#070a0e] rounded-2xl border border-dashed border-zinc-800 text-xs">
                <Binary className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                <p className="font-bold text-zinc-400">Awaiting Server Seed to Compute Mathematical Proof</p>
                <p className="text-[11px] mt-1 text-zinc-600">
                  Paste a revealed server seed above or click a "Test Preset" to see live cryptographic verification.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Rotate & Reveal Active Seeds */}
        {activeTab === 'SEEDS' && (
          <div className="overflow-y-auto space-y-4 pr-1 flex-1">
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-white flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>How Provably Fair Seed Rotation Works</span>
              </p>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Your bets are calculated using a <strong>Server Seed</strong> that is kept secret by the casino. However, the casino publicly commits to this seed in advance by showing you its <strong>SHA-256 Hash</strong>. Once you rotate seeds, the old secret server seed is revealed to you so you can verify that every past bet was mathematically predetermined and 100% fair.
              </p>
            </div>

            <div className="space-y-3">
              {/* Active Committed Hash */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                  Active Committed Server Seed Hash (Public SHA-256)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={activeServerSeedHash}
                    className="flex-1 bg-[#070a0e] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeServerSeedHash, 'activeHash')}
                    className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                  >
                    {copiedField === 'activeHash' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Set New Client Seed */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                  Customize Next Client Seed
                </label>
                <input
                  type="text"
                  value={newClientSeedInput}
                  onChange={(e) => setNewClientSeedInput(e.target.value)}
                  placeholder="Enter custom client seed..."
                  className="w-full bg-[#070a0e] border border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleRotateSeeds}
                disabled={isRotating}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRotating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Rotating Cryptographic Seed Pair...</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="w-4 h-4" />
                    <span>Rotate Seeds & Reveal Past Server Seed</span>
                  </>
                )}
              </button>

              {/* Revealed Previous Seed Banner */}
              {rotationResult && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Seed Pair Successfully Rotated!</span>
                  </div>
                  {rotationResult.previousServerSeed && (
                    <div className="pt-2 border-t border-emerald-500/20">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">
                        Revealed Past Server Seed (Auto-Loaded into Verifier):
                      </span>
                      <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                        <span className="font-mono text-emerald-400 text-[11px] break-all flex-1">
                          {rotationResult.previousServerSeed}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(rotationResult.previousServerSeed!, 'revSeed')}
                          className="text-zinc-400 hover:text-emerald-400"
                        >
                          {copiedField === 'revSeed' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('VERIFIER')}
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-bold pt-1"
                  >
                    <span>Jump to 1-Click Verifier with this seed</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Chainlink VRF v2.5 */}
        {activeTab === 'VRF' && (
          <div className="overflow-y-auto space-y-4 pr-1 flex-1">
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-purple-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>Chainlink VRF v2.5 Decentralized Consensus</span>
              </p>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                For players who prefer decentralized oracle entropy over commit-reveal, CypherRoll integrates <strong>Chainlink Verifiable Random Function (VRF)</strong> on Base and Arbitrum. Each random outcome is generated by an independent oracle network and mathematically verified on-chain.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRequestVRF}
              disabled={isRequestingVRF}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-purple-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isRequestingVRF ? 'Requesting VRF Oracle Entropy...' : 'Request On-Chain VRF Proof'}</span>
            </button>

            {vrfReceipt && (
              <div className="p-4 bg-zinc-900/80 border border-purple-500/40 rounded-xl space-y-2.5 text-xs font-mono">
                <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                  <span className="text-zinc-400">Oracle Coordinator:</span>
                  <span className="text-purple-300 truncate max-w-[200px]">{vrfReceipt.vrfCoordinator}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                  <span className="text-zinc-400">Random 256-bit Word:</span>
                  <span className="text-amber-400 truncate max-w-[200px]">{vrfReceipt.randomWord}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-1.5">
                  <span className="text-zinc-400">Derived Outcome:</span>
                  <span className="text-emerald-400 font-bold">{vrfReceipt.derivedOutcome.toFixed(2)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleVerifyVRF}
                  className="w-full mt-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-bold text-xs transition border border-zinc-700 flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verify On-Chain Cryptographic Integrity</span>
                </button>

                {vrfVerified === true && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Chainlink VRF Consensus Signature 100% Validated</span>
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
