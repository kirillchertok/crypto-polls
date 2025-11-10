import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { useAppSelectore } from '@/store/hooks';
import type { IPoll } from '@/types/IPoll';
import { getAnchorClient } from '@/utils/solana/anchorClient';
import { fetchUserPolls } from '@/utils/solana/fetchUserPolls';

import { PollResults } from '../PollResults/PollResults';
import styles from './UserProfile.module.scss';

export const UserProfile = () => {
    const { wallet } = useAppSelectore(state => state.crypto);
    const anchorWallet = useAnchorWallet();
    const [polls, setPolls] = useState<IPoll[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPolls = async () => {
            if (!wallet || !anchorWallet) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const { program } = getAnchorClient(anchorWallet);
                const userPolls = await fetchUserPolls(program, wallet);
                setPolls(userPolls);
            } catch (err) {
                console.error('Error fetching user polls from blockchain:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPolls();
    }, [wallet, anchorWallet]);

    if (!wallet) {
        return <Navigate to='/' replace />;
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <h1>Profile</h1>
                <p>Loading your polls from blockchain...</p>
            </div>
        );
    }

    return (
        <>
            <h1>Profile</h1>
            <div className={styles.polls}>
                {polls && polls.length > 0 ? (
                    polls.map(poll => <PollResults key={poll.id} poll={poll} />)
                ) : (
                    <p>You don't have any polls yet. Create your first poll!</p>
                )}
            </div>
        </>
    );
};
