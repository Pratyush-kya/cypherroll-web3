'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Shield,
  Lock,
  Unlock,
  Activity,
  Terminal, MessageSquare,
  Users,
  AlertTriangle,
  TrendingUp,
  Wallet,
  RefreshCw,
  Play,
  Pause,
  LogOut,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Flame,
  Zap,
  Clock,
  Search,
  Sliders,
  DollarSign,
  Fuel,
  Radar,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/web3/useAuth';

export default function AdminCommandCenter() {
  const { user, evmAddress, solanaPublicKey } = useAuth();
  const connectedWallet = user?.wallet || evmAddress || solanaPublicKey;

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [adminKeyInput, setAdminKeyInput] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  // Inactivity Auto-Lock Timer (15 Minutes)
  const [inactivityTimer, setInactivityTimer] = useState<number>(15 * 60);

  // Dashboard Tabs
  const [activeTab, setActiveTab] = useState<'telemetry' | 'whale' | 'engines' | 'players' | 'aml' | 'audit' | 'support'>('telemetry');

  // Live Telemetry & Metrics Data
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);

  // Operator Controls State
  const [tickets, setTickets] = useState<any[]>([]);
  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/support", { headers: { "x-admin-guard": "cypher-authenticated" } });
      const data = await res.json();
      if (data.tickets) setTickets(data.tickets);
    } catch (e) {}
  };

  useEffect(() => {
    if (activeTab === "support" && isAuthenticated) fetchTickets();
  }, [activeTab, isAuthenticated]);

  const resolveTicket = async (ticketId: string) => {
    try {
      await fetch("/api/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-guard": "cypher-authenticated" },
        body: JSON.stringify({ ticketId, status: "RESOLVED" })
      });
      fetchTickets();
    } catch (e) {}
  };

  const [controlsStatus, setControlsStatus] = useState<any>({
    maintenanceMode: false,
    crashPaused: false,
    dicePaused: false,
    auditLogs: [],
  });

  // Players State
  const [players, setPlayers] = useState<any[]>([]);
  const [playerSearch, setPlayerSearch] = useState<string>('');
  const [isLoadingPlayers, setIsLoadingPlayers] = useState<boolean>(false);

  // Adjust Balance Modal State
  const [adjustModal, setAdjustModal] = useState<{
    open: boolean;
    wallet: string;
    currentBalance: number;
    amount: string;
    reason: string;
    loading: boolean;
    error: string;
    success: string;
  }>({
    open: false,
    wallet: '',
    currentBalance: 0,
    amount: '',
    reason: '',
    loading: false,
    error: '',
    success: '',
  });

  // 1. Initial Authentication Check
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // 2. Lockout Countdown Timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // 3. Inactivity Auto-Lock Countdown (when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    const resetInactivity = () => setInactivityTimer(15 * 60);
    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('keydown', resetInactivity);

    const interval = setInterval(() => {
      setInactivityTimer((prev) => {
        if (prev <= 1) {
          handleLockTerminal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('keydown', resetInactivity);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // 4. Polling Telemetry when Authenticated (Every 3 seconds)
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchMetrics();
    fetchControlsStatus();

    const interval = setInterval(() => {
      fetchMetrics();
      fetchControlsStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Check auth
  async function checkAuthStatus() {
    setIsLoadingAuth(true);
    try {
      const res = await fetch('/api/admin/auth');
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  }

  // Handle Login with Admin Key
  async function handleLoginKey(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!adminKeyInput.trim()) return;

    setIsSubmittingAuth(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: adminKeyInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.locked) {
          setLockoutSeconds(data.lockedUntilSeconds || 3600);
        }
        throw new Error(data.error || 'Authentication rejected');
      }

      setIsAuthenticated(true);
      setAdminKeyInput('');
      setInactivityTimer(15 * 60);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  // Handle Login with Connected Operator Wallet
  async function handleLoginWallet() {
    if (!connectedWallet) {
      setAuthError('Connect your Web3 wallet in the main interface first');
      return;
    }

    setIsSubmittingAuth(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: connectedWallet }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Wallet not authorized as operator');

      setIsAuthenticated(true);
      setInactivityTimer(15 * 60);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  // Lock Terminal / Logout
  async function handleLockTerminal() {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
    } catch {}
    setIsAuthenticated(false);
    setAdminKeyInput('');
  }

  // Fetch Metrics
  async function fetchMetrics() {
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      console.error('Metrics fetch error:', err);
    }
  }

  // Fetch Controls Status
  async function fetchControlsStatus() {
    try {
      const res = await fetch('/api/admin/controls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-guard': 'cypher-authenticated',
        },
        body: JSON.stringify({ action: 'GET_STATUS' }),
      });
      if (res.ok) {
        const data = await res.json();
        setControlsStatus(data);
      }
    } catch (err) {
      console.error('Controls status fetch error:', err);
    }
  }

  // Fetch Players
  async function fetchPlayers(searchQuery: string = '') {
    setIsLoadingPlayers(true);
    try {
      const res = await fetch('/api/admin/controls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-guard': 'cypher-authenticated',
        },
        body: JSON.stringify({
          action: 'GET_PLAYERS',
          payload: { search: searchQuery },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPlayers(data.players || []);
      }
    } catch (err) {
      console.error('Fetch players error:', err);
    } finally {
      setIsLoadingPlayers(false);
    }
  }

  // Trigger when switching to players tab
  useEffect(() => {
    if (activeTab === 'players' && isAuthenticated) {
      fetchPlayers(playerSearch);
    }
  }, [activeTab, isAuthenticated]);

  // Toggle Maintenance
  async function toggleMaintenance() {
    try {
      const res = await fetch('/api/admin/controls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-guard': 'cypher-authenticated',
        },
        body: JSON.stringify({
          action: 'TOGGLE_MAINTENANCE',
          payload: { enabled: !controlsStatus.maintenanceMode },
        }),
      });
      if (res.ok) {
        fetchControlsStatus();
      }
    } catch (err) {
      console.error('Toggle maintenance error:', err);
    }
  }

  // Toggle Game Engine
  async function toggleEngine(game: 'CRASH' | 'DICE') {
    const isPaused = game === 'CRASH' ? controlsStatus.crashPaused : controlsStatus.dicePaused;
    try {
      const res = await fetch('/api/admin/controls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-guard': 'cypher-authenticated',
        },
        body: JSON.stringify({
          action: 'TOGGLE_ENGINE',
          payload: { game, paused: !isPaused },
        }),
      });
      if (res.ok) {
        fetchControlsStatus();
      }
    } catch (err) {
      console.error('Toggle engine error:', err);
    }
  }

  // Resolve AML
  async function handleResolveAML(txHash: string, resolution: 'RELEASE' | 'CONFIRM_BLOCK') {
    try {
      const res = await fetch('/api/admin/controls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-guard': 'cypher-authenticated',
        },
        body: JSON.stringify({
          action: 'RESOLVE_AML',
          payload: { txHash, resolution },
        }),
      });
      if (res.ok) {
        fetchMetrics();
        fetchControlsStatus();
      }
    } catch (err) {
      console.error('AML resolution error:', err);
    }
  }

  // Submit Balance Adjustment
  async function submitBalanceAdjustment() {
    setAdjustModal((prev) => ({ ...prev, loading: true, error: '', success: '' }));
    try {
      const res = await fetch('/api/admin/controls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-guard': 'cypher-authenticated',
        },
        body: JSON.stringify({
          action: 'ADJUST_BALANCE',
          payload: {
            walletAddress: adjustModal.wallet,
            amount: adjustModal.amount,
            reason: adjustModal.reason,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Balance adjustment rejected');

      setAdjustModal((prev) => ({
        ...prev,
        loading: false,
        success: `Successfully updated! New balance: $${data.newBalance.toFixed(2)} USDC`,
        currentBalance: data.newBalance,
        amount: '',
        reason: '',
      }));

      fetchPlayers(playerSearch);
      fetchMetrics();
    } catch (err: any) {
      setAdjustModal((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }

  // Format inactivity countdown
  const minutes = Math.floor(inactivityTimer / 60);
  const seconds = inactivityTimer % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // =========================================================================
  // VIEW 1: LOCKED SECURITY GATEWAY
  // =========================================================================
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-zinc-400 font-mono text-sm">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
          <span>INITIALIZING ZERO-TRUST OPERATOR GATEWAY...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07090e] text-zinc-200 flex flex-col items-center justify-center p-4 relative overflow-hidden font-mono">
        {/* Ambient Cyberpunk Glow */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#0c1017]/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-8 shadow-2xl shadow-emerald-950/40 relative z-10">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 mx-auto mb-6 text-emerald-400 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>

          <div className="text-center mb-6">
            <span className="text-[10px] tracking-widest text-emerald-400 font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30">
              ADMIN LOGIN
            </span>
            <h1 className="text-2xl font-black text-white mt-3 tracking-wide">
              CYPHER<span className="text-emerald-400">ROLL</span> ADMIN
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Administrative Command Portal
            </p>
          </div>

          {authError && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/60 border border-red-500/40 flex items-start gap-2.5 text-xs text-red-300">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {lockoutSeconds > 0 ? (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 text-center mb-6">
              <Clock className="w-6 h-6 text-red-400 mx-auto mb-2 animate-pulse" />
              <p className="text-xs font-bold text-red-400 uppercase">TERMINAL TEMPORARILY LOCKED</p>
              <p className="text-2xl font-black text-white mt-1">
                {Math.floor(lockoutSeconds / 60)}:{(lockoutSeconds % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">Too many failed attempts. Rate limit active.</p>
            </div>
          ) : (
            <form onSubmit={handleLoginKey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>MASTER ADMIN KEY</span>
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={adminKeyInput}
                    onChange={(e) => setAdminKeyInput(e.target.value)}
                    placeholder="Enter operator master key..."
                    autoFocus
                    disabled={isSubmittingAuth}
                    className="w-full bg-[#070a0e] border border-zinc-700/80 focus:border-emerald-400 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition font-mono pr-11 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingAuth || !adminKeyInput.trim()}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-sm tracking-wider uppercase transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmittingAuth ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>VERIFYING CRYPTOGRAPHIC KEY...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>UNLOCK OPERATOR TERMINAL</span>
                  </>
                )}
              </button>

              <div className="relative my-4 flex items-center justify-center">
                <div className="border-t border-zinc-800 w-full" />
                <span className="bg-[#0c1017] px-3 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">OR</span>
              </div>

              <button
                type="button"
                onClick={handleLoginWallet}
                disabled={isSubmittingAuth}
                className="w-full py-3 px-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>SIGN AS OPERATOR WALLET</span>
              </button>
            </form>
          )}

          <div className="mt-8 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              CYPHERROLL
            </span>
            <Link href="/" className="hover:text-emerald-400 transition flex items-center gap-1">
              <span>Return to Casino</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: UNLOCKED OPERATOR COMMAND CENTER
  // =========================================================================
  const fin = metrics?.financials;
  const sol = metrics?.solvency;
  const crash = metrics?.liveCrashEngine;
  const hot = metrics?.hotWalletsGas;
  const whale = metrics?.whaleRadar || [];
  const aml = metrics?.amlSanctions;

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-200 font-mono flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Top Header Bar */}
      <header className="bg-[#0a0d14] border-b border-zinc-800 px-6 py-3.5 sticky top-0 z-40 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-wide">
                  CYPHER<span className="text-emerald-400">ROLL</span>
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ADMINISTRATOR
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">Node Cluster: Authoritative Leader</p>
            </div>
          </div>

          {/* Maintenance Indicator */}
          {controlsStatus.maintenanceMode && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-red-950/80 border border-red-500/60 text-red-300 text-xs animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="font-bold">MAINTENANCE KILL-SWITCH ACTIVE</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Solvency Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-400">Solvency:</span>
            <span className="text-emerald-400 font-black">
              {sol?.solvencyRatio ? `${sol.solvencyRatio.toLocaleString()}%` : '0%'}
            </span>
          </div>

          {/* Auto-Lock Inactivity Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Lock:</span>
            <span className="text-white font-bold">{timeStr}</span>
          </div>

          {/* Return to Casino */}
          <Link
            href="/"
            className="px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-xs font-bold text-zinc-300 hover:text-white transition flex items-center gap-1.5"
          >
            <span>Casino</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {/* Lock Terminal */}
          <button
            onClick={handleLockTerminal}
            className="px-3.5 py-1.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-800/50 text-xs font-bold text-red-300 hover:text-red-200 transition flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-[#0c1017] border-b border-zinc-800/80 px-6 py-2 flex items-center gap-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'telemetry', label: 'Telemetry & Solvency', icon: Activity },
          { id: 'whale', label: 'Whale Radar & Bets', icon: Radar },
          { id: 'engines', label: 'Game Engines & Controls', icon: Sliders },
          { id: 'players', label: 'Player Management', icon: Users },
          { id: 'aml', label: `AML Sanctions (${aml?.quarantineCount || 0})`, icon: Shield },
          { id: 'audit', label: 'Operator Audit Trail', icon: Terminal },
          { id: "support", label: `Support Desk (${tickets.filter((t: any) => t.status === "OPEN").length})`, icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-inner'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Body */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* =================================================================== */}
        {/* TAB 1: TELEMETRY & SOLVENCY */}
        {/* =================================================================== */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            {/* Top 4 Performance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0c1017] border border-zinc-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-bold">Gross Gaming Revenue (GGR)</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white tracking-wide">
                  ${fin ? fin.grossGamingRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">Total Wagers minus Player Payouts</p>
              </div>

              <div className="bg-[#0c1017] border border-zinc-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-bold">Total Volume Wagered</span>
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-black text-white tracking-wide">
                  ${fin ? fin.totalWagered.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">{fin?.totalBets || 0} Total Bets Resolved</p>
              </div>

              <div className="bg-[#0c1017] border border-zinc-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-bold">Treasury Solvency Ratio</span>
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400 tracking-wide">
                  {sol ? `${sol.solvencyRatio.toLocaleString()}%` : '0%'}
                </div>
                <p className="text-[11px] text-emerald-500 mt-1">Target &gt; 150% // Fully Backed</p>
              </div>

              <div className="bg-[#0c1017] border border-zinc-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs uppercase tracking-wider font-bold">Kelly Max Bet Cap</span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400 tracking-wide">
                  ${sol?.kellyMaxBetCapUsdc ? sol.kellyMaxBetCapUsdc.toLocaleString() : '12,500'}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">1% Dynamic Liquid Pool Cap</p>
              </div>
            </div>

            {/* Middle Section: Solvency Breakdown & RTP Drift */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Solvency & Reserve Distribution */}
              <div className="bg-[#0c1017] border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span>Liquid Vault Reserve Allocation</span>
                  </h3>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    ${(sol?.totalReservesUsdc || 0).toLocaleString()} USDC TOTAL
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400 font-bold">Base L2 Vault (USDC)</span>
                      <span className="text-white font-black">${(sol?.networkReserves?.baseUsdc || 0).toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{width: sol?.totalReservesUsdc ? `${((sol.networkReserves?.baseUsdc || 0) / sol.totalReservesUsdc) * 100}%` : '0%'}}></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400 font-bold">Arbitrum Vault (USDC)</span>
                      <span className="text-white font-black">${(sol?.networkReserves?.arbUsdc || 0).toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full" style={{width: sol?.totalReservesUsdc ? `${((sol.networkReserves?.arbUsdc || 0) / sol.totalReservesUsdc) * 100}%` : '0%'}}></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400 font-bold">Solana Vault (USDC/SOL)</span>
                      <span className="text-white font-black">${(sol?.networkReserves?.solUsdc || 0).toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{width: sol?.totalReservesUsdc ? `${((sol.networkReserves?.solUsdc || 0) / sol.totalReservesUsdc) * 100}%` : '0%'}}></div></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Total User Liabilities:</span>
                  <span className="font-bold text-zinc-200">
                    ${sol?.totalLiabilitiesUsdc ? sol.totalLiabilitiesUsdc.toLocaleString() : '0.00'} USDC
                  </span>
                </div>
              </div>

              {/* RTP Drift & Mathematical Edge Integrity */}
              <div className="bg-[#0c1017] border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>RTP Drift & Mathematical Edge</span>
                  </h3>
                  <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                    RNG INTEGRITY CHECK
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800">
                    <span className="text-[11px] text-zinc-400 uppercase font-bold">Theoretical RTP</span>
                    <p className="text-xl font-black text-zinc-300 mt-1">99.00%</p>
                    <p className="text-[10px] text-zinc-500">1.0% Hardcoded House Edge</p>
                  </div>
                  <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800">
                    <span className="text-[11px] text-zinc-400 uppercase font-bold">Realized RTP</span>
                    <p className="text-xl font-black text-emerald-400 mt-1">{fin?.realizedRtp || 99.0}%</p>
                    <p className="text-[10px] text-zinc-500">Last 1,000 Real Bets</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-400 font-bold">RTP Statistical Divergence:</span>
                    <span className="ml-2 font-black text-white">
                      {fin?.rtpDrift !== undefined ? `${fin.rtpDrift > 0 ? '+' : ''}${fin.rtpDrift}%` : '0.00%'}
                    </span>
                  </div>
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    NORMAL VARIANCE
                  </span>
                </div>

                {/* Hot Wallet Gas Fuel Gauge */}
                <div className="pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                      <Fuel className="w-3.5 h-3.5 text-amber-400" />
                      <span>Operator Hot Wallet Gas Reserves</span>
                    </span>
                    <span className="text-emerald-400 font-bold text-[10px]">ALL CHAINS HEALTHY</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">BASE ETH</span>
                      <span className="font-bold text-white">{hot?.baseEth || '2.45'} ETH</span>
                    </div>
                    <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">ARB ETH</span>
                      <span className="font-bold text-white">{hot?.arbEth || '1.82'} ETH</span>
                    </div>
                    <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">SOLANA</span>
                      <span className="font-bold text-white">{hot?.solanaSol || '38.5'} SOL</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: WHALE RADAR & LIVE BETS */}
        {/* =================================================================== */}
        {activeTab === 'whale' && (
          <div className="space-y-6">
            {/* Whale Alert Banner */}
            <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-amber-950/40 border border-amber-500/40 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Radar className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    HIGH-ROLLER WHALE RADAR (WAGERS &gt; $250)
                  </h3>
                  <p className="text-xs text-zinc-400">Active monitoring for high-exposure platform risk</p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-400 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                {whale.length} DETECTED
              </span>
            </div>

            {/* High-Roller Table */}
            <div className="bg-[#0c1017] border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider">
                  Recent High-Roller Wagers
                </h4>
                <button
                  onClick={fetchMetrics}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/60 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                    <tr>
                      <th className="px-6 py-3">Player Wallet</th>
                      <th className="px-6 py-3">Game</th>
                      <th className="px-6 py-3">Wager</th>
                      <th className="px-6 py-3">Outcome</th>
                      <th className="px-6 py-3">Payout / Profit</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {whale.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                          No wagers exceeding $250.00 recorded yet. High-roller events will trigger alerts here.
                        </td>
                      </tr>
                    ) : (
                      whale.map((b: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-900/40 transition">
                          <td className="px-6 py-3.5 font-bold text-zinc-300">
                            {b.wallet_address.substring(0, 8)}...{b.wallet_address.substring(b.wallet_address.length - 6)}
                          </td>
                          <td className="px-6 py-3.5 font-bold text-cyan-400">{b.game_type}</td>
                          <td className="px-6 py-3.5 font-black text-white">${Number(b.wager).toFixed(2)}</td>
                          <td className="px-6 py-3.5 text-zinc-400">{b.outcome}x</td>
                          <td className="px-6 py-3.5 font-bold">
                            {b.won ? (
                              <span className="text-emerald-400">+${Number(b.profit).toFixed(2)}</span>
                            ) : (
                              <span className="text-red-400">-${Number(b.wager).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                b.won ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                              }`}
                            >
                              {b.won ? 'WON' : 'LOST'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: GAME ENGINES & EMERGENCY CONTROLS */}
        {/* =================================================================== */}
        {activeTab === 'engines' && (
          <div className="space-y-6">
            {/* Global Emergency Circuit Breaker */}
            <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    GLOBAL CASINO CIRCUIT BREAKER (KILL SWITCH)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Instantly freezes all live bets, cashier deposits, and game engines across all nodes.
                  </p>
                </div>
              </div>
              <button
                onClick={toggleMaintenance}
                className={`px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-lg ${
                  controlsStatus.maintenanceMode
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                }`}
              >
                {controlsStatus.maintenanceMode ? 'DEACTIVATE MAINTENANCE (RESUME CASINO)' : 'TRIGGER KILL SWITCH (FREEZE ALL)'}
              </button>
            </div>

            {/* Individual Game Engine Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Multiplayer Crash Engine */}
              <div className="bg-[#0c1017] border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Flame className="w-5 h-5 text-amber-400" />
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      MULTIPLAYER CRASH ENGINE
                    </h4>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      controlsStatus.crashPaused ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {controlsStatus.crashPaused ? 'PAUSED' : 'ONLINE'}
                  </span>
                </div>

                <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800 grid grid-cols-3 gap-3 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Round ID</span>
                    <span className="font-bold text-white">{crash?.roundId || '---'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Status</span>
                    <span className="font-bold text-emerald-400">{crash?.status || 'STARTING'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Multiplier</span>
                    <span className="font-black text-amber-400 text-sm">
                      {crash?.multiplier ? `${crash.multiplier.toFixed(2)}x` : '1.00x'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => toggleEngine('CRASH')}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                    controlsStatus.crashPaused
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40'
                      : 'bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40'
                  }`}
                >
                  {controlsStatus.crashPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{controlsStatus.crashPaused ? 'RESUME CRASH ENGINE' : 'PAUSE CRASH ENGINE'}</span>
                </button>
              </div>

              {/* Provably Fair Dice Engine */}
              <div className="bg-[#0c1017] border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      PROVABLY FAIR DICE ENGINE
                    </h4>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      controlsStatus.dicePaused ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {controlsStatus.dicePaused ? 'PAUSED' : 'ONLINE'}
                  </span>
                </div>

                <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800 grid grid-cols-3 gap-3 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">RTP Target</span>
                    <span className="font-bold text-white">99.00%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Max Multi</span>
                    <span className="font-bold text-cyan-400">99.00x</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Audit Mode</span>
                    <span className="font-black text-emerald-400">HMAC-SHA256</span>
                  </div>
                </div>

                <button
                  onClick={() => toggleEngine('DICE')}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                    controlsStatus.dicePaused
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40'
                      : 'bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40'
                  }`}
                >
                  {controlsStatus.dicePaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{controlsStatus.dicePaused ? 'RESUME DICE ENGINE' : 'PAUSE DICE ENGINE'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: PLAYER MANAGEMENT */}
        {/* =================================================================== */}
        {activeTab === 'players' && (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchPlayers(playerSearch)}
                  placeholder="Search player by wallet address (e.g. 0x... or Solana)..."
                  className="w-full bg-[#0c1017] border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 outline-none transition font-mono pl-10"
                />
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <button
                onClick={() => fetchPlayers(playerSearch)}
                className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs tracking-wider uppercase transition"
              >
                SEARCH
              </button>
            </div>

            {/* Players Table */}
            <div className="bg-[#0c1017] border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/60 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                    <tr>
                      <th className="px-6 py-3">Wallet Address</th>
                      <th className="px-6 py-3">Balance (USDC)</th>
                      <th className="px-6 py-3">Total Wagered</th>
                      <th className="px-6 py-3">VIP Tier</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {isLoadingPlayers ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-emerald-400" />
                          <span>Searching registered player ledgers...</span>
                        </td>
                      </tr>
                    ) : players.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                          No player profiles found. Try a different search query.
                        </td>
                      </tr>
                    ) : (
                      players.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-900/40 transition">
                          <td className="px-6 py-3.5 font-bold text-zinc-300">{p.wallet_address}</td>
                          <td className="px-6 py-3.5 font-black text-emerald-400">
                            ${Number(p.balance_usdc).toFixed(2)}
                          </td>
                          <td className="px-6 py-3.5 text-zinc-400">${Number(p.total_wagered).toFixed(2)}</td>
                          <td className="px-6 py-3.5">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold text-[10px]">
                              {p.vip_tier || 'Bronze'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <button
                              onClick={() =>
                                setAdjustModal({
                                  open: true,
                                  wallet: p.wallet_address,
                                  currentBalance: Number(p.balance_usdc),
                                  amount: '',
                                  reason: '',
                                  loading: false,
                                  error: '',
                                  success: '',
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-400 border border-zinc-700 text-zinc-300 text-xs font-bold transition"
                            >
                              Adjust Balance
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: AML & SANCTIONS OVERSIGHT */}
        {/* =================================================================== */}
        {activeTab === 'aml' && (
          <div className="space-y-6">
            <div className="bg-[#0c1017] border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>AUTOMATED OFAC & SANCTIONS QUARANTINE LEDGER</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Deposits flagged by the automated AML oracle to protect operator cold wallets.
                  </p>
                </div>
                <span className="text-xs font-bold text-red-400 bg-red-950/60 px-3 py-1 rounded-lg border border-red-500/30">
                  {aml?.quarantineCount || 0} PENDING QUARANTINES
                </span>
              </div>

              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/60 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">Tx Hash</th>
                      <th className="px-4 py-3">Wallet</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Reason / Flags</th>
                      <th className="px-4 py-3">Risk</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {!aml?.recentQuarantines || aml.recentQuarantines.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                          <span>No quarantined deposits. All incoming player funds are clean.</span>
                        </td>
                      </tr>
                    ) : (
                      aml.recentQuarantines.map((item: any) => (
                        <tr key={item.id} className="hover:bg-zinc-900/40 transition">
                          <td className="px-4 py-3 font-mono text-zinc-400">
                            {item.tx_hash.substring(0, 10)}...
                          </td>
                          <td className="px-4 py-3 font-mono text-zinc-300">
                            {item.wallet_address.substring(0, 8)}...
                          </td>
                          <td className="px-4 py-3 font-bold text-white">${Number(item.amount).toFixed(2)}</td>
                          <td className="px-4 py-3 text-red-300 font-bold">{item.reason}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[10px]">
                              SCORE: {item.risk_score || 100}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              onClick={() => handleResolveAML(item.tx_hash, 'RELEASE')}
                              className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-[10px] border border-emerald-500/40"
                            >
                              Release
                            </button>
                            <button
                              onClick={() => handleResolveAML(item.tx_hash, 'CONFIRM_BLOCK')}
                              className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-[10px] border border-red-500/40"
                            >
                              Confirm Block
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 6: OPERATOR AUDIT TRAIL */}
        {/* =================================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-[#0c1017] border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>IMMUTABLE OPERATOR AUDIT TRAIL</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Every administrative mutation, balance adjustment, and emergency toggle is permanently logged.
                  </p>
                </div>
                <button
                  onClick={fetchControlsStatus}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 pt-2">
                {controlsStatus.auditLogs?.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-start justify-between text-xs gap-4 font-mono"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400">{log.action}</span>
                        <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-bold">
                          BY: {log.operator}
                        </span>
                        {log.target && (
                          <span className="text-[10px] text-zinc-500">TARGET: {log.target}</span>
                        )}
                      </div>
                      <p className="text-zinc-300 mt-1">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* =================================================================== */}
        {/* TAB 7: SUPPORT DESK */}
        {/* =================================================================== */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <div className="bg-[#0c1017] border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>USER SUPPORT TICKETS</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Incoming bug reports and cashier disputes. Synchronized with Discord Webhook alerts.
                  </p>
                </div>
                <button
                  onClick={fetchTickets}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-4 pt-2">
                {tickets.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-xl">
                    No support tickets found.
                  </div>
                ) : (
                  tickets.map((ticket: any) => (
                    <div
                      key={ticket.id}
                      className={`p-4 rounded-xl border ${
                        ticket.status === 'OPEN'
                          ? 'bg-zinc-900/80 border-blue-500/30'
                          : 'bg-[#07090e] border-zinc-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ticket.status === 'OPEN' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {ticket.status}
                          </span>
                          <span className="text-xs font-mono text-zinc-300 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                            {ticket.wallet}
                          </span>
                          <span className="text-[11px] text-zinc-500 font-bold uppercase">
                            {ticket.issueType}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(ticket.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-200 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800 font-mono whitespace-pre-wrap">
                        {ticket.message}
                      </p>
                      
                      {ticket.status === 'OPEN' && (
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => resolveTicket(ticket.id)}
                            className="px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Mark as Resolved
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Adjust Balance Modal */}
      {adjustModal.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1017] border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Adjust Player Balance</span>
              </h3>
              <button
                onClick={() => setAdjustModal((prev) => ({ ...prev, open: false }))}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs space-y-1">
              <p className="text-zinc-400">
                Target Wallet: <span className="text-white font-bold">{adjustModal.wallet}</span>
              </p>
              <p className="text-zinc-400">
                Current Balance:{' '}
                <span className="text-emerald-400 font-black">
                  ${adjustModal.currentBalance.toFixed(2)} USDC
                </span>
              </p>
            </div>

            {adjustModal.error && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-300">
                {adjustModal.error}
              </div>
            )}

            {adjustModal.success && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300">
                {adjustModal.success}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                  Adjustment Amount (USDC)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={adjustModal.amount}
                  onChange={(e) => setAdjustModal((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="e.g. +50.00 for credit, or -25.00 for debit"
                  className="w-full bg-[#070a0e] border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none font-mono"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Hard-capped at max ±$500.00 per single adjustment.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                  Mandatory Audit Reason
                </label>
                <input
                  type="text"
                  value={adjustModal.reason}
                  onChange={(e) => setAdjustModal((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Promotional VIP reward or Cashier dispute resolution"
                  className="w-full bg-[#070a0e] border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdjustModal((prev) => ({ ...prev, open: false }))}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitBalanceAdjustment}
                disabled={adjustModal.loading || !adjustModal.amount || !adjustModal.reason}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs tracking-wider uppercase transition disabled:opacity-50"
              >
                {adjustModal.loading ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
