import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';

import { useAppSelectore } from '@/store/hooks';
import type { IPoll } from '@/types/IPoll';
import { getAnchorClient } from '@/utils/solana/anchorClient';
import { fetchAllPolls } from '@/utils/solana/fetchAllPolls';

import { Poll } from '../Poll/Poll';
import styles from './Polls.module.scss';

export const Polls = () => {
    const [polls, setPolls] = useState<IPoll[]>([]);
    const [filteredPolls, setFilteredPolls] = useState<IPoll[]>([]);
    const [loading, setLoading] = useState(true);
    const { wallet } = useAppSelectore(state => state.crypto);
    const anchorWallet = useAnchorWallet();

    // Check if poll has sufficient balance in vault
    const checkVaultBalance = async (vaultAddress: string, requiredAmount: number): Promise<boolean> => {
        if (!anchorWallet) return false;

        try {
            const { provider } = getAnchorClient(anchorWallet);
            const vaultPublicKey = new PublicKey(vaultAddress);

            const vaultAccountInfo = await provider.connection.getTokenAccountBalance(vaultPublicKey);
            const currentBalance = vaultAccountInfo.value.uiAmount || 0;

            return currentBalance >= requiredAmount;
        } catch (error) {
            console.error('Error checking vault balance:', error);
            return false;
        }
    };

    // Check if poll is still active
    const isDateValid = (dateString: string): boolean => {
        const pollDate = new Date(dateString);
        const currentDate = new Date();
        return pollDate >= currentDate;
    };

    // Filter polls by date, creator, and balance
    const filterPolls = async (allPolls: IPoll[]) => {
        if (!allPolls.length || !anchorWallet) return [];

        const filtered: IPoll[] = [];

        for (const poll of allPolls) {
            // Exclude expired polls
            if (!isDateValid(poll.activeUntil)) continue;

            // Exclude user's own polls
            if (wallet && poll.creator === wallet) continue;

            // Check if vault has sufficient funds
            try {
                const hasFunds = await checkVaultBalance(poll.vault, poll.reward);
                if (!hasFunds) continue;
            } catch (err) {
                continue;
            }

            filtered.push(poll);
        }

        return filtered;
    };

    // Load polls from blockchain on mount
    useEffect(() => {
        const loadPolls = async () => {
            if (!anchorWallet) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const { program } = getAnchorClient(anchorWallet);
                const pollsData = await fetchAllPolls(program);
                setPolls(pollsData);
            } catch (error) {
                console.error('Error fetching polls from blockchain:', error);
                setPolls([]);
            } finally {
                setLoading(false);
            }
        };

        loadPolls();
    }, [anchorWallet]);

    // Apply filters when polls or wallet changes
    useEffect(() => {
        const applyFilters = async () => {
            if (polls.length > 0 && anchorWallet) {
                const filtered = await filterPolls(polls);
                setFilteredPolls(filtered);
            } else {
                setFilteredPolls([]);
            }
        };

        applyFilters();
    }, [polls, wallet, anchorWallet]);

    // UI
    if (!anchorWallet) {
        return <div className={styles.loading}>Please connect your wallet to view polls</div>;
    }

    if (loading) {
        return <div className={styles.loading}>Loading polls from blockchain...</div>;
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
                            ? 'No polls available on blockchain'
                            : 'No active polls matching your criteria'}
                    </div>
                )}
            </div>
        </>
    );
};
