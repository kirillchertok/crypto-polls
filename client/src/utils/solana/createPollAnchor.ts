import * as anchor from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { v4 } from 'uuid';

import { REWARD_TOKEN_MINT, TOKEN_DECIMAL } from '@/constants/token';

import { getAnchorClient } from './anchorClient';

interface createPollAnchorProps {
    total: number;
    passages: number;
    walletFull: AnchorWallet;
}

export const createPollAnchor = async ({ total, passages, walletFull }: createPollAnchorProps) => {
    const pollId = v4().replace(/-/g, '').slice(0, 32);
    const rewardPerUser = Math.floor((total * TOKEN_DECIMAL) / passages);
    const totalParticipants = passages;

    const { program } = getAnchorClient(walletFull);

    const [pollAccountPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('poll'), Buffer.from(pollId)],
        program.programId
    );

    const [pollVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), Buffer.from(pollId)],
        program.programId
    );

    const creatorTokenAccount = await getAssociatedTokenAddress(
        REWARD_TOKEN_MINT,
        walletFull.publicKey
    );

    await program.methods
        .createPoll(pollId, new anchor.BN(rewardPerUser), totalParticipants)
        .accounts({
            creator: walletFull.publicKey,
            pollAccount: pollAccountPDA,
            rewardToken: REWARD_TOKEN_MINT,
            creatorTokenAccount,
            pollVault: pollVaultPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

    return { pollId, rewardPerUser, pollVaultPDA, totalParticipants };
};
