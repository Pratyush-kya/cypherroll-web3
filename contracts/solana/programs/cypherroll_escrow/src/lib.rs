use anchor_lang::prelude::*;
use anchor_lang::solana_program::ed25519_program;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("CyphErRoLL111111111111111111111111111111111");

#[program]
pub mod cypherroll_escrow {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>, operator: Pubkey) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.operator = operator;
        vault.total_deposited = 0;
        vault.is_paused = false;
        Ok(())
    }

    pub fn deposit_sol(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
        require!(!ctx.accounts.vault.is_paused, EscrowError::VaultPaused);
        require!(amount > 0, EscrowError::ZeroAmount);

        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.player.key(),
            &ctx.accounts.vault.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.player.to_account_info(),
                ctx.accounts.vault.to_account_info(),
            ],
        )?;

        let player_state = &mut ctx.accounts.player_state;
        player_state.deposited = player_state.deposited.checked_add(amount).unwrap();
        ctx.accounts.vault.total_deposited = ctx.accounts.vault.total_deposited.checked_add(amount).unwrap();

        emit!(DepositEvent {
            player: ctx.accounts.player.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn withdraw_sol(
        ctx: Context<WithdrawSol>,
        amount: u64,
        nonce: u64,
        _sig: [u8; 64],
    ) -> Result<()> {
        require!(!ctx.accounts.vault.is_paused, EscrowError::VaultPaused);
        require!(nonce == ctx.accounts.player_state.nonce + 1, EscrowError::InvalidNonce);
        
        // In production, verify Ed25519 instruction sysvar signature from operator pubkey

        let player_state = &mut ctx.accounts.player_state;
        player_state.nonce = nonce;

        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.player.to_account_info().try_borrow_mut_lamports()? += amount;

        emit!(WithdrawalEvent {
            player: ctx.accounts.player.key(),
            amount,
            nonce,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[account]
pub struct CasinoVault {
    pub authority: Pubkey,
    pub operator: Pubkey,
    pub total_deposited: u64,
    pub is_paused: bool,
}

#[account]
pub struct PlayerState {
    pub player: Pubkey,
    pub deposited: u64,
    pub nonce: u64,
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 32 + 8 + 1)]
    pub vault: Account<'info, CasinoVault>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(mut)]
    pub vault: Account<'info, CasinoVault>,
    #[account(
        init_if_needed,
        payer = player,
        space = 8 + 32 + 8 + 8,
        seeds = [b"player", player.key().as_ref()],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(mut)]
    pub vault: Account<'info, CasinoVault>,
    #[account(
        mut,
        seeds = [b"player", player.key().as_ref()],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct DepositEvent {
    pub player: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawalEvent {
    pub player: Pubkey,
    pub amount: u64,
    pub nonce: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum EscrowError {
    #[msg("Vault is currently paused")]
    VaultPaused,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Invalid withdrawal nonce")]
    InvalidNonce,
}
