import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import $api from '@/api';
import { useAppSelectore } from '@/store/hooks';
import type { IPoll } from '@/types/IPoll';

import { PollResults } from '../PollResults/PollResults';
import styles from './UserProfile.module.scss';

export const UserProfile = () => {
    const { wallet } = useAppSelectore(state => state.crypto);
    const [polls, setPolls] = useState<IPoll[]>();

    useEffect(() => {
        const fetchPolls = async () => {
            if (!wallet) return;
            try {
                const response = await $api.get(`/polls/creator/${wallet}`);
                setPolls(response.data);
            } catch (err) {
                console.log('Error fetching user polls:', err);
            }
        };

        fetchPolls();
    }, [wallet]);

    if (!wallet) {
        return (
            <Navigate
                to='/'
                replace
            />
        );
    }

    return (
        <>
            <h1>Profile</h1>
            <div className={styles.polls}>
                {polls ? (
                    polls.map(poll => (
                        <>
                            <PollResults poll={poll} />
                        </>
                    ))
                ) : (
                    <>
                        <p>You dont have polls</p>
                    </>
                )}
            </div>
        </>
    );
};
