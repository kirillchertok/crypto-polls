import * as anchor from '@coral-xyz/anchor';
import { sha256 } from '@noble/hashes/sha256';

import type { IPoll, Question } from '@/types/IPoll';

/**
 * Generate discriminator for account type (8 bytes)
 */
function getDiscriminator(name: string): Buffer {
    const preimage = `account:${name}`;
    const hash = sha256(new TextEncoder().encode(preimage));
    return Buffer.from(hash).slice(0, 8);
}

/**
 * Fetch all PollAccount from the blockchain
 */
export const fetchAllPolls = async (program: anchor.Program): Promise<IPoll[]> => {
    const connection = program.provider.connection;
    const discriminator = getDiscriminator('PollAccount');

    // Find all accounts with the correct discriminator
    const accounts = await connection.getProgramAccounts(program.programId, {
        filters: [
            {
                memcmp: {
                    offset: 0,
                    bytes: anchor.utils.bytes.bs58.encode(discriminator),
                },
            },
        ],
    });

    console.log(`🔍 Found ${accounts.length} PollAccount(s)`);

    // Use coder directly
    const coder = new anchor.BorshAccountsCoder(program.idl);
    const polls: IPoll[] = [];

    for (const acc of accounts) {
        try {
            const decoded = coder.decodeUnchecked('PollAccount', acc.account.data);
            if (!decoded || !decoded.pollId) continue;

            // Format questions
            const questions: Question[] = decoded.questions.map((q: any) => ({
                type: q.questionType.one !== undefined ? 'one' : 'many',
                options: q.options,
            }));

            // Calculate vault PDA
            const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
                [Buffer.from('vault'), Buffer.from(decoded.pollId)],
                program.programId
            );

            // Format date
            const activeUntilDate = new Date(Number(decoded.activeUntil) * 1000);

            polls.push({
                id: decoded.pollId,
                creator: decoded.creator.toBase58(),
                vault: vaultPDA.toBase58(),
                topic: decoded.topic,
                reward: Number(decoded.rewardAmount) / 1000000, // Convert from smallest unit
                totalParticipants: decoded.totalParticipants,
                claimedParticipants: decoded.claimedParticipants,
                activeUntil: activeUntilDate.toISOString().split('T')[0],
                questions,
            });
        } catch (err) {
            console.warn('⚠️ Error decoding account:', err);
            continue;
        }
    }

    // Sort by most recent first
    polls.sort((a, b) => new Date(b.activeUntil).getTime() - new Date(a.activeUntil).getTime());

    return polls;
};
