import * as anchor from '@coral-xyz/anchor';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

import { getAnchorClient } from './anchorClient';

export interface UserAnswer {
    type: 'Single' | 'Multiple';
    value: string | string[];
}

interface SubmitPollResultsProps {
    pollId: string;
    answers: UserAnswer[];
    walletFull: AnchorWallet;
}

export const submitPollResults = async ({
    pollId,
    answers,
    walletFull,
}: SubmitPollResultsProps): Promise<string> => {
    const { program } = getAnchorClient(walletFull);

    const [pollAccountPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('poll'), Buffer.from(pollId)],
        program.programId
    );

    // Convert answers to the format expected by the contract
    const formattedAnswers = answers.map(answer => {
        if (answer.type === 'Single') {
            return { single: answer.value as string };
        } else {
            return { multiple: answer.value as string[] };
        }
    });

    const tx = await program.methods
        .submitPollResults(pollId, formattedAnswers)
        .accounts({
            user: walletFull.publicKey,
            pollAccount: pollAccountPDA,
        })
        .rpc();

    console.log('Poll results submitted. Transaction:', tx);
    return tx;
};

