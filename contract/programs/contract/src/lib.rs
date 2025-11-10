use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("FDVeBn4zL2WjX8jPBWoja4z4UUjFixKbYxpgCExx2DeE");

#[program]
pub mod contract {
    use super::*;

    pub fn initialize_registry(ctx: Context<InitializeRegistry>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.bump = ctx.bumps.registry;
        Ok(())
    }

    pub fn create_poll(
        ctx: Context<CreatePoll>,
        poll_id: String,
        reward_amount: u64,
        total_participants: u32,
        ipfs_uri: String, // URI с JSON опроса в IPFS
    ) -> Result<()> {
        let poll_account = &mut ctx.accounts.poll_account;

        poll_account.poll_id = poll_id.clone();
        poll_account.creator = ctx.accounts.creator.key();
        poll_account.reward_amount = reward_amount;
        poll_account.total_participants = total_participants;
        poll_account.claimed_participants = 0;
        poll_account.bump = ctx.bumps.poll_account;
        poll_account.ipfs_uri = ipfs_uri;

        // Перевод токенов в пул
        let cpi_accounts = Transfer {
            from: ctx.accounts.creator_token_account.to_account_info(),
            to: ctx.accounts.poll_vault.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, reward_amount.checked_mul(total_participants as u64).unwrap())?;

        msg!("Poll created and funded");
        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>, poll_id: String) -> Result<()> {
        let poll_account = &mut ctx.accounts.poll_account;

        require!(poll_account.poll_id == poll_id, ErrorCode::InvalidPollId);
        require!(
            poll_account.claimed_participants < poll_account.total_participants,
            ErrorCode::AllRewardsClaimed
        );

        // Получаем info через mutable ссылку, чтобы избежать E0502
        let poll_account_info = poll_account.to_account_info();

        let seeds = &[b"poll", poll_id.as_bytes(), &[poll_account.bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.poll_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: poll_account_info,
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        token::transfer(cpi_ctx, poll_account.reward_amount)?;

        poll_account.claimed_participants += 1;
        msg!("Reward claimed by user");
        Ok(())
    }

    pub fn refund_poll(ctx: Context<RefundPoll>, poll_id: String) -> Result<()> {
        let poll_account = &mut ctx.accounts.poll_account;

        require!(poll_account.poll_id == poll_id, ErrorCode::InvalidPollId);
        require!(
            ctx.accounts.creator.key() == poll_account.creator,
            ErrorCode::Unauthorized
        );

        let poll_account_info = poll_account.to_account_info();
        let seeds = &[b"poll", poll_id.as_bytes(), &[poll_account.bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.poll_vault.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: poll_account_info,
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        token::transfer(cpi_ctx, ctx.accounts.poll_vault.amount)?;
        msg!("Refunded tokens to creator");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,

    #[account(init, payer = initializer, space = 8 + 8, seeds = [b"registry"], bump)]
    pub registry: Account<'info, PollRegistry>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(poll_id: String)]
pub struct CreatePoll<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 8 + 4 + 1 + 200, // id + creator + reward_amount + total_participants + claimed + bump + ipfs_uri
        seeds = [b"poll", poll_id.as_bytes()],
        bump
    )]
    pub poll_account: Account<'info, PollAccount>,

    #[account(mut)]
    pub registry: Account<'info, PollRegistry>,

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

    pub reward_token: Account<'info, anchor_spl::token::Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(poll_id: String)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, seeds = [b"poll", poll_id.as_bytes()], bump = poll_account.bump)]
    pub poll_account: Account<'info, PollAccount>,

    #[account(mut, seeds = [b"vault", poll_id.as_bytes()], bump)]
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

    #[account(mut, seeds = [b"poll", poll_id.as_bytes()], bump = poll_account.bump)]
    pub poll_account: Account<'info, PollAccount>,

    #[account(mut, seeds = [b"vault", poll_id.as_bytes()], bump)]
    pub poll_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct PollAccount {
    pub poll_id: String,
    pub creator: Pubkey,
    pub reward_amount: u64,
    pub total_participants: u32,
    pub claimed_participants: u32,
    pub bump: u8,
    pub ipfs_uri: String, // JSON с вопросами и ответами
}

#[account]
pub struct PollRegistry {
    pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid poll ID")]
    InvalidPollId,
    #[msg("All rewards have been claimed")]
    AllRewardsClaimed,
    #[msg("Unauthorized action")]
    Unauthorized,
}
