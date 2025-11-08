export interface IPollResult {
    _id?: string;
    pollId: string;
    userWallet: string;
    answers: (string | string[])[];
    timestamp: string;
    rewardClaimed: boolean;
    createdAt?: string;
    updatedAt?: string;
}
