-- ==============================================================================
-- CYPHERROLL PRODUCTION DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- Includes: Profiles, Balances, Atomic Betting RPCs, Provably Fair Seeds, 
--           VIP Tiers, Escrow Transactions, and Live Trollbox.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES & WALLET ACCOUNTS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    chain_type TEXT NOT NULL DEFAULT 'SOL', -- 'SOL' or 'EVM'
    balance_usdc NUMERIC(18, 4) NOT NULL DEFAULT 1000.0000 CHECK (balance_usdc >= 0),
    total_wagered NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    total_won NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    vip_tier TEXT NOT NULL DEFAULT 'Bronze', -- Bronze, Silver, Gold, Platinum, Diamond
    accumulated_rakeback NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    active_server_seed TEXT NOT NULL,
    active_server_seed_hash TEXT NOT NULL,
    client_seed TEXT NOT NULL DEFAULT 'player_lucky_seed',
    nonce BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast wallet lookups
CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON public.profiles(wallet_address);

-- 2. BETS LEDGER (IMMUTABLE AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    game_type TEXT NOT NULL, -- 'DICE', 'CRASH', 'PLINKO'
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

-- 3. ESCROW DEPOSITS & WITHDRAWALS
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    type TEXT NOT NULL, -- 'DEPOSIT', 'WITHDRAWAL', 'RAKEBACK_CLAIM'
    amount NUMERIC(18, 4) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'USDC',
    tx_hash TEXT,
    status TEXT NOT NULL DEFAULT 'CONFIRMED', -- 'PENDING', 'CONFIRMED', 'FAILED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. LIVE TROLLBOX COMMUNITY CHAT
CREATE TABLE IF NOT EXISTS public.trollbox_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_address TEXT NOT NULL,
    sender_vip TEXT NOT NULL DEFAULT 'Bronze',
    message TEXT NOT NULL,
    badge TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trollbox_created ON public.trollbox_messages(created_at DESC);

-- ==============================================================================
-- ATOMIC STORED PROCEDURE: EXECUTE BET TRANSACTION SAFELY
-- Prevents double-spending, negative balances, and race conditions via ROW LOCK
-- ==============================================================================
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
AS $$
DECLARE
    v_profile RECORD;
    v_new_balance NUMERIC;
    v_new_wagered NUMERIC;
    v_new_tier TEXT;
    v_bet_id UUID;
BEGIN
    -- 1. Acquire exclusive row lock on the player account (SELECT FOR UPDATE)
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE wallet_address = p_wallet
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Player profile not found for wallet: %', p_wallet;
    END IF;

    -- 2. Concurrency Safety: Ensure sufficient funds
    IF v_profile.balance_usdc < p_wager THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Wager: %', v_profile.balance_usdc, p_wager;
    END IF;

    -- 3. Calculate new balance
    v_new_balance := v_profile.balance_usdc + p_profit;
    v_new_wagered := v_profile.total_wagered + p_wager;

    -- Calculate VIP Tier based on volume
    IF v_new_wagered >= 50000 THEN
        v_new_tier := 'Diamond';
    ELSIF v_new_wagered >= 10000 THEN
        v_new_tier := 'Platinum';
    ELSIF v_new_wagered >= 2500 THEN
        v_new_tier := 'Gold';
    ELSIF v_new_wagered >= 500 THEN
        v_new_tier := 'Silver';
    ELSE
        v_new_tier := 'Bronze';
    END IF;

    -- 4. Update Profile
    UPDATE public.profiles
    SET balance_usdc = v_new_balance,
        total_wagered = v_new_wagered,
        total_won = CASE WHEN p_won THEN v_profile.total_won + p_profit ELSE v_profile.total_won END,
        vip_tier = v_new_tier,
        accumulated_rakeback = v_profile.accumulated_rakeback + p_rakeback_earned,
        nonce = v_profile.nonce + 1,
        updated_at = NOW()
    WHERE id = v_profile.id;

    -- 5. Record Immutable Bet in Ledger
    INSERT INTO public.bets (
        player_id, wallet_address, game_type, wager, target_payout,
        outcome, won, payout, profit, server_seed_hash, client_seed, nonce
    ) VALUES (
        v_profile.id, p_wallet, p_game_type, p_wager, p_target_payout,
        p_outcome, p_won, p_payout, p_profit, p_server_seed_hash, p_client_seed, p_nonce
    ) RETURNING id INTO v_bet_id;

    -- 6. Return updated profile state to caller
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
