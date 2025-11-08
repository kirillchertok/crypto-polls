import { useEffect, useState } from 'react';

import $api from '@/api';
import type { IPoll } from '@/types/IPoll';
import type { IPollResult } from '@/types/IPollResults';

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
    const [results, setResults] = useState<IPollResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                setLoading(true);
                const response = await $api.get(`/results/poll/${poll.id}`);
                setResults(response.data);
            } catch (err) {
                setError('Failed to fetch results');
                console.error('Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [poll.id]);

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
                if (Array.isArray(answer)) {
                    answer.forEach(option => {
                        if (stats[questionIndex][option] !== undefined) {
                            stats[questionIndex][option]++;
                        }
                    });
                } else {
                    if (stats[questionIndex][answer] !== undefined) {
                        stats[questionIndex][answer]++;
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
