import { calculateCrashPoint, generateServerSeed } from '@/lib/provably-fair';
import { settleCrashCashout, settleCrashBust } from '@/lib/supabase';

export interface CrashPlayerBet {
  wallet: string;
  wager: number;
  cashedOut: boolean;
  cashedOutAt?: number;
  profit?: number;
}

export interface CrashRoundState {
  roundId: string;
  status: 'STARTING' | 'FLYING' | 'CRASHED';
  multiplier: number;
  countdown: number;
  crashPoint?: number;
  serverSeedHash: string;
  activeBets: { wallet: string; wager: number; cashedOut: boolean; cashedOutAt?: number }[];
  history: number[];
}

class CrashEngine {
  private status: 'STARTING' | 'FLYING' | 'CRASHED' = 'STARTING';
  private roundId: string = Math.random().toString(36).substring(2, 9);
  private multiplier: number = 1.00;
  private crashPoint: number = 1.00;
  private countdown: number = 5.0;
  private startTime: number = 0;
  private serverSeed: string = '';
  private serverSeedHash: string = '';
  private clientSeed: string = 'global_crash_seed_1';
  private nonce: number = 1;
  private bets: Map<string, CrashPlayerBet> = new Map();
  private history: number[] = [1.85, 3.42, 1.15, 8.20, 2.05, 1.00, 4.50];
  private interval: NodeJS.Timeout | null = null;
  private listeners: Set<(state: CrashRoundState) => void> = new Set();

  constructor() {
    this.initRound();
    this.startLoop();
  }

  private initRound() {
    const { serverSeed, serverSeedHash } = generateServerSeed();
    this.serverSeed = serverSeed;
    this.serverSeedHash = serverSeedHash;
    this.roundId = Math.random().toString(36).substring(2, 9);
    this.status = 'STARTING';
    this.multiplier = 1.00;
    this.countdown = 5.0;
    this.bets.clear();

    // Calculate deterministic crash point for the round upfront
    this.crashPoint = calculateCrashPoint(this.serverSeed, this.clientSeed, this.nonce);
    this.nonce += 1;
  }

  private startLoop() {
    if (this.interval) clearInterval(this.interval);

    const TICK_MS = 50;
    this.interval = setInterval(() => {
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
          // BUST!
          this.multiplier = this.crashPoint;
          this.status = 'CRASHED';
          this.history = [this.crashPoint, ...this.history.slice(0, 9)];

          // Process all un-cashed players as lost in DB
          this.finalizeUncashedBets();

          // Wait 3.5 seconds before starting next round
          setTimeout(() => {
            this.initRound();
          }, 3500);
        } else {
          this.multiplier = currentMulti;
        }
      }

      this.notifyListeners();
    }, TICK_MS);
  }

  private async finalizeUncashedBets() {
    for (const [wallet, bet] of this.bets.entries()) {
      if (!bet.cashedOut) {
        bet.profit = -bet.wager;
        // Record loss in database ledger (wager already locked)
        settleCrashBust({
          wallet,
          wager: bet.wager,
          crashPoint: this.crashPoint,
          serverSeedHash: this.serverSeedHash,
          clientSeed: this.clientSeed,
          nonce: this.nonce - 1,
          rakebackEarned: parseFloat(((bet.wager * 0.02) * 0.15).toFixed(4)),
        }).catch((err) => console.error("Error finalizing crash bet loss:", err));
      }
    }
  }

  public placeBet(wallet: string, wager: number): { success: boolean; error?: string } {
    if (this.status !== 'STARTING') {
      return { success: false, error: 'Bets can only be placed during countdown' };
    }
    if (this.bets.has(wallet)) {
      return { success: false, error: 'Already placed a bet in this round' };
    }
    this.bets.set(wallet, {
      wallet,
      wager,
      cashedOut: false,
    });
    this.notifyListeners();
    return { success: true };
  }

  public async cashOut(wallet: string): Promise<{
    success: boolean;
    payout?: number;
    multiplier?: number;
    newBalance?: number;
    vipTier?: string;
    rakeback?: number;
    error?: string;
  }> {
    if (this.status !== 'FLYING') {
      return { success: false, error: 'Round is not currently active' };
    }
    const bet = this.bets.get(wallet);
    if (!bet) {
      return { success: false, error: 'No active bet in this round' };
    }
    if (bet.cashedOut) {
      return { success: false, error: 'Already cashed out' };
    }

    const currentMulti = this.multiplier;
    const payout = parseFloat((bet.wager * currentMulti).toFixed(2));
    const profit = parseFloat((payout - bet.wager).toFixed(2));

    bet.cashedOut = true;
    bet.cashedOutAt = currentMulti;
    bet.profit = profit;

    // Credit payout atomically in database ledger
    const settlement = await settleCrashCashout({
      wallet,
      wager: bet.wager,
      multiplier: currentMulti,
      payout,
      profit,
      serverSeedHash: this.serverSeedHash,
      clientSeed: this.clientSeed,
      nonce: this.nonce - 1,
      rakebackEarned: parseFloat(((bet.wager * 0.02) * 0.15).toFixed(4)),
    });

    this.notifyListeners();
    return {
      success: true,
      payout,
      multiplier: currentMulti,
      newBalance: settlement.newBalance,
      vipTier: settlement.vipTier,
      rakeback: settlement.rakeback,
    };
  }

  public getState(): CrashRoundState {
    return {
      roundId: this.roundId,
      status: this.status,
      multiplier: this.multiplier,
      countdown: this.countdown,
      crashPoint: this.status === 'CRASHED' ? this.crashPoint : undefined,
      serverSeedHash: this.serverSeedHash,
      activeBets: Array.from(this.bets.values()).map((b) => ({
        wallet: b.wallet,
        wager: b.wager,
        cashedOut: b.cashedOut,
        cashedOutAt: b.cashedOutAt,
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
