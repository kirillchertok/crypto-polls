// This type is kept for backwards compatibility but is no longer used
// Poll results are now stored on-chain and accessed via fetchPollResults utility
export interface IPollResult {
    pollId: string;
    userWallet: string;
    answers: (string | string[])[];
    timestamp: string;
    rewardClaimed: boolean;
}
