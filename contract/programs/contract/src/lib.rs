use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("FDVeBn4zL2WjX8jPBWoja4z4UUjFixKbYxpgCExx2DeE");

#[program]
pub mod contract {
    use super::*;

    pub fn create_poll(
        ctx: Context<CreatePoll>,
        poll_id: String,
        reward_amount: u64,
        total_participants: u32,
    ) -> Result<()> {
        let poll_account = &mut ctx.accounts.poll_account;
        
        poll_account.poll_id = poll_id;
        poll_account.creator = ctx.accounts.creator.key();
        poll_account.reward_token = ctx.accounts.reward_token.key();
        poll_account.reward_amount = reward_amount;
        poll_account.total_participants = total_participants;
        poll_account.claimed_participants = 0;
        poll_account.bump = ctx.bumps.poll_account;
        
        let total_rewards = reward_amount.checked_mul(total_participants as u64)
            .ok_or(ErrorCode::CalculationOverflow)?;
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.creator_token_account.to_account_info(),
            to: ctx.accounts.poll_vault.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::transfer(cpi_ctx, total_rewards)?;
        
        msg!("Poll created with {} tokens", total_rewards);
        Ok(())
    }

    pub fn claim_reward(
        ctx: Context<ClaimReward>,
        poll_id: String,
    ) -> Result<()> {
        require!(
            ctx.accounts.poll_account.poll_id == poll_id,
            ErrorCode::InvalidPollId
        );
        
        require!(
            ctx.accounts.poll_account.claimed_participants < ctx.accounts.poll_account.total_participants,
            ErrorCode::AllRewardsClaimed
        );
        
        let poll_vault = &ctx.accounts.poll_vault;
        require!(
            poll_vault.amount >= ctx.accounts.poll_account.reward_amount,
            ErrorCode::InsufficientFunds
        );

        let seeds = &[
            b"poll",
            poll_id.as_bytes(),
            &[ctx.accounts.poll_account.bump],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.poll_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.poll_account.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        
        token::transfer(cpi_ctx, ctx.accounts.poll_account.reward_amount)?;
        
        ctx.accounts.poll_account.claimed_participants += 1;
        
        msg!("Reward claimed by {}", ctx.accounts.user.key());
        msg!("Remaining claims: {}", 
            ctx.accounts.poll_account.total_participants - ctx.accounts.poll_account.claimed_participants);
        
        Ok(())
    }

    pub fn refund_poll(
        ctx: Context<RefundPoll>,
        poll_id: String,
    ) -> Result<()> {
        require!(
            ctx.accounts.poll_account.poll_id == poll_id,
            ErrorCode::InvalidPollId
        );
        
        require!(
            ctx.accounts.creator.key() == ctx.accounts.poll_account.creator,
            ErrorCode::Unauthorized
        );

        let seeds = &[
            b"poll",
            poll_id.as_bytes(),
            &[ctx.accounts.poll_account.bump],
        ];
        let signer = &[&seeds[..]];
        
        let refund_amount = ctx.accounts.poll_vault.amount;
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.poll_vault.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: ctx.accounts.poll_account.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        
        token::transfer(cpi_ctx, refund_amount)?;
        
        msg!("Refunded {} tokens to creator", refund_amount);
        
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(poll_id: String)]
pub struct CreatePoll<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        init,
        payer = creator,
        space = PollAccount::LEN,
        seeds = [b"poll", poll_id.as_bytes()],
        bump
    )]
    pub poll_account: Account<'info, PollAccount>,
    
    pub reward_token: Account<'info, anchor_spl::token::Mint>,
    
    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = creator,
        token::mint = reward_token,
        token::authority = poll_account,
        seeds = [b"vault", poll_id.as_bytes()],
        bump
    )]
    pub poll_vault: Account<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(poll_id: String)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"poll", poll_id.as_bytes()],
        bump = poll_account.bump
    )]
    pub poll_account: Account<'info, PollAccount>,
    
    #[account(
        mut,
        seeds = [b"vault", poll_id.as_bytes()],
        bump
    )]
    pub poll_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(poll_id: String)]
pub struct RefundPoll<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"poll", poll_id.as_bytes()],
        bump = poll_account.bump
    )]
    pub poll_account: Account<'info, PollAccount>,
    
    #[account(
        mut,
        seeds = [b"vault", poll_id.as_bytes()],
        bump
    )]
    pub poll_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct PollAccount {
    pub poll_id: String,
    pub creator: Pubkey,
    pub reward_token: Pubkey,
    pub reward_amount: u64,
    pub total_participants: u32,
    pub claimed_participants: u32,
    pub bump: u8,
}

impl PollAccount {
    pub const LEN: usize = 8 + 50 + 32 + 32 + 8 + 4 + 4 + 1;
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid poll ID")]
    InvalidPollId,
    #[msg("All rewards have been claimed")]
    AllRewardsClaimed,
    #[msg("Insufficient funds in vault")]
    InsufficientFunds,
    #[msg("Unauthorized action")]
    Unauthorized,
    #[msg("Calculation overflow")]
    CalculationOverflow,
}