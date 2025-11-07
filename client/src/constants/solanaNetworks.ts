import { clusterApiUrl } from '@solana/web3.js';

export type SOLANA_NETWORKS = 'mainnet-beta' | 'testnet' | 'devnet' | 'local';

export const getEndPoint = (network: SOLANA_NETWORKS): string => {
    if (network === 'local') {
        return 'http://127.0.0.1:8899';
    }

    return clusterApiUrl(network);
};
