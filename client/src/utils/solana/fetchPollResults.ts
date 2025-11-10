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

        // Format results with validation
        const results: PollResult[] = decoded.results.map((result: any, index: number) => {
            console.log(`Processing result ${index + 1}:`, {
                user: result.user.toBase58(),
                answersCount: result.answers.length,
                timestamp: result.timestamp,
                claimed: result.claimed
            });
            
            const answers = result.answers.map((answer: any, answerIndex: number) => {
                if (answer.single !== undefined) {
                    console.log(`  Answer ${answerIndex + 1}: Single - "${answer.single}"`);
                    return { type: 'Single' as const, value: answer.single };
                } else if (answer.multiple !== undefined) {
                    console.log(`  Answer ${answerIndex + 1}: Multiple - [${answer.multiple.join(', ')}]`);
                    return { type: 'Multiple' as const, value: answer.multiple };
                } else {
                    console.error(`  Answer ${answerIndex + 1}: Invalid format`, answer);
                    return { type: 'Single' as const, value: 'Invalid answer' };
                }
            });

            return {
                user: result.user.toBase58(),
                answers,
                timestamp: Number(result.timestamp),
                claimed: result.claimed,
            };
        });

        console.log(`✅ Successfully formatted ${results.length} result(s) for poll ${pollId}`);
        console.log('Results summary:', results.map(r => ({
            user: `${r.user.slice(0, 4)}...${r.user.slice(-4)}`,
            answers: r.answers.length,
            claimed: r.claimed
        })));
        
        return results;
    } catch (err) {
        console.error('Error fetching poll results:', err);
        return [];
    }
};

