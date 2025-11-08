import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Link } from 'react-router-dom';

import { usePhantomConnection } from '@/hooks/usePhantomConnection';
import { useAppSelectore } from '@/store/hooks';

import { Nav } from '../Nav/Nav';
import styles from './Header.module.scss';

export const Header = () => {
    const { wallet } = useAppSelectore(state => state.crypto);

    usePhantomConnection();
    return (
        <>
            <header className={styles.header}>
                <Link to='/'>
                    <h1 className={styles.header__name}>Crypto Polls</h1>
                </Link>
                <div className={styles.header__btns}>
                    {wallet && <Nav />}
                    <WalletMultiButton />
                </div>
            </header>
        </>
    );
};
