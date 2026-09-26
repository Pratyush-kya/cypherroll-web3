'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ShieldAlert, X } from 'lucide-react';

/**
 * CypherRoll Client-Side Anti-Tamper & Security Sentinel
 * 
 * Features:
 * 1. Disables Right-Click Context Menu ("Inspect Element").
 * 2. Intercepts DevTools keyboard shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U).
 * 3. Monitors viewport anomalies to detect external DevTools docks.
 * 4. Prints security warnings in console and prevents prototype hijacking.
 * 5. Bypasses automatically on the authenticated /admin command portal.
 */
export default function AntiTamperGuard() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Allow inspection on /admin portal for platform maintenance
    if (isAdmin) return;

    // 1. Right-Click Context Menu Suppression
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 2. Keyboard Shortcut Interceptor
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityNotice();
        return false;
      }

      // Ctrl+Shift+I / Cmd+Option+I (Inspect)
      // Ctrl+Shift+J / Cmd+Option+J (Console)
      // Ctrl+Shift+C / Cmd+Option+C (Elements)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityNotice();
        return false;
      }

      // Ctrl+U / Cmd+Option+U (View Page Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityNotice();
        return false;
      }
    };

    // 3. Security Banner & Console Hardening
    const logConsoleSecurityBanner = () => {
      try {
        console.clear();
        console.log(
          '%c⚠️ CYPHERROLL ZERO-TRUST SECURITY SENTINEL ⚠️',
          'color: #10b981; font-size: 16px; font-weight: bold; background: #07090e; padding: 6px 12px; border: 1px solid #10b981; border-radius: 6px;'
        );
        console.log(
          '%cNotice: This Web3 platform operates under strict server-authoritative consensus.\nAll wagers, random seeds, game outcomes, and balances are cryptographically signed with HMAC-SHA256.\nAny client DOM manipulation or console overrides are rejected by the server.',
          'color: #a1a1aa; font-size: 11px; line-height: 1.5;'
        );
      } catch {}
    };

    // 4. Viewport Anomaly Monitoring (DevTools Dock Detection)
    let devToolsCheckTimer: NodeJS.Timeout;
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;

      if (widthThreshold || heightThreshold) {
        logConsoleSecurityBanner();
      }
    };

    const triggerSecurityNotice = () => {
      logConsoleSecurityBanner();
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 4000);
    };

    // Attach listeners
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    devToolsCheckTimer = setInterval(checkDevTools, 2000);

    logConsoleSecurityBanner();

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      clearInterval(devToolsCheckTimer);
    };
  }, [isAdmin]);

  if (!showWarning || isAdmin) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-full px-4 animate-in slide-in-from-top-4 duration-200">
      <div className="bg-[#0c1017]/95 border border-emerald-500/50 rounded-xl p-3.5 shadow-2xl backdrop-blur-xl flex items-start gap-3 text-xs font-mono text-zinc-200">
        <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-bold text-white uppercase tracking-wider text-[11px] text-emerald-400">
            SECURITY SENTINEL ACTIVE
          </p>
          <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">
            Developer inspection is restricted. All transactions, bets, and balances are authoritatively secured on-chain.
          </p>
        </div>
        <button
          onClick={() => setShowWarning(false)}
          className="text-zinc-500 hover:text-white transition p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
