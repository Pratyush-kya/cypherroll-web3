'use client';

import React, { useState } from 'react';
import { Landmark, ArrowDownLeft, ArrowUpRight, Copy, Check, X, ShieldAlert, ShieldCheck, Key, CheckCircle2, AlertCircle, FileCode } from 'lucide-react';
import { truncateHash } from '@/lib/utils';

interface CashierModalProps {
  isOpen: boolean;
  onClose: () => void;
  userWallet: string;
  balance: number;
  onDepositSuccess: (amount: number) => void;
  onWithdrawSuccess: (amount: number) => void;
}

interface WithdrawalVoucher {
  signature?: string;
  deadline?: string;
  nonce?: number;
  operatorSigner?: string;
  contractAddress?: string;
  tokenAddress?: string;
  txHash?: string;
  amount: number;
  network: string;
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
  const [amount, setAmount] = useState<number>(50);
  const [selectedNetwork, setSelectedNetwork] = useState<'SOL' | 'BASE' | 'ARB'>('BASE');
  const [copied, setCopied] = useState(false);
  const [copiedSig, setCopiedSig] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<WithdrawalVoucher | null>(null);
  const [txHashInput, setTxHashInput] = useState<string>('');
  const [showTxHashField, setShowTxHashField] = useState<boolean>(false);

  if (!isOpen) return null;

  const depositAddress = selectedNetwork === 'SOL'
    ? 'CyphErRoLL111111111111111111111111111111111'
    : selectedNetwork === 'ARB'
      ? '0x415b3060d4bA0A7f1740924970425a1B60a0f027'
      : '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7';

  const handleCopy = (text: string, setFn: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  const handleDeposit = async () => {
    if (amount <= 0) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/cashier/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: userWallet,
          amount,
          network: selectedNetwork,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deposit failed');

      onDepositSuccess(amount);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Deposit error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyTxHash = async () => {
    if (!txHashInput.trim()) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/cashier/verify-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: txHashInput.trim(),
          network: selectedNetwork,
          walletAddress: userWallet,
          amount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deposit verification failed');

      onDepositSuccess(data.amount);
      setTxHashInput('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (amount <= 0 || amount > balance) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/cashier/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: userWallet,
          amount,
          network: selectedNetwork,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Withdrawal failed');

      onWithdrawSuccess(amount);
      setVoucher(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Withdrawal error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2 text-foreground font-heading font-semibold text-base">
            <Landmark className="w-5 h-5 text-primary" />
            <span>Non-Custodial Cashier Vault</span>
          </div>
          <button
            onClick={() => {
              setVoucher(null);
              onClose();
            }}
            className="text-slate-400 hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compliance & AML Shield Badge */}
        <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl mb-4 text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Automated AML & OFAC Sanctions Oracle Active</span>
          </div>
          <span className="text-emerald-400 font-bold">100% Non-Custodial</span>
        </div>

        {/* Tab Switcher */}
        {!voucher && (
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4 font-heading text-xs font-bold">
            <button
              onClick={() => {
                setTab('DEPOSIT');
                setErrorMsg(null);
              }}
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
              onClick={() => {
                setTab('WITHDRAW');
                setErrorMsg(null);
              }}
              className={`py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                tab === 'WITHDRAW'
                  ? 'bg-cta text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-400 hover:text-foreground'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Withdraw (EIP-712)</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Voucher Success Display */}
        {voucher ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="font-heading text-sm font-bold text-emerald-300 block">
                  Withdrawal Authorized & Signed!
                </span>
                <span className="text-xs font-mono text-slate-400">
                  ${voucher.amount.toFixed(2)} USDC deducted • Nonce #{voucher.nonce}
                </span>
              </div>
            </div>

            {voucher.signature ? (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400 flex items-center gap-1.5 font-bold">
                    <Key className="w-3.5 h-3.5 text-primary" />
                    <span>EIP-712 Signature Voucher</span>
                  </span>
                  <button
                    onClick={() => handleCopy(voucher.signature || '', setCopiedSig)}
                    className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center gap-1 text-[11px]"
                  >
                    {copiedSig ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSig ? 'Copied' : 'Copy Sig'}</span>
                  </button>
                </div>

                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800/80 break-all text-[11px] text-slate-300 max-h-20 overflow-y-auto">
                  {voucher.signature}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Operator Signer:</span>
                    <span className="text-primary truncate block">
                      {truncateHash(voucher.operatorSigner || '', 6, 4)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Vault Contract:</span>
                    <span className="text-purple-400 truncate block">
                      {truncateHash(voucher.contractAddress || '', 6, 4)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-800/80">
                  Audit Transaction Ref: <code className="text-slate-300">{voucher.txHash?.substring(0, 18)}...</code>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs">
                <span className="text-slate-400 block mb-1">Solana Non-Custodial Receipt:</span>
                <code className="text-emerald-400 block text-[11px] break-all">
                  Tx: {voucher.txHash}
                </code>
              </div>
            )}

            <button
              onClick={() => {
                setVoucher(null);
                onClose();
              }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-foreground font-heading font-bold text-xs rounded-xl transition-colors"
            >
              Done / Close Cashier
            </button>
          </div>
        ) : (
          <div>
            {/* Network Selector */}
            <div className="mb-4">
              <label className="block text-xs font-mono text-slate-400 mb-1.5">Select Network</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'BASE', label: 'Base (USDC)' },
                  { id: 'ARB', label: 'Arbitrum (USDC)' },
                  { id: 'SOL', label: 'Solana (SOL)' },
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
                    {selectedNetwork} Vault Escrow Address
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-primary truncate max-w-[280px]">
                      {depositAddress}
                    </code>
                    <button
                      onClick={() => handleCopy(depositAddress, setCopied)}
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

                {/* Optional: Verify External Transaction Hash */}
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowTxHashField(!showTxHashField)}
                    className="text-[11px] font-mono text-primary hover:underline flex items-center gap-1 mb-2"
                  >
                    <span>{showTxHashField ? '▲ Hide manual tx verification' : '▼ Already sent on-chain? Paste Tx Hash'}</span>
                  </button>

                  {showTxHashField && (
                    <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-slate-800 animate-in fade-in duration-150 mb-3">
                      <input
                        type="text"
                        placeholder="Paste transaction hash (0x... or Solscan)"
                        value={txHashInput}
                        onChange={(e) => setTxHashInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyTxHash}
                        disabled={isSubmitting || !txHashInput.trim()}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-heading font-bold text-xs rounded-lg transition-colors"
                      >
                        Verify & Credit On-Chain Tx
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleDeposit}
                  disabled={isSubmitting || amount <= 0}
                  className="w-full py-3.5 bg-primary hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-heading font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Simulate Instant On-Chain Deposit</span>
                  )}
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
                    max={Math.min(balance, 25000)}
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 10)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-base font-heading font-bold text-foreground focus:outline-none focus:border-cta"
                  />
                </div>

                {/* Hot Vault Kelly Limit Notice */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-5 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center justify-between text-slate-300 mb-1">
                    <span>Safety Reserve Limit:</span>
                    <span className="text-primary font-bold">$25,000 / tx</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Withdrawals generate an EIP-712 cryptographic signature signed by the casino operator key conforming to CypherRollVault.sol.
                  </p>
                </div>

                <button
                  onClick={handleWithdraw}
                  disabled={isSubmitting || amount <= 0 || amount > balance}
                  className="w-full py-3.5 bg-cta hover:bg-purple-600 disabled:opacity-40 text-white font-heading font-bold text-sm rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Sign & Generate EIP-712 Voucher</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
