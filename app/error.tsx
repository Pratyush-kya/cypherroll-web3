'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('CypherRoll Client Runtime Caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">Client Recovery Shield</h2>
            <p className="text-xs text-slate-400 font-mono">Tor Sandbox / Browser Safeguard</p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 space-y-1">
          <div className="text-rose-400 font-bold">Exception:</div>
          <div className="break-words text-[11px] text-slate-400">
            {error.message || 'Client-side initialization restricted by browser privacy policy.'}
          </div>
          {error.digest && (
            <div className="text-[10px] text-slate-600">Digest: {error.digest}</div>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          If you are using Tor Browser with strict privacy settings, some features like WebGL or browser wallet extensions may be restricted. CypherRoll can continue running in Anonymous Tor Mode.
        </p>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => reset()}
            className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-amber-400 text-slate-950 font-heading font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-mono text-xs transition-all border border-slate-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
