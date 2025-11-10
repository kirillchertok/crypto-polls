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
        try {
            const pollDate = new Date(dateString);
            const currentDate = new Date();
            
            // Set time to end of day for poll date (23:59:59)
            pollDate.setHours(23, 59, 59, 999);
            
            console.log('Date check:', {
                pollDateString: dateString,
                pollDate: pollDate.toISOString(),
                currentDate: currentDate.toISOString(),
                isValid: pollDate >= currentDate
            });
            
            return pollDate >= currentDate;
        } catch (err) {
            console.error('Error parsing date:', dateString, err);
            return true; // If date parsing fails, show the poll anyway
        }
    };

    // Filter polls by date, creator, and balance
    const filterPolls = async (allPolls: IPoll[]) => {
        if (!allPolls.length) return [];

        const filtered: IPoll[] = [];

        for (const poll of allPolls) {
            console.log('Checking poll:', {
                id: poll.id,
                creator: poll.creator,
                currentWallet: wallet,
                activeUntil: poll.activeUntil,
                isExpired: !isDateValid(poll.activeUntil),
                isOwnPoll: wallet && poll.creator === wallet,
            });

            // Exclude expired polls
            if (!isDateValid(poll.activeUntil)) {
                console.log('Poll expired, skipping');
                continue;
            }

            // Exclude user's own polls
            if (wallet && poll.creator === wallet) {
                console.log('Own poll, skipping');
                continue;
            }

            // Check if vault has sufficient funds (but don't fail silently)
            if (anchorWallet) {
                try {
                    const hasFunds = await checkVaultBalance(poll.vault, poll.reward);
                    console.log('Vault balance check:', { hasFunds, reward: poll.reward });
                    if (!hasFunds) {
                        console.log('Insufficient funds in vault, skipping');
                        continue;
                    }
                } catch (err) {
                    console.error('Error checking vault balance, including poll anyway:', err);
                    // Include poll even if balance check fails - let smart contract handle it
                }
            }

            console.log('Poll passed all filters, adding to list');
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
                console.log('Fetched polls from blockchain:', pollsData);
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
                        {polls.length === 0 ? (
                            <div>
                                <p>No polls available on blockchain</p>
                                <p style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
                                    Create your first poll or wait for others to create one
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p>No active polls matching your criteria</p>
                                <p style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
                                    Found {polls.length} poll(s) on blockchain, but they were filtered out.
                                    <br />
                                    Check browser console (F12) for details.
                                    <br />
                                    Possible reasons: expired, your own polls, or vault balance issues.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};
