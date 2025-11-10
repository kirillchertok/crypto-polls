import * as anchor from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';

import { REWARD_TOKEN_MINT, TOKEN_DECIMAL } from '@/constants/token';
import type { Question } from '@/types/IPoll';

import { getAnchorClient } from './anchorClient';

export interface CreatePollParams {
    topic: string;
    rewardPerUser: number; // in tokens
    totalParticipants: number;
    activeUntil: string;
    questions: Question[];
    walletFull: AnchorWallet;
}

export const createPollAnchor = async ({
    topic,
    rewardPerUser,
    totalParticipants,
    activeUntil,
    questions,
    walletFull,
}: CreatePollParams) => {
    // Generate a unique poll ID
    const pollId = `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Convert reward to smallest unit (with decimals)
    const rewardAmount = new anchor.BN(rewardPerUser * TOKEN_DECIMAL);
    
    // Convert date to Unix timestamp
    const activeUntilTimestamp = new anchor.BN(
        Math.floor(new Date(activeUntil).getTime() / 1000)
    );

    const { program } = getAnchorClient(walletFull);

    const [pollAccountPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('poll'), Buffer.from(pollId)],
        program.programId
    );

    const [pollVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), Buffer.from(pollId)],
        program.programId
    );

    const rewardTokenMint = new PublicKey(REWARD_TOKEN_MINT);
    const creatorTokenAccount = await getAssociatedTokenAddress(
        rewardTokenMint,
        walletFull.publicKey
    );

    // Format questions for the contract
    const formattedQuestions = questions.map(q => ({
        questionType: q.type === 'one' ? { one: {} } : { many: {} },
        options: q.options,
    }));

    const tx = await program.methods
        .createPoll(
            pollId,
            rewardAmount,
            totalParticipants,
            topic,
            activeUntilTimestamp,
            formattedQuestions
        )
        .accounts({
            creator: walletFull.publicKey,
            pollAccount: pollAccountPDA,
            rewardToken: rewardTokenMint,
            creatorTokenAccount,
            pollVault: pollVaultPDA,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

    console.log('Poll created successfully. Transaction:', tx);

    return {
        pollId,
        rewardAmount: rewardAmount.toNumber(),
        pollVaultPDA,
        totalParticipants,
        pollAccountPDA,
        tx,
    };
};
