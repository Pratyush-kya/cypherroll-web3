'use client';

import React, { useState } from 'react';
import { LifeBuoy, X, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';

interface SupportModalProps {
  onClose: () => void;
}

export function SupportModal({ onClose }: SupportModalProps) {
  const [issueType, setIssueType] = useState('Deposit / Cashier');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const issueTypes = [
    'Deposit / Cashier',
    'Game Engine Bug',
    'Account / Security',
    'Other / Feedback'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueType, message: message.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit ticket');

      setStatus('success');
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0c1017] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider font-heading">
              Support <span className="text-blue-400">Desk</span>
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto font-mono text-sm">
          {status === 'success' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Ticket Submitted</h3>
              <p className="text-slate-400 text-xs">
                Our operations team has been notified via priority alerts. We will investigate the issue immediately.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-slate-400 text-xs mb-4">
                Found a bug or having issues with a deposit? Submit a ticket and our admin team will be instantly notified.
              </p>

              {status === 'error' && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg flex items-start gap-2 text-red-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Issue Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {issueTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setIssueType(type)}
                      className={`px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-all ${
                        issueType === type
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail. If it's a missing deposit, please include the transaction hash..."
                  className="w-full h-32 bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading' || !message.trim()}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {status === 'loading' ? (
                  <span className="animate-pulse">Submitting...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Ticket
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
