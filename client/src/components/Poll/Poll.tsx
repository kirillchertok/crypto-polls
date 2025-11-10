import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAppSelectore } from '@/store/hooks';
import type { IPoll } from '@/types/IPoll';
import { getAnchorClient } from '@/utils/solana/anchorClient';
import { fetchPollResults } from '@/utils/solana/fetchPollResults';

import { Button } from '../ui/Button/Button';
import styles from './Poll.module.scss';

interface PollProps {
    poll: IPoll;
}

export const Poll = ({ poll }: PollProps) => {
    const { wallet } = useAppSelectore(state => state.crypto);
    const anchorWallet = useAnchorWallet();
    const [hasTaken, setHasTaken] = useState<boolean>(false);
    const [checking, setChecking] = useState<boolean>(true);

    useEffect(() => {
        const check = async () => {
            if (!wallet || !anchorWallet) {
                setChecking(false);
                return;
            }

            try {
                setChecking(true);
                const { program } = getAnchorClient(anchorWallet);
                const results = await fetchPollResults(program, poll.id);
                
                // Check if current user has already participated
                const userResult = results.find(r => r.user === wallet);
                setHasTaken(!!userResult);
            } catch (e) {
                console.log('Error checking participation:', e);
                setHasTaken(false);
            } finally {
                setChecking(false);
            }
        };

        check();
    }, [wallet, poll.id, anchorWallet]);
    return (
        <>
            <div className={styles.poll}>
                <div className={styles.info}>
                    <div>
                        <p className={styles['info--main']}>Topic: {poll.topic}</p>
                        <p className={styles['info--main']}>
                            Reward: {poll.reward / 1_000_000} RWD
                        </p>
                    </div>
                    <div>
                        <p>
                            Created by:{' '}
                            <span>
                                {poll.creator.slice(0, 6)} ... {poll.creator.slice(-6)}
                            </span>
                        </p>
                        <p>
                            Active until: <span>{poll.activeUntil}</span>
                        </p>
                    </div>
                </div>
                {checking ? (
                    <Button size='medium'>Checking...</Button>
                ) : wallet ? (
                    hasTaken ? (
                        <Button size='medium'>Already participated</Button>
                    ) : (
                        <Link to={`/passage/${poll.id}`}>
                            <Button size='medium'>Take part</Button>
                        </Link>
                    )
                ) : (
                    <Button size='medium'>Connect wallet first</Button>
                )}
            </div>
        </>
    );
};
