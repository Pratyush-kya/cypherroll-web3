import { calculateCrashPoint, generateServerSeed } from '@/lib/provably-fair';
import { settleCrashCashout, settleCrashBust, broadcastLiveBet, recordCrashRound, calculateDeterministicRakeback, getOrCreatePlayer } from '@/lib/supabase';
import { distributedState } from '@/lib/distributed-state';

export interface CrashPlayerBet {
  wallet: string;
  wager: number;
  autoCashoutMultiplier?: number;
  cashedOut: boolean;
  cashedOutAt?: number;
  profit?: number;
  isAutoCashout?: boolean;
}

export interface CrashRoundState {
  roundId: string;
  status: 'STARTING' | 'FLYING' | 'CRASHED';
  multiplier: number;
  countdown: number;
  crashPoint?: number;
  crashedAt?: number;
  serverSeedHash: string;
  activeBets: {
    wallet: string;
    wager: number;
    autoCashoutMultiplier?: number;
    cashedOut: boolean;
    cashedOutAt?: number;
    isAutoCashout?: boolean;
  }[];
  history: number[];
}

class CrashEngine {
  private status: 'STARTING' | 'FLYING' | 'CRASHED' = 'STARTING';
  private roundId: string = Math.random().toString(36).substring(2, 9);
  private multiplier: number = 1.00;
  private crashPoint: number = 1.00;
  private countdown: number = 5.0;
  private startTime: number = 0;
  private crashedAt: number = 0;
  private serverSeed: string = '';
  private serverSeedHash: string = '';
  private clientSeed: string = 'global_crash_seed_1';
  private nonce: number = 1;
  private bets: Map<string, CrashPlayerBet> = new Map();
  private history: number[] = [];
  private interval: NodeJS.Timeout | null = null;
  private listeners: Set<(state: CrashRoundState) => void> = new Set();

  constructor() {
    this.initRound();
    this.startLoop();

    // Subscribe to distributed state synchronization across cluster nodes
    distributedState.subscribe<CrashRoundState>('cypherroll:crash:state', (remoteState) => {
      if (!distributedState.getIsLeader()) {
        this.syncRemoteState(remoteState);
      }
    });
  }

  private syncRemoteState(remote: CrashRoundState) {
    this.roundId = remote.roundId;
    this.status = remote.status;
    this.multiplier = remote.multiplier;
    this.countdown = remote.countdown;
    if (remote.crashPoint !== undefined) this.crashPoint = remote.crashPoint;
    if (remote.crashedAt !== undefined) this.crashedAt = remote.crashedAt;
    this.serverSeedHash = remote.serverSeedHash;
    this.history = remote.history;

    // Sync active bets map
    this.bets.clear();
    for (const b of remote.activeBets) {
      this.bets.set(b.wallet, {
        wallet: b.wallet,
        wager: b.wager,
        autoCashoutMultiplier: b.autoCashoutMultiplier,
        cashedOut: b.cashedOut,
        cashedOutAt: b.cashedOutAt,
        isAutoCashout: b.isAutoCashout,
      });
    }

    this.notifyListeners();
  }

  private initRound() {
    const { serverSeed, serverSeedHash } = generateServerSeed();
    this.serverSeed = serverSeed;
    this.serverSeedHash = serverSeedHash;
    this.roundId = Math.random().toString(36).substring(2, 9);
    this.status = 'STARTING';
    this.multiplier = 1.00;
    this.countdown = 5.0;
    this.crashedAt = 0;
    this.bets.clear();

    // Calculate deterministic crash point for the round upfront
    this.crashPoint = calculateCrashPoint(this.serverSeed, this.clientSeed, this.nonce);
    this.nonce += 1;
  }

  private startLoop() {
    if (this.interval) clearInterval(this.interval);

    const TICK_MS = 50;
    this.interval = setInterval(async () => {
      // Only the authoritative leader drives the mathematical progression
      const isLeader = distributedState.getIsLeader();
      if (!isLeader) return;

      if (this.status === 'STARTING') {
        this.countdown = parseFloat((this.countdown - TICK_MS / 1000).toFixed(2));
        if (this.countdown <= 0) {
          this.status = 'FLYING';
          this.multiplier = 1.00;
          this.startTime = Date.now();
        }
      } else if (this.status === 'FLYING') {
        const elapsedSec = (Date.now() - this.startTime) / 1000;
        const currentMulti = parseFloat((1.00 * Math.exp(0.065 * elapsedSec)).toFixed(2));

        if (currentMulti >= this.crashPoint) {
          // Trigger any auto-cashouts that hit before or at crash point
          await this.checkAutoCashouts(this.crashPoint);

          // BUST!
          this.crashedAt = Date.now();
          this.multiplier = this.crashPoint;
          this.status = 'CRASHED';
          this.history = [this.crashPoint, ...this.history.slice(0, 9)];

          // Record round outcome in crash_rounds audit table
          recordCrashRound({
            roundId: this.roundId,
            crashPoint: this.crashPoint,
            serverSeedHash: this.serverSeedHash,
            serverSeed: this.serverSeed,
            clientSeed: this.clientSeed,
            nonce: this.nonce - 1,
          }).catch(() => {});

          // Process all un-cashed players as lost in DB
          this.finalizeUncashedBets();

          // Wait 3.5 seconds before starting next round
          setTimeout(() => {
            this.initRound();
          }, 3500);
        } else {
          this.multiplier = currentMulti;
          // Check auto-cashouts for players whose target has been reached at this tick
          await this.checkAutoCashouts(currentMulti);
        }
      }

      this.notifyListeners();

      // Publish to distributed cluster bus
      distributedState.publish('cypherroll:crash:state', this.getState()).catch(() => {});
    }, TICK_MS);
  }

  private async finalizeUncashedBets() {
    for (const [wallet, bet] of this.bets.entries()) {
      if (!bet.cashedOut) {
        bet.profit = -bet.wager;
        // Record loss in database ledger (wager already locked for real bets)
        if (wallet.toLowerCase().startsWith('demo')) continue;
        
        getOrCreatePlayer(wallet).then(profile => {
          const actualRakeback = calculateDeterministicRakeback(bet.wager, 0.02, profile.vip_tier);
          settleCrashBust({
            wallet,
            wager: bet.wager,
            crashPoint: this.crashPoint,
            serverSeedHash: this.serverSeedHash,
            clientSeed: this.clientSeed,
            nonce: this.nonce - 1,
            rakebackEarned: actualRakeback,
          }).catch((err) => console.error("Error finalizing crash bet loss:", err));
        }).catch(err => console.error("Error fetching player for bust:", err));
      }
    }
  }

  public async placeBet(
    wallet: string,
    wager: number,
    autoCashoutMultiplier?: number
  ): Promise<{ success: boolean; error?: string }> {
    let validatedAuto: number | undefined = undefined;
    if (autoCashoutMultiplier !== undefined && autoCashoutMultiplier !== null && !isNaN(Number(autoCashoutMultiplier))) {
      const num = Number(autoCashoutMultiplier);
      if (num < 1.01 || num > 10000) {
        return { success: false, error: 'Auto-cashout multiplier must be between 1.01× and 10,000×' };
      }
      validatedAuto = parseFloat(num.toFixed(2));
    }

    // Acquire distributed lock for user balance safety
    const lock = await distributedState.acquireLock(`crash_bet:${wallet}`, 2500);
    if (!lock) {
      return { success: false, error: 'Concurrent bet detected on this account' };
    }

    try {
      if (this.status !== 'STARTING') {
        return { success: false, error: 'Bets can only be placed during countdown' };
      }
      if (this.bets.has(wallet)) {
        return { success: false, error: 'Already placed a bet in this round' };
      }
      this.bets.set(wallet, {
        wallet,
        wager,
        autoCashoutMultiplier: validatedAuto,
        cashedOut: false,
      });

      this.notifyListeners();
      distributedState.publish('cypherroll:crash:state', this.getState()).catch(() => {});
      return { success: true };
    } finally {
      await distributedState.releaseLock(lock);
    }
  }

  private async executeCashoutInternal(
    bet: CrashPlayerBet,
    targetMultiplier: number,
    isAuto: boolean
  ): Promise<{
    success: boolean;
    payout: number;
    multiplier: number;
    newBalance?: number;
    vipTier?: string;
    rakeback?: number;
  }> {
    const payout = parseFloat((bet.wager * targetMultiplier).toFixed(2));
    const profit = parseFloat((payout - bet.wager).toFixed(2));

    bet.cashedOut = true;
    bet.cashedOutAt = targetMultiplier;
    bet.profit = profit;
    bet.isAutoCashout = isAuto;

    // In demo mode, bypass DB settlement and broadcast
    if (bet.wallet.toLowerCase().startsWith('demo')) {
      this.notifyListeners();
      distributedState.publish('cypherroll:crash:state', this.getState()).catch(() => {});
      return {
        success: true,
        payout,
        multiplier: targetMultiplier,
      };
    }

    // Credit payout atomically in database ledger
    const profile = await getOrCreatePlayer(bet.wallet);
    const actualRakeback = calculateDeterministicRakeback(bet.wager, 0.02, profile.vip_tier);
    
    const settlement = await settleCrashCashout({
      wallet: bet.wallet,
      wager: bet.wager,
      multiplier: targetMultiplier,
      payout,
      profit,
      serverSeedHash: this.serverSeedHash,
      clientSeed: this.clientSeed,
      nonce: this.nonce - 1,
      rakebackEarned: actualRakeback,
    });

    // Broadcast win to global live bets ticker
    broadcastLiveBet({
      wallet: bet.wallet,
      gameType: 'CRASH',
      wager: bet.wager,
      multiplier: targetMultiplier,
      payout,
      profit,
      won: true,
    });

    this.notifyListeners();
    distributedState.publish('cypherroll:crash:state', this.getState()).catch(() => {});

    return {
      success: true,
      payout,
      multiplier: targetMultiplier,
      newBalance: settlement.newBalance,
      vipTier: settlement.vipTier,
      rakeback: settlement.rakeback,
    };
  }

  private async checkAutoCashouts(currentMulti: number) {
    for (const bet of this.bets.values()) {
      if (!bet.cashedOut && bet.autoCashoutMultiplier && bet.autoCashoutMultiplier <= currentMulti) {
        try {
          await this.executeCashoutInternal(bet, bet.autoCashoutMultiplier, true);
        } catch (err) {
          console.error(`Auto-cashout execution failed for ${bet.wallet}:`, err);
        }
      }
    }
  }

  public async cashOut(
    wallet: string,
    clientMultiplier?: number,
    clientTimestamp?: number
  ): Promise<{
    success: boolean;
    payout?: number;
    multiplier?: number;
    newBalance?: number;
    vipTier?: string;
    rakeback?: number;
    alreadyCashedOut?: boolean;
    error?: string;
  }> {
    const bet = this.bets.get(wallet);
    if (!bet) {
      return { success: false, error: 'No active bet in this round' };
    }
    if (bet.cashedOut) {
      const payout = parseFloat((bet.wager * (bet.cashedOutAt || 1)).toFixed(2));
      return {
        success: true,
        payout,
        multiplier: bet.cashedOutAt,
        alreadyCashedOut: true,
      };
    }

    // Normal flight cashout
    if (this.status === 'FLYING') {
      const currentMulti = this.multiplier;
      return await this.executeCashoutInternal(bet, currentMulti, false);
    }

    // Network Latency Grace Window (250ms buffer post-crash)
    // Protects players from ping spikes / network jitter when clicking cashout before packet arrives
    const LATENCY_GRACE_MS = 250;
    if (this.status === 'CRASHED' && this.crashedAt > 0) {
      const timeSinceCrash = Date.now() - this.crashedAt;
      if (timeSinceCrash <= LATENCY_GRACE_MS) {
        const requestedMulti = clientMultiplier && clientMultiplier < this.crashPoint
          ? Math.max(1.01, parseFloat(clientMultiplier.toFixed(2)))
          : Math.max(1.01, parseFloat((this.crashPoint - 0.01).toFixed(2)));

        if (requestedMulti < this.crashPoint) {
          const result = await this.executeCashoutInternal(bet, requestedMulti, false);
          return {
            ...result,
            multiplier: requestedMulti,
          };
        }
      }
      return { success: false, error: 'Round crashed before cashout packet was received' };
    }

    return { success: false, error: 'Round is not currently active' };
  }

  public getState(): CrashRoundState {
    return {
      roundId: this.roundId,
      status: this.status,
      multiplier: this.multiplier,
      countdown: this.countdown,
      crashPoint: this.status === 'CRASHED' ? this.crashPoint : undefined,
      crashedAt: this.status === 'CRASHED' ? this.crashedAt : undefined,
      serverSeedHash: this.serverSeedHash,
      activeBets: Array.from(this.bets.values()).map((b) => ({
        wallet: b.wallet,
        wager: b.wager,
        autoCashoutMultiplier: b.autoCashoutMultiplier,
        cashedOut: b.cashedOut,
        cashedOutAt: b.cashedOutAt,
        isAutoCashout: b.isAutoCashout,
      })),
      history: this.history,
    };
  }

  public subscribe(cb: (state: CrashRoundState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => this.listeners.delete(cb);
  }

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach((cb) => cb(state));
  }
}

// Global Singleton for Next.js server environment
const globalCrash = globalThis as unknown as { __cypherroll_crash_engine?: CrashEngine };
if (!globalCrash.__cypherroll_crash_engine) {
  globalCrash.__cypherroll_crash_engine = new CrashEngine();
}

export const crashEngine = globalCrash.__cypherroll_crash_engine;
