import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { SOLANA_NETWORKS } from '@/constants/solanaNetworks';

interface CryptoState {
    network: SOLANA_NETWORKS;
    wallet: string | null;
}

const initialState: CryptoState = {
    network: 'devnet',
    wallet: null,
};

const cryptoSlice = createSlice({
    name: 'crypto',
    initialState,
    reducers: {
        setWallet(state, action: PayloadAction<string | null>) {
            state.wallet = action.payload;
        },
        setNetwork(state, action: PayloadAction<SOLANA_NETWORKS>) {
            state.network = action.payload;
        },
    },
});

export const { setWallet, setNetwork } = cryptoSlice.actions;
export default cryptoSlice.reducer;
