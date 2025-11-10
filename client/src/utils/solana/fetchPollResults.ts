import * as anchor from '@coral-xyz/anchor';
import { sha256 } from '@noble/hashes/sha256';
import { PublicKey } from '@solana/web3.js';

export interface PollResult {
    user: string;
    answers: Array<{ type: 'Single' | 'Multiple'; value: string | string[] }>;
    timestamp: number;
    claimed: boolean;
}

/**
 * Generate discriminator for account type (8 bytes)
 */
function getDiscriminator(name: string): Buffer {
    const preimage = `account:${name}`;
    const hash = sha256(new TextEncoder().encode(preimage));
    return Buffer.from(hash).slice(0, 8);
}

/**
 * Fetch results for a specific poll
 */
export const fetchPollResults = async (
    program: anchor.Program,
    pollId: string
): Promise<PollResult[]> => {
    try {
        const [pollAccountPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('poll'), Buffer.from(pollId)],
            program.programId
        );

        const discriminator = getDiscriminator('PollAccount');
        const accountInfo = await program.provider.connection.getAccountInfo(pollAccountPDA);

        if (!accountInfo) {
            console.warn('Poll account not found');
            return [];
        }

        const coder = new anchor.BorshAccountsCoder(program.idl);
        const decoded = coder.decodeUnchecked('PollAccount', accountInfo.data);

        if (!decoded || !decoded.results) {
            return [];
        }

        // Format results
        const results: PollResult[] = decoded.results.map((result: any) => {
            const answers = result.answers.map((answer: any) => {
                if (answer.single !== undefined) {
                    return { type: 'Single' as const, value: answer.single };
                } else {
                    return { type: 'Multiple' as const, value: answer.multiple };
                }
            });

            return {
                user: result.user.toBase58(),
                answers,
                timestamp: Number(result.timestamp),
                claimed: result.claimed,
            };
        });

        console.log(`🔍 Found ${results.length} result(s) for poll ${pollId}`);
        return results;
    } catch (err) {
        console.error('Error fetching poll results:', err);
        return [];
    }
};

