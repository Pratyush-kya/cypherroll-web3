import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateServerSeed } from '@/lib/provably-fair';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
);

// Fallback in-memory store for local testing without external database setup
export interface MockProfile {
  id: string;
  wallet_address: string;
  chain_type: string;
  balance_usdc: number;
  total_wagered: number;
  total_won: number;
  vip_tier: string;
  accumulated_rakeback: number;
  active_server_seed: string;
  active_server_seed_hash: string;
  client_seed: string;
  nonce: number;
}

const mockDb = {
  profiles: new Map<string, MockProfile>(),
  bets: [] as any[],
  trollbox: [
    { id: '1', sender_address: '0x4a...e1', sender_vip: 'Gold', message: 'Just hit 14.8x on Crash! 🚀', created_at: new Date(Date.now() - 120000).toISOString() },
    { id: '2', sender_address: '7XwZ...9q', sender_vip: 'Platinum', message: 'CypherRoll 3D runs crazy fast on Tor.', created_at: new Date(Date.now() - 60000).toISOString() },
    { id: '3', sender_address: '0x99...f4', sender_vip: 'Bronze', message: 'Provably fair hashes check out 100%.', created_at: new Date(Date.now() - 15000).toISOString() },
  ],
};

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const supabaseAdmin: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

function computeVIPTier(totalWagered: number): string {
  if (totalWagered >= 50000) return 'Diamond';
  if (totalWagered >= 10000) return 'Platinum';
  if (totalWagered >= 2500) return 'Gold';
  if (totalWagered >= 500) return 'Silver';
  return 'Bronze';
}

/**
 * Retrieves player profile or auto-provisions a new account
 */
export async function getOrCreatePlayer(walletAddress: string, chainType: string = 'SOL'): Promise<MockProfile> {
  if (supabase) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (existing) return existing as MockProfile;

    // Create new profile in Supabase
    const { serverSeed, serverSeedHash } = generateServerSeed();

    const newProfile = {
      wallet_address: walletAddress,
      chain_type: chainType,
      balance_usdc: 1000.0,
      total_wagered: 0.0,
      total_won: 0.0,
      vip_tier: 'Bronze',
      accumulated_rakeback: 0.0,
      active_server_seed: serverSeed,
      active_server_seed_hash: serverSeedHash,
      client_seed: 'client_' + Math.random().toString(36).substring(7),
      nonce: 1,
    };

    const { data: created } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select('*')
      .single();

    return created as MockProfile;
  }

  // Mock In-Memory Engine Fallback
  let profile = mockDb.profiles.get(walletAddress);
  if (!profile) {
    const { serverSeed, serverSeedHash } = generateServerSeed();

    profile = {
      id: Math.random().toString(36).substring(7),
      wallet_address: walletAddress,
      chain_type: chainType,
      balance_usdc: 1000.0,
      total_wagered: 0.0,
      total_won: 0.0,
      vip_tier: 'Bronze',
      accumulated_rakeback: 0.0,
      active_server_seed: serverSeed,
      active_server_seed_hash: serverSeedHash,
      client_seed: 'client_' + Math.random().toString(36).substring(7),
      nonce: 1,
    };
    mockDb.profiles.set(walletAddress, profile);
  }
  return profile;
}

/**
 * Execute atomic bet resolution in DB
 */
export async function recordAtomicBet(params: {
  wallet: string;
  gameType: string;
  wager: number;
  won: boolean;
  targetPayout: number;
  outcome: number;
  payout: number;
  profit: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  rakebackEarned: number;
}) {
  if (supabase) {
    const { data, error } = await supabase.rpc('execute_atomic_bet', {
      p_wallet: params.wallet,
      p_game_type: params.gameType,
      p_wager: params.wager,
      p_won: params.won,
      p_target_payout: params.targetPayout,
      p_outcome: params.outcome,
      p_payout: params.payout,
      p_profit: params.profit,
      p_server_seed_hash: params.serverSeedHash,
      p_client_seed: params.clientSeed,
      p_nonce: params.nonce,
      p_rakeback_earned: params.rakebackEarned,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  // Mock Engine Fallback
  const profile = mockDb.profiles.get(params.wallet);
  if (!profile) throw new Error("Player profile not found");
  if (profile.balance_usdc < params.wager) throw new Error("Insufficient balance");

  profile.balance_usdc = parseFloat((profile.balance_usdc + params.profit).toFixed(2));
  profile.total_wagered = parseFloat((profile.total_wagered + params.wager).toFixed(2));
  if (params.won) profile.total_won = parseFloat((profile.total_won + params.profit).toFixed(2));
  profile.accumulated_rakeback = parseFloat((profile.accumulated_rakeback + params.rakebackEarned).toFixed(4));
  profile.nonce += 1;

  if (profile.total_wagered >= 50000) profile.vip_tier = 'Diamond';
  else if (profile.total_wagered >= 10000) profile.vip_tier = 'Platinum';
  else if (profile.total_wagered >= 2500) profile.vip_tier = 'Gold';
  else if (profile.total_wagered >= 500) profile.vip_tier = 'Silver';
  else profile.vip_tier = 'Bronze';

  mockDb.bets.unshift({
    ...params,
    id: Math.random().toString(36).substring(7),
    created_at: new Date().toISOString(),
  });

  return {
    new_balance: profile.balance_usdc,
    total_wagered: profile.total_wagered,
    vip_tier: profile.vip_tier,
    new_nonce: profile.nonce,
    rakeback: profile.accumulated_rakeback,
  };
}

/**
 * Lock wager funds atomically before a Crash round takes off
 * Prevents double-spending during multiplayer rounds
 */
export async function lockPlayerWager(wallet: string, wager: number): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const client = supabaseAdmin || supabase;
  if (client) {
    const profile = await getOrCreatePlayer(wallet);
    if (Number(profile.balance_usdc) < wager) {
      return { success: false, error: 'Insufficient balance' };
    }

    const newBalance = parseFloat((Number(profile.balance_usdc) - wager).toFixed(2));
    const { data, error } = await client
      .from('profiles')
      .update({ balance_usdc: newBalance, updated_at: new Date().toISOString() })
      .eq('wallet_address', wallet)
      .gte('balance_usdc', wager)
      .select('balance_usdc')
      .single();

    if (error || !data) {
      return { success: false, error: 'Balance deduction failed or race condition' };
    }

    return { success: true, newBalance: Number(data.balance_usdc) };
  }

  // Mock In-Memory Engine
  const profile = await getOrCreatePlayer(wallet);
  if (profile.balance_usdc < wager) {
    return { success: false, error: 'Insufficient balance' };
  }
  profile.balance_usdc = parseFloat((profile.balance_usdc - wager).toFixed(2));
  return { success: true, newBalance: profile.balance_usdc };
}

/**
 * Refund locked wager if round entry is rejected
 */
export async function refundPlayerWager(wallet: string, wager: number): Promise<void> {
  const client = supabaseAdmin || supabase;
  if (client) {
    const { data: profile } = await client
      .from('profiles')
      .select('balance_usdc')
      .eq('wallet_address', wallet)
      .single();
    if (profile) {
      await client
        .from('profiles')
        .update({ balance_usdc: parseFloat((Number(profile.balance_usdc) + wager).toFixed(2)) })
        .eq('wallet_address', wallet);
    }
    return;
  }
  const profile = mockDb.profiles.get(wallet);
  if (profile) {
    profile.balance_usdc = parseFloat((profile.balance_usdc + wager).toFixed(2));
  }
}

/**
 * Settle winning cashout in database ledger
 */
export async function settleCrashCashout(params: {
  wallet: string;
  wager: number;
  multiplier: number;
  payout: number;
  profit: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  rakebackEarned: number;
}): Promise<{ newBalance: number; vipTier: string; rakeback: number }> {
  const client = supabaseAdmin || supabase;
  if (client) {
    const { data: profile } = await client
      .from('profiles')
      .select('*')
      .eq('wallet_address', params.wallet)
      .single();

    if (!profile) throw new Error('Player profile not found');

    const newBalance = parseFloat((Number(profile.balance_usdc) + params.payout).toFixed(2));
    const newWagered = parseFloat((Number(profile.total_wagered) + params.wager).toFixed(2));
    const newWon = parseFloat((Number(profile.total_won) + params.profit).toFixed(2));
    const newTier = computeVIPTier(newWagered);
    const newRakeback = parseFloat((Number(profile.accumulated_rakeback) + params.rakebackEarned).toFixed(4));
    const newNonce = profile.nonce + 1;

    await client
      .from('profiles')
      .update({
        balance_usdc: newBalance,
        total_wagered: newWagered,
        total_won: newWon,
        vip_tier: newTier,
        accumulated_rakeback: newRakeback,
        nonce: newNonce,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    await client.from('bets').insert({
      player_id: profile.id,
      wallet_address: params.wallet,
      game_type: 'CRASH',
      wager: params.wager,
      target_payout: params.multiplier,
      outcome: params.multiplier,
      won: true,
      payout: params.payout,
      profit: params.profit,
      server_seed_hash: params.serverSeedHash,
      client_seed: params.clientSeed,
      nonce: params.nonce,
    });

    return {
      newBalance,
      vipTier: newTier,
      rakeback: newRakeback,
    };
  }

  // Mock Engine
  const profile = mockDb.profiles.get(params.wallet);
  if (!profile) throw new Error('Player profile not found');
  profile.balance_usdc = parseFloat((profile.balance_usdc + params.payout).toFixed(2));
  profile.total_wagered = parseFloat((profile.total_wagered + params.wager).toFixed(2));
  profile.total_won = parseFloat((profile.total_won + params.profit).toFixed(2));
  profile.vip_tier = computeVIPTier(profile.total_wagered);
  profile.accumulated_rakeback = parseFloat((profile.accumulated_rakeback + params.rakebackEarned).toFixed(4));
  profile.nonce += 1;

  mockDb.bets.unshift({
    ...params,
    gameType: 'CRASH',
    won: true,
    outcome: params.multiplier,
    targetPayout: params.multiplier,
    id: Math.random().toString(36).substring(7),
    created_at: new Date().toISOString(),
  });

  return {
    newBalance: profile.balance_usdc,
    vipTier: profile.vip_tier,
    rakeback: profile.accumulated_rakeback,
  };
}

/**
 * Settle busted bet on crash
 */
export async function settleCrashBust(params: {
  wallet: string;
  wager: number;
  crashPoint: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  rakebackEarned: number;
}): Promise<void> {
  const client = supabaseAdmin || supabase;
  if (client) {
    const { data: profile } = await client
      .from('profiles')
      .select('*')
      .eq('wallet_address', params.wallet)
      .single();

    if (!profile) return;

    // Note: balance was already locked/deducted during lockPlayerWager
    const newWagered = parseFloat((Number(profile.total_wagered) + params.wager).toFixed(2));
    const newTier = computeVIPTier(newWagered);
    const newRakeback = parseFloat((Number(profile.accumulated_rakeback) + params.rakebackEarned).toFixed(4));
    const newNonce = profile.nonce + 1;

    await client
      .from('profiles')
      .update({
        total_wagered: newWagered,
        vip_tier: newTier,
        accumulated_rakeback: newRakeback,
        nonce: newNonce,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    await client.from('bets').insert({
      player_id: profile.id,
      wallet_address: params.wallet,
      game_type: 'CRASH',
      wager: params.wager,
      target_payout: params.crashPoint,
      outcome: params.crashPoint,
      won: false,
      payout: 0,
      profit: -params.wager,
      server_seed_hash: params.serverSeedHash,
      client_seed: params.clientSeed,
      nonce: params.nonce,
    });
    return;
  }

  // Mock Engine
  const profile = mockDb.profiles.get(params.wallet);
  if (!profile) return;
  profile.total_wagered = parseFloat((profile.total_wagered + params.wager).toFixed(2));
  profile.vip_tier = computeVIPTier(profile.total_wagered);
  profile.accumulated_rakeback = parseFloat((profile.accumulated_rakeback + params.rakebackEarned).toFixed(4));
  profile.nonce += 1;

  mockDb.bets.unshift({
    ...params,
    gameType: 'CRASH',
    won: false,
    payout: 0,
    profit: -params.wager,
    outcome: params.crashPoint,
    targetPayout: params.crashPoint,
    id: Math.random().toString(36).substring(7),
    created_at: new Date().toISOString(),
  });
}

export function getMockTrollbox() {
  return mockDb.trollbox;
}

export function addMockTrollboxMessage(sender: string, vip: string, message: string) {
  const newMsg = {
    id: Math.random().toString(36).substring(7),
    sender_address: sender,
    sender_vip: vip,
    message,
    created_at: new Date().toISOString(),
  };
  mockDb.trollbox.push(newMsg);
  return newMsg;
}
