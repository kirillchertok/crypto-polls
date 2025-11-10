use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("FDVeBn4zL2WjX8jPBWoja4z4UUjFixKbYxpgCExx2DeE");

// Constants for size limits
const MAX_QUESTIONS: usize = 10;
const MAX_OPTIONS: usize = 10;
const MAX_OPTION_LEN: usize = 100;
const MAX_TOPIC_LEN: usize = 200;
const MAX_RESULTS_TO_STORE: usize = 50; // Limit results stored on-chain

#[program]
pub mod contract {
    use super::*;

    pub fn create_poll(
        ctx: Context<CreatePoll>,
        poll_id: String,
        reward_amount: u64,
        total_participants: u32,
        topic: String,
        active_until: i64,
        questions: Vec<Question>,
    ) -> Result<()> {
        // Validate inputs
        require!(questions.len() <= MAX_QUESTIONS, ErrorCode::TooManyQuestions);
        require!(topic.len() <= MAX_TOPIC_LEN, ErrorCode::TopicTooLong);
        
        for question in &questions {
            require!(question.options.len() <= MAX_OPTIONS, ErrorCode::TooManyOptions);
            for option in &question.options {
                require!(option.len() <= MAX_OPTION_LEN, ErrorCode::OptionStringTooLong);
            }
        }

        let poll_account = &mut ctx.accounts.poll_account;

        poll_account.poll_id = poll_id.clone();
        poll_account.creator = ctx.accounts.creator.key();
        poll_account.reward_token = ctx.accounts.reward_token.key();
        poll_account.reward_amount = reward_amount;
        poll_account.total_participants = total_participants;
        poll_account.claimed_participants = 0;
        poll_account.bump = ctx.bumps.poll_account;
        poll_account.topic = topic;
        poll_account.active_until = active_until;
        poll_account.questions = questions;
        poll_account.results = Vec::new();

        // Transfer tokens to vault
        let total_amount = reward_amount
            .checked_mul(total_participants as u64)
            .ok_or(ErrorCode::CalculationOverflow)?;

        let cpi_accounts = Transfer {
            from: ctx.accounts.creator_token_account.to_account_info(),
            to: ctx.accounts.poll_vault.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::transfer(cpi_ctx, total_amount)?;

        msg!("Poll created and funded with {} tokens", total_amount);
        Ok(())
    }

    pub fn submit_poll_results(
        ctx: Context<SubmitPollResults>,
        poll_id: String,
        answers: Vec<UserAnswer>,
    ) -> Result<()> {
        let poll_account = &mut ctx.accounts.poll_account;
        let user = ctx.accounts.user.key();
        let clock = Clock::get()?;

        // Validate poll is still active
        require!(clock.unix_timestamp <= poll_account.active_until, ErrorCode::PollExpired);
        
        // Check if user already participated
        require!(
            !poll_account.results.iter().any(|r| r.user == user),
            ErrorCode::AlreadyParticipated
        );

        // Check if we can still accept more results (limit to prevent account size overflow)
        require!(
            poll_account.results.len() < MAX_RESULTS_TO_STORE,
            ErrorCode::AllResultsRecorded
        );
        
        // Also check against configured participant limit
        require!(
            poll_account.results.len() < poll_account.total_participants as usize,
            ErrorCode::AllRewardsClaimed
        );

        // Validate answers match questions
        require!(
            answers.len() == poll_account.questions.len(),
            ErrorCode::InvalidAnswers
        );

        // Store the result
        let result = UserResult {
            user,
            answers,
            timestamp: clock.unix_timestamp,
            claimed: false,
        };
        
        poll_account.results.push(result);

        msg!("Poll results submitted by user {}", user);
        Ok(())
    }

    pub fn claim_reward(
        ctx: Context<ClaimReward>,
        poll_id: String,
    ) -> Result<()> {
        let poll_account = &mut ctx.accounts.poll_account;
        let user = ctx.accounts.user.key();

        require!(poll_account.poll_id == poll_id, ErrorCode::InvalidPollId);

        // Find user's result index first
        let user_result_index = poll_account
            .results
            .iter()
            .position(|r| r.user == user)
            .ok_or(ErrorCode::NoResultsFound)?;

        // Check if already claimed (accessing by index avoids borrow issues)
        require!(!poll_account.results[user_result_index].claimed, ErrorCode::AlreadyClaimed);

        // Check if there are rewards available
        require!(
            poll_account.claimed_participants < poll_account.total_participants,
            ErrorCode::AllRewardsClaimed
        );

        // Get the values we need before the CPI call
        let reward_amount = poll_account.reward_amount;
        let bump = poll_account.bump;

        // Transfer reward to user
        let seeds = &[b"poll", poll_id.as_bytes(), &[bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.poll_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: poll_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        token::transfer(cpi_ctx, reward_amount)?;

        // Now update the state
        poll_account.results[user_result_index].claimed = true;
        poll_account.claimed_participants += 1;

        msg!("Reward of {} claimed by user {}", reward_amount, user);
        Ok(())
    }

    pub fn refund_poll(ctx: Context<RefundPoll>, poll_id: String) -> Result<()> {
        let poll_account = &mut ctx.accounts.poll_account;

        require!(poll_account.poll_id == poll_id, ErrorCode::InvalidPollId);
        require!(
            ctx.accounts.creator.key() == poll_account.creator,
            ErrorCode::Unauthorized
        );

        // Get values before CPI
        let bump = poll_account.bump;
        let vault_amount = ctx.accounts.poll_vault.amount;

        let seeds = &[b"poll", poll_id.as_bytes(), &[bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.poll_vault.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: poll_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        token::transfer(cpi_ctx, vault_amount)?;
        msg!("Refunded {} tokens to creator", vault_amount);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(poll_id: String, reward_amount: u64, total_participants: u32, topic: String, active_until: i64, questions: Vec<Question>)]
pub struct CreatePoll<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = calculate_poll_account_size(&poll_id, &topic, &questions),
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
pub struct SubmitPollResults<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, seeds = [b"poll", poll_id.as_bytes()], bump = poll_account.bump)]
    pub poll_account: Account<'info, PollAccount>,
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

// ========== DATA STRUCTURES ==========

#[account]
pub struct PollAccount {
    pub poll_id: String,
    pub creator: Pubkey,
    pub reward_token: Pubkey,
    pub reward_amount: u64,
    pub total_participants: u32,
    pub claimed_participants: u32,
    pub bump: u8,
    pub topic: String,
    pub active_until: i64,
    pub questions: Vec<Question>,
    pub results: Vec<UserResult>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Question {
    pub question_type: QuestionType,
    pub options: Vec<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum QuestionType {
    One,
    Many,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UserResult {
    pub user: Pubkey,
    pub answers: Vec<UserAnswer>,
    pub timestamp: i64,
    pub claimed: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum UserAnswer {
    Single(String),
    Multiple(Vec<String>),
}

fn calculate_poll_account_size(poll_id: &str, topic: &str, questions: &[Question]) -> usize {
    let base_size = 8 + // discriminator
        4 + poll_id.len() + // poll_id string
        32 + // creator pubkey
        32 + // reward_token pubkey
        8 + // reward_amount u64
        4 + // total_participants u32
        4 + // claimed_participants u32
        1 + // bump u8
        4 + topic.len() + // topic string
        8 + // active_until i64
        4; // questions vec length prefix

    // Calculate actual questions size
    let questions_size: usize = questions
        .iter()
        .map(|q| {
            1 + // enum discriminator for QuestionType
            4 + // options vec length prefix
            q.options.iter().map(|opt| 4 + opt.len()).sum::<usize>() // each option
        })
        .sum();

    // Reserve reasonable space for results
    // Each result: 32 (pubkey) + 4 (vec len) + ~80 (answers estimate) + 8 (timestamp) + 1 (bool) = ~125 bytes
    // Reserve for MAX_RESULTS_TO_STORE results
    let results_reserve = 4 + (MAX_RESULTS_TO_STORE * 150); // 4 bytes vec len + results

    base_size + questions_size + results_reserve
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
    #[msg("Poll has expired")]
    PollExpired,
    #[msg("User already participated in this poll")]
    AlreadyParticipated,
    #[msg("No results found for user")]
    NoResultsFound,
    #[msg("Reward already claimed")]
    AlreadyClaimed,
    #[msg("Too many questions (exceeds max)")]
    TooManyQuestions,
    #[msg("Too many options in a question (exceeds max)")]
    TooManyOptions,
    #[msg("Option string length too long")]
    OptionStringTooLong,
    #[msg("Topic string too long")]
    TopicTooLong,
    #[msg("All results already recorded (no more submissions allowed)")]
    AllResultsRecorded,
    #[msg("Invalid answers provided")]
    InvalidAnswers,
}
