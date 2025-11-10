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
    console.log('========== SUBMIT POLL RESULTS ==========');
    console.log('Poll ID:', pollId);
    console.log('Raw answers:', JSON.stringify(answers, null, 2));
    
    // Fetch poll to validate answers match questions
    try {
        const pollAccount = await program.account.pollAccount.fetch(pollAccountPDA);
        console.log('Poll questions count:', (pollAccount as any).questions.length);
        console.log('Answers count:', answers.length);
        
        if ((pollAccount as any).questions.length !== answers.length) {
            throw new Error(`Answers count (${answers.length}) doesn't match questions count (${(pollAccount as any).questions.length})`);
        }
    } catch (err) {
        console.error('Error fetching poll account for validation:', err);
    }
    
    const formattedAnswers: any[] = [];
    
    for (let i = 0; i < answers.length; i++) {
        const answer = answers[i];
        console.log(`\n--- Processing answer ${i} ---`);
        console.log('Type:', answer.type);
        console.log('Value:', answer.value);
        console.log('Value type:', typeof answer.value);
        console.log('Is array:', Array.isArray(answer.value));
        
        if (answer.type === 'Single') {
            if (typeof answer.value !== 'string') {
                throw new Error(`Single answer ${i} must be a string, got ${typeof answer.value}`);
            }
            if (!answer.value || answer.value.trim() === '') {
                throw new Error(`Single answer ${i} cannot be empty`);
            }
            const formatted = { single: answer.value };
            console.log('Formatted:', JSON.stringify(formatted));
            formattedAnswers.push(formatted);
        } else if (answer.type === 'Multiple') {
            if (!Array.isArray(answer.value)) {
                throw new Error(`Multiple answer ${i} must be an array, got ${typeof answer.value}`);
            }
            const values = answer.value.filter(v => v && typeof v === 'string' && v.trim() !== '');
            if (values.length === 0) {
                throw new Error(`Multiple answer ${i} must have at least one value`);
            }
            const formatted = { multiple: values };
            console.log('Formatted:', JSON.stringify(formatted));
            formattedAnswers.push(formatted);
        } else {
            throw new Error(`Invalid answer type: ${answer.type}`);
        }
    }
    
    console.log('\n========== FINAL FORMATTED ANSWERS ==========');
    console.log(JSON.stringify(formattedAnswers, null, 2));
    console.log('===========================================\n');

    console.log('Calling program.methods.submitPollResults...');
    const tx = await program.methods
        .submitPollResults(pollId, formattedAnswers)
        .accounts({
            user: walletFull.publicKey,
            pollAccount: pollAccountPDA,
        })
        .rpc();

    console.log('✅ Poll results submitted. Transaction:', tx);
    return tx;
};

