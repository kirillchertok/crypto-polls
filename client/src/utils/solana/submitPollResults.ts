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
    const formattedAnswers = answers.map((answer, index) => {
        if (answer.type === 'Single') {
            // Ensure value is a string
            const value = typeof answer.value === 'string' ? answer.value : String(answer.value);
            console.log(`Answer ${index} (Single):`, value);
            return { single: value };
        } else {
            // Ensure value is an array of strings
            let value: string[];
            if (Array.isArray(answer.value)) {
                value = answer.value.filter(v => v != null && v !== '');
            } else if (typeof answer.value === 'string') {
                value = [answer.value];
            } else {
                console.error('Invalid multiple choice answer:', answer.value);
                value = [];
            }
            console.log(`Answer ${index} (Multiple):`, value);
            return { multiple: value };
        }
    });
    
    console.log('Final formatted answers:', JSON.stringify(formattedAnswers, null, 2));

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

