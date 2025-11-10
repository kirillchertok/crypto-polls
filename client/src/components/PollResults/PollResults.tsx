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

type ViewMode = 'aggregate' | 'individual';

export const PollResults = ({ poll }: PollResultsProps) => {
    const [results, setResults] = useState<PollResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('aggregate');
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
                
                console.log('📊 Poll Results fetched:', {
                    pollId: poll.id,
                    totalParticipants: pollResults.length,
                    results: pollResults
                });
                
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
    
    const formatUserAddress = (address: string): string => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };
    
    const formatTimestamp = (timestamp: number): string => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString();
    };

    if (loading) {
        return <div className={styles.loading}>Loading results...</div>;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Results: {poll.topic}</h1>
            <div className={styles.statsHeader}>
                <p className={styles.participants}>
                    <strong>{totalParticipants}</strong> {totalParticipants === 1 ? 'participant' : 'participants'}
                </p>
                <div className={styles.viewToggle}>
                    <button
                        className={viewMode === 'aggregate' ? styles.active : ''}
                        onClick={() => setViewMode('aggregate')}
                    >
                        📊 Statistics
                    </button>
                    <button
                        className={viewMode === 'individual' ? styles.active : ''}
                        onClick={() => setViewMode('individual')}
                    >
                        👥 Individual Responses
                    </button>
                </div>
            </div>

            <div className={styles.resultsContainer}>
                {viewMode === 'aggregate' ? (
                    // Aggregate Statistics View
                    poll.questions.map((question, questionIndex) => (
                        <div
                            key={questionIndex}
                            className={styles.questionBlock}
                        >
                            <h3 className={styles.questionTitle}>
                                Question {questionIndex + 1} ({question.type === 'one' ? 'Single choice' : 'Multiple choice'})
                            </h3>
                            <div className={styles.questionText}>{question.options.join(' / ')}</div>

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
                                            style={{ '--progress-width': `${percentage}%` } as React.CSSProperties}
                                        >
                                            <span className={styles.optionText}>
                                                {option}
                                            </span>
                                            <span className={styles.votes}>
                                                <span className={styles.voteCount}>{votes} {votes === 1 ? 'vote' : 'votes'}</span>
                                                <span className={styles.percentage}>{percentage}%</span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                ) : (
                    // Individual Responses View
                    results.length > 0 ? (
                        results.map((result, resultIndex) => (
                            <div key={resultIndex} className={styles.userResultBlock}>
                                <div className={styles.userHeader}>
                                    <div className={styles.userInfo}>
                                        <span className={styles.userAddress}>👤 {formatUserAddress(result.user)}</span>
                                        <span className={styles.userTimestamp}>🕐 {formatTimestamp(result.timestamp)}</span>
                                        <span className={styles.userStatus}>
                                            {result.claimed ? '✅ Claimed' : '⏳ Pending'}
                                        </span>
                                    </div>
                                    <button 
                                        className={styles.copyButton}
                                        onClick={() => {
                                            navigator.clipboard.writeText(result.user);
                                            alert('Address copied to clipboard!');
                                        }}
                                    >
                                        📋 Copy Address
                                    </button>
                                </div>
                                
                                <div className={styles.userAnswers}>
                                    {result.answers.map((answer, answerIndex) => {
                                        const question = poll.questions[answerIndex];
                                        return (
                                            <div key={answerIndex} className={styles.answerItem}>
                                                <div className={styles.answerQuestion}>
                                                    Q{answerIndex + 1}: ({question.type === 'one' ? 'Single' : 'Multiple'} choice)
                                                </div>
                                                <div className={styles.answerValue}>
                                                    {answer.type === 'Single' ? (
                                                        <span className={styles.singleAnswer}>✓ {answer.value as string}</span>
                                                    ) : (
                                                        <div className={styles.multipleAnswers}>
                                                            {(answer.value as string[]).map((val, idx) => (
                                                                <span key={idx} className={styles.multipleAnswer}>
                                                                    ✓ {val}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className={styles.noResults}>
                            <p>No responses yet</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};
