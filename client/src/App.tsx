import '@/assets/styles/global.scss';
import '@solana/wallet-adapter-react-ui/styles.css';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useMemo } from 'react';
import { Route, Routes } from 'react-router-dom';

import { ROUTES } from './constants/routes';
import { getEndPoint } from './constants/solanaNetworks';
import { useAppSelectore } from './store/hooks';

function App() {
    const { network } = useAppSelectore(state => state.crypto);

    const endpoint = useMemo(() => getEndPoint(network), [network]);
    const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
    return (
        <>
            <ConnectionProvider endpoint={endpoint}>
                <WalletProvider
                    wallets={wallets}
                    autoConnect={false}
                >
                    <WalletModalProvider>
                        <Routes>
                            {ROUTES.map(({ path, element }) => (
                                <Route
                                    key={path}
                                    path={path}
                                    element={element}
                                />
                            ))}
                        </Routes>
                    </WalletModalProvider>
                </WalletProvider>
            </ConnectionProvider>
        </>
    );
}

export default App;
