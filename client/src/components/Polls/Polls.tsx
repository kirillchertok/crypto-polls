import * as anchor from '@coral-xyz/anchor';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';

import { useAppSelectore } from '@/store/hooks';
import type { IPoll } from '@/types/IPoll';
import { getAnchorClient } from '@/utils/solana/anchorClient';
import { fetchAllPolls } from '@/utils/solana/fetchAllPolls';

import { Poll } from '../Poll/Poll';
import styles from './Polls.module.scss';

interface BlockchainPoll {
    pollId: string;
    creator: PublicKey;
    topic: string;
    rewardAmount: number;
    totalParticipants: number;
    claimedParticipants: number;
    activeUntil: number;
    questions: {
        questionType: { one?: object; many?: object };
        options: string[];
    }[];
}

export const Polls = () => {
    const [polls, setPolls] = useState<BlockchainPoll[]>([]);
    const [filteredPolls, setFilteredPolls] = useState<BlockchainPoll[]>([]);
    const [loading, setLoading] = useState(true);
    const { wallet } = useAppSelectore(state => state.crypto);
    const anchorWallet = useAnchorWallet();

    // 📡 Получаем все PollAccount с блокчейна

    // ✅ Проверяем баланс в хранилище пула
    const checkVaultBalance = async (
        vaultAddress: string,
        requiredAmount: number
    ): Promise<boolean> => {
        if (!anchorWallet) return false;

        try {
            const { provider } = getAnchorClient(anchorWallet);
            const vaultPublicKey = new PublicKey(vaultAddress);

            const vaultAccountInfo = await provider.connection.getTokenAccountBalance(
                vaultPublicKey
            );
            const currentBalance = vaultAccountInfo.value.uiAmount || 0;

            // rewardAmount у тебя в "токенах" (обычно 1e6 = 1 USDC и т.п.)
            return currentBalance >= requiredAmount / 1_000_000;
        } catch (error) {
            return false;
        }
    };

    const isDateValid = (timestamp: number): boolean => {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        return timestamp > currentTimestamp;
    };

    // 🧩 Фильтрация по дате, создателю и балансу
    const filterPolls = async (allPolls: BlockchainPoll[]) => {
        if (!allPolls.length || !anchorWallet) return [];

        const filtered: BlockchainPoll[] = [];
        const { program } = getAnchorClient(anchorWallet);

        for (const poll of allPolls) {
            // исключаем просроченные
            if (!isDateValid(poll.activeUntil)) continue;

            // исключаем свои опросы
            if (wallet && poll.creator.toBase58() === wallet) continue;

            try {
                const [vaultPDA] = PublicKey.findProgramAddressSync(
                    [Buffer.from('vault'), Buffer.from(poll.pollId)],
                    program.programId
                );

                const hasFunds = await checkVaultBalance(vaultPDA.toBase58(), poll.rewardAmount);

                if (!hasFunds) continue;
            } catch (err) {
                continue;
            }

            filtered.push(poll);
        }

        return filtered;
    };

    // ⚡ Загружаем опросы при инициализации
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

    // 🔍 Применяем фильтры
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

    // 🔄 Преобразование PollAccount -> IPoll (для твоего UI)
    const convertToIPoll = (poll: BlockchainPoll): IPoll => {
        const [vaultPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('vault'), Buffer.from(poll.pollId)],
            new PublicKey('FDVeBn4zL2WjX8jPBWoja4z4UUjFixKbYxpgCExx2DeE') // id твоей программы
        );

        return {
            id: poll.pollId,
            creator: poll.creator.toBase58(),
            vault: vaultPDA.toBase58(),
            topic: poll.topic,
            reward: poll.rewardAmount,
            totalParticipants: poll.totalParticipants,
            claimedParticipants: poll.claimedParticipants,
            activeUntil: new Date(poll.activeUntil * 1000).toLocaleDateString('ru-RU'),
            questions: poll.questions.map(q => ({
                type: q.questionType.one ? 'one' : 'many',
                options: q.options,
            })),
        };
    };

    // 🖼️ UI
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
                            key={poll.pollId}
                            poll={convertToIPoll(poll)}
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
