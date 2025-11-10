import {
    createAssociatedTokenAccountInstruction,
    getAccount,
    getAssociatedTokenAddress,
} from '@solana/spl-token';
import type { AnchorWallet } from '@solana/wallet-adapter-react';
import { type PublicKey, Transaction } from '@solana/web3.js';

import { REWARD_TOKEN_MINT } from '@/constants/token';

import { getAnchorClient } from './anchorClient';

interface createUserTokenAccountProps {
    anchorWallet: AnchorWallet | undefined;
}

export const createUserTokenAccount = async ({
    anchorWallet,
}: createUserTokenAccountProps): Promise<PublicKey> => {
    if (!anchorWallet) throw new Error('Wallet not connected');

    const { provider } = getAnchorClient(anchorWallet);
    const userTokenAccount = await getAssociatedTokenAddress(
        REWARD_TOKEN_MINT,
        anchorWallet.publicKey
    );

    try {
        await getAccount(provider.connection, userTokenAccount);
        return userTokenAccount;
    } catch (error) {
        const transaction = new Transaction().add(
            createAssociatedTokenAccountInstruction(
                anchorWallet.publicKey,
                userTokenAccount,
                anchorWallet.publicKey,
                REWARD_TOKEN_MINT
            )
        );

        await provider.sendAndConfirm(transaction);
        return userTokenAccount;
    }
};
