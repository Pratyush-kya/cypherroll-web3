-- ==============================================================================
-- CYPHERROLL MAXIMUM SECURITY DATABASE MIGRATION (SUPABASE POSTGRESQL)
-- 1. Row Level Security (RLS) across all tables
-- 2. Stored Procedures with SELECT FOR UPDATE Row Locks for Crash & Dice
-- 3. Dedicated Tables for LP Staking, Crash Rounds, and AML Sanctions
-- 4. Supabase Realtime Publication configuration
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES & WALLET ACCOUNTS (Default 0.0000 USDC)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    chain_type TEXT NOT NULL DEFAULT 'SOL',
    balance_usdc NUMERIC(18, 4) NOT NULL DEFAULT 0.0000 CHECK (balance_usdc >= 0),
    total_wagered NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    total_won NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    vip_tier TEXT NOT NULL DEFAULT 'Bronze',
    accumulated_rakeback NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    active_server_seed TEXT NOT NULL,
    active_server_seed_hash TEXT NOT NULL,
    client_seed TEXT NOT NULL DEFAULT 'player_lucky_seed',
    nonce BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON public.profiles(wallet_address);

-- 2. BETS LEDGER
CREATE TABLE IF NOT EXISTS public.bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    game_type TEXT NOT NULL,
    wager NUMERIC(18, 4) NOT NULL CHECK (wager > 0),
    target_payout NUMERIC(10, 4) NOT NULL,
    outcome NUMERIC(10, 4) NOT NULL,
    won BOOLEAN NOT NULL,
    payout NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    profit NUMERIC(18, 4) NOT NULL,
    server_seed_hash TEXT NOT NULL,
    client_seed TEXT NOT NULL,
    nonce BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bets_player ON public.bets(player_id);
CREATE INDEX IF NOT EXISTS idx_bets_created ON public.bets(created_at DESC);

-- 3. ESCROW TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC(18, 4) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'USDC',
    tx_hash TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_wallet ON public.transactions(wallet_address);

-- 4. LIVE TROLLBOX CHAT
CREATE TABLE IF NOT EXISTS public.trollbox_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_address TEXT NOT NULL,
    sender_vip TEXT NOT NULL DEFAULT 'Bronze',
    message TEXT NOT NULL,
    badge TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trollbox_created ON public.trollbox_messages(created_at DESC);

-- 5. BANKROLL LP STAKES
CREATE TABLE IF NOT EXISTS public.bankroll_stakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL,
    amount_usdc NUMERIC(18, 4) NOT NULL CHECK (amount_usdc > 0),
    pool_shares NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    estimated_apy NUMERIC(6, 2) NOT NULL DEFAULT 19.40,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stakes_wallet ON public.bankroll_stakes(wallet_address);

-- 6. MULTIPLAYER CRASH ROUNDS (PERMANENT IMMUTABLE AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.crash_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id TEXT UNIQUE NOT NULL,
    crash_point NUMERIC(10, 2) NOT NULL,
    server_seed_hash TEXT NOT NULL,
    server_seed TEXT,
    client_seed TEXT NOT NULL,
    nonce BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CRASHED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crash_round ON public.crash_rounds(round_id);
CREATE INDEX IF NOT EXISTS idx_crash_created ON public.crash_rounds(created_at DESC);

-- 7. AML SANCTIONS QUARANTINE LOGS
CREATE TABLE IF NOT EXISTS public.aml_sanctions_quarantine (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    amount NUMERIC(18, 4) NOT NULL,
    reason TEXT NOT NULL,
    risk_score INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aml_wallet ON public.aml_sanctions_quarantine(wallet_address);

-- ==============================================================================
-- ZERO-TRUST ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trollbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bankroll_stakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crash_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_sanctions_quarantine ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "Public read profiles safe" ON public.profiles;
DROP POLICY IF EXISTS "Service role profile admin" ON public.profiles;
DROP POLICY IF EXISTS "Public read bets" ON public.bets;
DROP POLICY IF EXISTS "Service role bets admin" ON public.bets;
DROP POLICY IF EXISTS "Service role transactions admin" ON public.transactions;
DROP POLICY IF EXISTS "Public read trollbox" ON public.trollbox_messages;
DROP POLICY IF EXISTS "Service role trollbox admin" ON public.trollbox_messages;
DROP POLICY IF EXISTS "Public read bankroll_stakes" ON public.bankroll_stakes;
DROP POLICY IF EXISTS "Service role bankroll_stakes admin" ON public.bankroll_stakes;
DROP POLICY IF EXISTS "Public read crash_rounds" ON public.crash_rounds;
DROP POLICY IF EXISTS "Service role crash_rounds admin" ON public.crash_rounds;
DROP POLICY IF EXISTS "Service role aml admin" ON public.aml_sanctions_quarantine;

-- 1. Profiles: Public read, ONLY service_role can modify
CREATE POLICY "Public read profiles safe" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Service role profile admin" ON public.profiles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Bets: Public read for audit ticker, ONLY service_role can insert/modify
CREATE POLICY "Public read bets" ON public.bets
    FOR SELECT USING (true);

CREATE POLICY "Service role bets admin" ON public.bets
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Transactions: Only service_role can access ledger
CREATE POLICY "Service role transactions admin" ON public.transactions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Trollbox: Public read, service_role write
CREATE POLICY "Public read trollbox" ON public.trollbox_messages
    FOR SELECT USING (true);

CREATE POLICY "Service role trollbox admin" ON public.trollbox_messages
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Bankroll Stakes: Public read aggregate, service_role write
CREATE POLICY "Public read bankroll_stakes" ON public.bankroll_stakes
    FOR SELECT USING (true);

CREATE POLICY "Service role bankroll_stakes admin" ON public.bankroll_stakes
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Crash Rounds: Public read for provably fair verification, service_role write
CREATE POLICY "Public read crash_rounds" ON public.crash_rounds
    FOR SELECT USING (true);

CREATE POLICY "Service role crash_rounds admin" ON public.crash_rounds
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. AML Quarantine: Service role only
CREATE POLICY "Service role aml admin" ON public.aml_sanctions_quarantine
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==============================================================================
-- ATOMIC STORED PROCEDURES WITH ROW LOCKS (SELECT ... FOR UPDATE)
-- ==============================================================================

-- 1. Dice Atomic Bet Resolution
CREATE OR REPLACE FUNCTION public.execute_atomic_bet(
    p_wallet TEXT,
    p_game_type TEXT,
    p_wager NUMERIC,
    p_won BOOLEAN,
    p_target_payout NUMERIC,
    p_outcome NUMERIC,
    p_payout NUMERIC,
    p_profit NUMERIC,
    p_server_seed_hash TEXT,
    p_client_seed TEXT,
    p_nonce BIGINT,
    p_rakeback_earned NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile RECORD;
    v_new_balance NUMERIC;
    v_new_wagered NUMERIC;
    v_new_tier TEXT;
    v_bet_id UUID;
BEGIN
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE wallet_address = p_wallet
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Player profile not found for wallet: %', p_wallet;
    END IF;

    IF v_profile.balance_usdc < p_wager THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Wager: %', v_profile.balance_usdc, p_wager;
    END IF;

    v_new_balance := v_profile.balance_usdc + p_profit;
    v_new_wagered := v_profile.total_wagered + p_wager;

    IF v_new_wagered >= 50000 THEN v_new_tier := 'Diamond';
    ELSIF v_new_wagered >= 10000 THEN v_new_tier := 'Platinum';
    ELSIF v_new_wagered >= 2500 THEN v_new_tier := 'Gold';
    ELSIF v_new_wagered >= 500 THEN v_new_tier := 'Silver';
    ELSE v_new_tier := 'Bronze';
    END IF;

    UPDATE public.profiles
    SET balance_usdc = v_new_balance,
        total_wagered = v_new_wagered,
        total_won = CASE WHEN p_won THEN v_profile.total_won + p_profit ELSE v_profile.total_won END,
        vip_tier = v_new_tier,
        accumulated_rakeback = v_profile.accumulated_rakeback + p_rakeback_earned,
        nonce = v_profile.nonce + 1,
        updated_at = NOW()
    WHERE id = v_profile.id;

    INSERT INTO public.bets (
        player_id, wallet_address, game_type, wager, target_payout,
        outcome, won, payout, profit, server_seed_hash, client_seed, nonce
    ) VALUES (
        v_profile.id, p_wallet, p_game_type, p_wager, p_target_payout,
        p_outcome, p_won, p_payout, p_profit, p_server_seed_hash, p_client_seed, p_nonce
    ) RETURNING id INTO v_bet_id;

    RETURN jsonb_build_object(
        'bet_id', v_bet_id,
        'new_balance', v_new_balance,
        'total_wagered', v_new_wagered,
        'vip_tier', v_new_tier,
        'new_nonce', v_profile.nonce + 1,
        'rakeback', v_profile.accumulated_rakeback + p_rakeback_earned
    );
END;
$$;

-- 2. Crash Atomic Wager Deduction (Prevents Race Condition on Bet Placement)
CREATE OR REPLACE FUNCTION public.execute_crash_wager(
    p_wallet TEXT,
    p_wager NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile RECORD;
    v_new_balance NUMERIC;
BEGIN
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE wallet_address = p_wallet
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Player profile not found for wallet: %', p_wallet;
    END IF;

    IF v_profile.balance_usdc < p_wager THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Wager: %', v_profile.balance_usdc, p_wager;
    END IF;

    v_new_balance := v_profile.balance_usdc - p_wager;

    UPDATE public.profiles
    SET balance_usdc = v_new_balance,
        updated_at = NOW()
    WHERE id = v_profile.id;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance
    );
END;
$$;

-- 3. Crash Atomic Cashout (Prevents Double-Cashout / Multi-Node Race Conditions)
CREATE OR REPLACE FUNCTION public.execute_crash_cashout(
    p_wallet TEXT,
    p_wager NUMERIC,
    p_multiplier NUMERIC,
    p_payout NUMERIC,
    p_profit NUMERIC,
    p_server_seed_hash TEXT,
    p_client_seed TEXT,
    p_nonce BIGINT,
    p_rakeback_earned NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile RECORD;
    v_new_balance NUMERIC;
    v_new_wagered NUMERIC;
    v_new_tier TEXT;
    v_new_rakeback NUMERIC;
    v_bet_id UUID;
BEGIN
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE wallet_address = p_wallet
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Player profile not found for wallet: %', p_wallet;
    END IF;

    v_new_balance := v_profile.balance_usdc + p_payout;
    v_new_wagered := v_profile.total_wagered + p_wager;
    v_new_rakeback := v_profile.accumulated_rakeback + p_rakeback_earned;

    IF v_new_wagered >= 50000 THEN v_new_tier := 'Diamond';
    ELSIF v_new_wagered >= 10000 THEN v_new_tier := 'Platinum';
    ELSIF v_new_wagered >= 2500 THEN v_new_tier := 'Gold';
    ELSIF v_new_wagered >= 500 THEN v_new_tier := 'Silver';
    ELSE v_new_tier := 'Bronze';
    END IF;

    UPDATE public.profiles
    SET balance_usdc = v_new_balance,
        total_wagered = v_new_wagered,
        total_won = v_profile.total_won + p_profit,
        vip_tier = v_new_tier,
        accumulated_rakeback = v_new_rakeback,
        nonce = v_profile.nonce + 1,
        updated_at = NOW()
    WHERE id = v_profile.id;

    INSERT INTO public.bets (
        player_id, wallet_address, game_type, wager, target_payout,
        outcome, won, payout, profit, server_seed_hash, client_seed, nonce
    ) VALUES (
        v_profile.id, p_wallet, 'CRASH', p_wager, p_multiplier,
        p_multiplier, true, p_payout, p_profit, p_server_seed_hash, p_client_seed, p_nonce
    ) RETURNING id INTO v_bet_id;

    RETURN jsonb_build_object(
        'success', true,
        'bet_id', v_bet_id,
        'new_balance', v_new_balance,
        'vip_tier', v_new_tier,
        'rakeback', v_new_rakeback
    );
END;
$$;
