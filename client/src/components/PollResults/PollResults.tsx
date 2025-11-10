import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';

import type { IPoll } from '@/types/IPoll';
import { getAnchorClient } from '@/utils/solana/anchorClient';
import type { PollResult } from '@/utils/solana/fetchPollResults';
import { fetchPollResults } from '@/utils/solana/fetchPollResults';

import styles from './PollResults.module.scss';

interface PollResultsProps {
    poll: IPoll;
}

interface ResultStats {
    [questionIndex: number]: {
        [option: string]: number;
    };
}

export const PollResults = ({ poll }: PollResultsProps) => {
    const [results, setResults] = useState<PollResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const anchorWallet = useAnchorWallet();

    useEffect(() => {
        const fetchResults = async () => {
            if (!anchorWallet) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const { program } = getAnchorClient(anchorWallet);
                const pollResults = await fetchPollResults(program, poll.id);
                setResults(pollResults);
            } catch (err) {
                setError('Failed to fetch results from blockchain');
                console.error('Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [poll.id, anchorWallet]);

    const calculateStats = (): ResultStats => {
        const stats: ResultStats = {};

        poll.questions.forEach((question, questionIndex) => {
            stats[questionIndex] = {};
            question.options.forEach(option => {
                stats[questionIndex][option] = 0;
            });
        });

        results.forEach(result => {
            result.answers.forEach((answer, questionIndex) => {
                if (answer.type === 'Multiple') {
                    const values = answer.value as string[];
                    values.forEach(option => {
                        if (stats[questionIndex][option] !== undefined) {
                            stats[questionIndex][option]++;
                        }
                    });
                } else {
                    const value = answer.value as string;
                    if (stats[questionIndex][value] !== undefined) {
                        stats[questionIndex][value]++;
                    }
                }
            });
        });

        return stats;
    };

    const stats = calculateStats();
    const totalParticipants = results.length;

    if (loading) {
        return <div className={styles.loading}>Loading results...</div>;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Results: {poll.topic}</h1>
            <p className={styles.participants}>Total participants: {totalParticipants}</p>

            <div className={styles.resultsContainer}>
                {poll.questions.map((question, questionIndex) => (
                    <div
                        key={questionIndex}
                        className={styles.questionBlock}
                    >
                        <h3 className={styles.questionTitle}>
                            Question {questionIndex + 1} (
                            {question.type === 'one' ? 'Single choice' : 'Multiple choice'})
                        </h3>

                        <div className={styles.optionsList}>
                            {question.options.map((option, optionIndex) => {
                                const votes = stats[questionIndex][option] || 0;
                                const percentage =
                                    totalParticipants > 0
                                        ? ((votes / totalParticipants) * 100).toFixed(1)
                                        : '0';

                                return (
                                    <div
                                        key={optionIndex}
                                        className={styles.optionRow}
                                    >
                                        <span className={styles.optionText}>
                                            {optionIndex + 1}. {option}
                                        </span>
                                        <span className={styles.votes}>
                                            {votes} votes ({percentage}%)
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
