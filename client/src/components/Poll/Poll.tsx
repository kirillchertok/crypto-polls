import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import $api from '@/api';
import { useAppSelectore } from '@/store/hooks';
import type { IPoll } from '@/types/IPoll';

import { Button } from '../ui/Button/Button';
import styles from './Poll.module.scss';

interface PollProps {
    poll: IPoll;
}

export const Poll = ({ poll }: PollProps) => {
    const { wallet } = useAppSelectore(state => state.crypto);
    const [hasTaken, setHasTaken] = useState<boolean>(false);

    useEffect(() => {
        const check = async () => {
            try {
                const response = await $api.get(`/results/check/${poll.id}/${wallet}`);
                setHasTaken(response.data.hasTaken);
            } catch (e) {
                console.log(e);
            }
        };

        if (wallet && poll) {
            check();
        }
    }, [wallet, poll]);
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
                {wallet ? (
                    hasTaken ? (
                        <Button
                            size='medium'
                            disabled
                        >
                            You have already participated
                        </Button>
                    ) : (
                        <Link to={`/passage/${poll.id}`}>
                            <Button size='medium'>Take part</Button>
                        </Link>
                    )
                ) : (
                    <Button
                        size='medium'
                        disabled
                    >
                        Connect your wallet first
                    </Button>
                )}
            </div>
        </>
    );
};
