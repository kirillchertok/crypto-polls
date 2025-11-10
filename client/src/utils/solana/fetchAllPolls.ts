import * as anchor from '@coral-xyz/anchor';

import type { IPoll, Question } from '@/types/IPoll';

const TOKEN_DECIMAL = 1_000_000;

/**
 * Fetch all PollAccount from the blockchain using Anchor's built-in methods
 */
export const fetchAllPolls = async (program: anchor.Program): Promise<IPoll[]> => {
    try {
        console.log('🔍 Fetching all polls from program:', program.programId.toBase58());

        // Use Anchor's built-in method to fetch all PollAccount accounts
        const pollAccounts = await program.account.pollAccount.all();
        
        console.log(`✅ Found ${pollAccounts.length} poll account(s) on blockchain`);

        if (pollAccounts.length === 0) {
            console.warn('⚠️ No poll accounts found. Make sure polls have been created and deployed correctly.');
            return [];
        }

        const polls: IPoll[] = [];

        for (const accountInfo of pollAccounts) {
            try {
                const data = accountInfo.account as any;
                
                console.log('📊 Processing poll:', {
                    pollId: data.pollId,
                    creator: data.creator.toBase58(),
                    topic: data.topic,
                    rewardAmount: data.rewardAmount.toString(),
                    activeUntil: new Date(Number(data.activeUntil) * 1000).toISOString(),
                });

                // Format questions with better type checking
                const questions: Question[] = data.questions.map((q: any) => {
                    // Check the structure of questionType enum
                    const type = q.questionType.one !== undefined || 
                                Object.keys(q.questionType)[0] === 'one' ? 'one' : 'many';
                    
                    return {
                        type,
                        options: q.options,
                    };
                });

                // Calculate vault PDA
                const [vaultPDA] = anchor.web3.PublicKey.findProgramAddressSync(
                    [Buffer.from('vault'), Buffer.from(data.pollId)],
                    program.programId
                );

                // Format date
                const activeUntilDate = new Date(Number(data.activeUntil) * 1000);
                const formattedDate = activeUntilDate.toISOString().split('T')[0];

                const poll: IPoll = {
                    id: data.pollId,
                    creator: data.creator.toBase58(),
                    vault: vaultPDA.toBase58(),
                    topic: data.topic,
                    reward: Number(data.rewardAmount.toString()) / TOKEN_DECIMAL,
                    totalParticipants: data.totalParticipants,
                    claimedParticipants: data.claimedParticipants,
                    activeUntil: formattedDate,
                    questions,
                };

                console.log('✅ Poll processed successfully:', {
                    id: poll.id,
                    reward: poll.reward,
                    activeUntil: poll.activeUntil,
                });

                polls.push(poll);
            } catch (err) {
                console.error('❌ Error processing poll account:', err);
                console.error('Account data:', accountInfo.account);
                // Continue processing other polls
            }
        }

        // Sort by most recent first
        polls.sort((a, b) => new Date(b.activeUntil).getTime() - new Date(a.activeUntil).getTime());

        console.log(`✅ Successfully processed ${polls.length} poll(s)`);
        return polls;
    } catch (error) {
        console.error('❌ Fatal error fetching polls:', error);
        
        // Provide helpful debugging info
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        
        // Return empty array instead of throwing to allow UI to display properly
        return [];
    }
};
