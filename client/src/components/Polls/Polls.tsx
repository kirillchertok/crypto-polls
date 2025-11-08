import { useEffect, useState } from 'react';

import $api from '@/api';
import type { IPoll } from '@/types/IPoll';

import { Poll } from '../Poll/Poll';
import styles from './Polls.module.scss';

export const Polls = () => {
    const [polls, setPolls] = useState<IPoll[]>([]);

    useEffect(() => {
        const fetchPolls = async () => {
            const response = await $api.get('/polls');
            setPolls(response.data);
        };

        fetchPolls();
    }, []);
    return (
        <>
            <h1 className={styles.header}>Current active polls</h1>
            <div className={styles.polls}>
                {polls.map(poll => (
                    <Poll poll={poll} />
                ))}
            </div>
        </>
    );
};
