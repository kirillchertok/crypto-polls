import * as anchor from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

import { getAnchorClient } from './anchorClient';
import { createUserTokenAccount } from './createUserTokenAccount';

interface ClaimRewardProps {
    pollId: string;
    walletFull: AnchorWallet;
}

export const claimReward = async ({ pollId, walletFull }: ClaimRewardProps): Promise<string> => {
    const { program } = getAnchorClient(walletFull);

    const [pollAccountPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('poll'), Buffer.from(pollId)],
        program.programId
    );

    const [pollVaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), Buffer.from(pollId)],
        program.programId
    );

    const userTokenAccount = await createUserTokenAccount({ anchorWallet: walletFull });

    const tx = await program.methods
        .claimReward(pollId)
        .accounts({
            user: walletFull.publicKey,
            pollAccount: pollAccountPDA,
            pollVault: pollVaultPDA,
            userTokenAccount: userTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

    console.log('Reward claimed. Transaction:', tx);
    return tx;
};

