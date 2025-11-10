import { useEffect, useState } from 'react';

import $api from '@/api';
import { useAppSelectore } from '@/store/hooks';
import type { IPoll } from '@/types/IPoll';
import { isDateValid } from '@/utils/date';
import { checkVaultBalance } from '@/utils/solana/checkVaultBalance';

import { Poll } from '../Poll/Poll';
import styles from './Polls.module.scss';

export const Polls = () => {
    const [polls, setPolls] = useState<IPoll[]>([]);
    const [filteredPolls, setFilteredPolls] = useState<IPoll[]>([]);
    const [loading, setLoading] = useState(true);
    const { wallet } = useAppSelectore(state => state.crypto);

    useEffect(() => {
        const fetchPolls = async () => {
            try {
                setLoading(true);
                const response = await $api.get('/polls');
                setPolls(response.data);
            } catch (error) {
                console.error('Error fetching polls:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPolls();
    }, []);

    const filterPolls = async (allPolls: IPoll[]) => {
        if (!allPolls.length) return [];

        const filtered = [];

        for (const poll of allPolls) {
            if (!isDateValid(poll.activeUntill)) {
                continue;
            }

            if (wallet && poll.creator === wallet) {
                continue;
            }

            try {
                const hasSufficientFunds = await checkVaultBalance({
                    vaultAddress: poll.vault,
                    requiredAmount: poll.reward,
                });
                if (!hasSufficientFunds) {
                    continue;
                }
            } catch (error) {
                continue;
            }

            filtered.push(poll);
        }

        return filtered;
    };

    useEffect(() => {
        const applyFilters = async () => {
            if (polls.length > 0) {
                const filtered = await filterPolls(polls);
                setFilteredPolls(filtered);
            } else {
                setFilteredPolls([]);
            }
        };

        applyFilters();
    }, [polls, wallet]);

    if (loading) {
        return <div className={styles.loading}>Loading polls...</div>;
    }

    return (
        <>
            <h1 className={styles.header}>Current active polls</h1>
            <div className={styles.polls}>
                {filteredPolls.length > 0 ? (
                    filteredPolls.map(poll => (
                        <Poll
                            key={poll.id}
                            poll={poll}
                        />
                    ))
                ) : (
                    <div className={styles.noPolls}>
                        {polls.length === 0
                            ? 'No polls available'
                            : 'No active polls matching your criteria'}
                    </div>
                )}
            </div>
        </>
    );
};
