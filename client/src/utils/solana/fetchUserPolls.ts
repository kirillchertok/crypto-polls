import * as anchor from '@coral-xyz/anchor';

import type { IPoll } from '@/types/IPoll';

import { fetchAllPolls } from './fetchAllPolls';

/**
 * Fetch all polls created by a specific user
 */
export const fetchUserPolls = async (
    program: anchor.Program,
    userWallet: string
): Promise<IPoll[]> => {
    const allPolls = await fetchAllPolls(program);
    
    // Filter polls created by this user
    const userPolls = allPolls.filter(poll => poll.creator === userWallet);
    
    console.log(`🔍 Found ${userPolls.length} poll(s) created by ${userWallet}`);
    
    return userPolls;
};

