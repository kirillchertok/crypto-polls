import type { AnchorWallet } from '@solana/wallet-adapter-react';

import { claimReward } from './claimReward';
import type { UserAnswer } from './submitPollResults';
import { submitPollResults } from './submitPollResults';

interface SubmitAndClaimProps {
    pollId: string;
    answers: UserAnswer[];
    walletFull: AnchorWallet;
}

/**
 * Submit poll results and immediately claim the reward
 * This is the main function users will call to complete a poll
 */
export const submitAndClaim = async ({
    pollId,
    answers,
    walletFull,
}: SubmitAndClaimProps): Promise<{ submitTx: string; claimTx: string }> => {
    try {
        // First, submit the poll results
        console.log('Submitting poll results...');
        const submitTx = await submitPollResults({ pollId, answers, walletFull });
        console.log('Poll results submitted successfully');

        // Then, claim the reward
        console.log('Claiming reward...');
        const claimTx = await claimReward({ pollId, walletFull });
        console.log('Reward claimed successfully');

        return { submitTx, claimTx };
    } catch (error) {
        console.error('Error in submitAndClaim:', error);
        throw error;
    }
};

