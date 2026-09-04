'use client';

import React, { useState } from 'react';
import { Landmark, ArrowDownLeft, ArrowUpRight, Copy, Check, X, ShieldAlert, QrCode } from 'lucide-react';

interface CashierModalProps {
  isOpen: boolean;
  onClose: () => void;
  userWallet: string;
  balance: number;
  onDepositSuccess: (amount: number) => void;
  onWithdrawSuccess: (amount: number) => void;
}

export default function CashierModal({
  isOpen,
  onClose,
  userWallet,
  balance,
  onDepositSuccess,
  onWithdrawSuccess,
}: CashierModalProps) {
  const [tab, setTab] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [amount, setAmount] = useState<number>(100);
  const [selectedNetwork, setSelectedNetwork] = useState<'SOL' | 'BASE' | 'ARB'>('SOL');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const depositAddress = selectedNetwork === 'SOL'
    ? 'CyphErRoLL111111111111111111111111111111111'
    : '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7';

  const handleCopy = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = () => {
    if (amount <= 0) return;
    if (tab === 'DEPOSIT') {
      onDepositSuccess(amount);
      onClose();
    } else {
      if (amount > balance) return;
      onWithdrawSuccess(amount);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2 text-foreground font-heading font-semibold text-base">
            <Landmark className="w-5 h-5 text-primary" />
            <span>Multi-Chain Cashier Vault</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4 font-heading text-xs font-bold">
          <button
            onClick={() => setTab('DEPOSIT')}
            className={`py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              tab === 'DEPOSIT'
                ? 'bg-primary text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-foreground'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Deposit Funds</span>
          </button>
          <button
            onClick={() => setTab('WITHDRAW')}
            className={`py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              tab === 'WITHDRAW'
                ? 'bg-cta text-white shadow-md shadow-purple-600/20'
                : 'text-slate-400 hover:text-foreground'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw</span>
          </button>
        </div>

        {/* Network Selector */}
        <div className="mb-4">
          <label className="block text-xs font-mono text-slate-400 mb-1">Select Network</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'SOL', label: 'Solana (SOL)' },
              { id: 'BASE', label: 'Base (USDC)' },
              { id: 'ARB', label: 'Arbitrum (USDC)' },
            ].map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelectedNetwork(n.id as any)}
                className={`py-2 px-3 rounded-lg text-xs font-mono border transition-all ${
                  selectedNetwork === n.id
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'DEPOSIT' ? (
          <div>
            {/* Deposit Address Box */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-4">
              <span className="text-[10px] font-mono text-slate-400 block uppercase mb-1">
                {selectedNetwork} Smart Contract Escrow Address
              </span>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs font-mono text-primary truncate max-w-[260px]">
                  {depositAddress}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Deposit Simulation */}
            <div className="mb-5">
              <label className="block text-xs font-mono text-slate-400 mb-1">Deposit Amount ($USDC)</label>
              <input
                type="number"
                min="10"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 10)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-base font-heading font-bold text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <button
              onClick={handleAction}
              className="w-full py-3.5 bg-primary hover:bg-amber-500 text-slate-950 font-heading font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20"
            >
              Simulate Instant On-Chain Deposit
            </button>
          </div>
        ) : (
          <div>
            {/* Withdraw Amount */}
            <div className="mb-4">
              <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                <span>Withdraw Amount ($USDC)</span>
                <span>Available: ${balance.toFixed(2)}</span>
              </div>
              <input
                type="number"
                min="10"
                max={balance}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 10)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-base font-heading font-bold text-foreground focus:outline-none focus:border-cta"
              />
            </div>

            <button
              onClick={handleAction}
              disabled={amount <= 0 || amount > balance}
              className="w-full py-3.5 bg-cta hover:bg-purple-600 disabled:opacity-40 text-white font-heading font-bold text-sm rounded-xl transition-all shadow-lg shadow-purple-600/20"
            >
              Submit Operator-Signed Payout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
