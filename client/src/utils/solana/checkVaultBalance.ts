import { Connection, PublicKey } from '@solana/web3.js';

import { TOKEN_DECIMAL } from '@/constants/token';

interface checkVaultBalanceProps {
    vaultAddress: string;
    requiredAmount: number;
}

export const checkVaultBalance = async ({
    vaultAddress,
    requiredAmount,
}: checkVaultBalanceProps): Promise<boolean> => {
    try {
        const connection = new Connection('http://127.0.0.1:8899', 'confirmed');

        let vaultPublicKey;
        try {
            vaultPublicKey = new PublicKey(vaultAddress);
        } catch (error) {
            return false;
        }

        try {
            const vaultAccountInfo = await connection.getTokenAccountBalance(vaultPublicKey);
            const currentBalance = vaultAccountInfo.value.uiAmount || 0;
            return currentBalance >= requiredAmount / TOKEN_DECIMAL;
        } catch (error) {
            return false;
        }
    } catch (error) {
        return false;
    }
};
