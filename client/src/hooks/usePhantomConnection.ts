import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect } from 'react';

import { useAppDispatch } from '@/store/hooks';
import { setWallet } from '@/store/slices/cryptoSlice';

export const usePhantomConnection = () => {
    const dispatch = useAppDispatch();
    const { publicKey, connected } = useWallet();

    useEffect(() => {
        if (connected && publicKey) {
            dispatch(setWallet(publicKey.toBase58()));
        } else {
            dispatch(setWallet(null));
        }
    }, [connected, publicKey, dispatch]);
};
