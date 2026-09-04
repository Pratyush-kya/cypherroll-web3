import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateServerSeed } from '@/lib/provably-fair';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
);

// Fallback in-memory store for local testing without external database setup
interface MockProfile {
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
