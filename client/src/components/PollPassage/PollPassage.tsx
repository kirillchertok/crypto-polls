import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAppSelectore } from '@/store/hooks';
import type { IPoll } from '@/types/IPoll';
import { getAnchorClient } from '@/utils/solana/anchorClient';
import { fetchAllPolls } from '@/utils/solana/fetchAllPolls';
import { submitAndClaim } from '@/utils/solana/submitAndClaim';

import { Button } from '../ui/Button/Button';
import styles from './PollPassage.module.scss';

interface PollPassageProps {
    id: string | undefined;
}

type UserAnswers = (string | string[])[];

export const PollPassage = ({ id }: PollPassageProps) => {
    const { wallet } = useAppSelectore(state => state.crypto);
    const anchorWallet = useAnchorWallet();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<UserAnswers>([]);
    const [poll, setPoll] = useState<IPoll | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [claiming, setClaiming] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPoll = async () => {
            if (!anchorWallet) return;

            try {
                setLoading(true);
                const { program } = getAnchorClient(anchorWallet);
                const polls = await fetchAllPolls(program);
                const foundPoll = polls.find(p => p.id === id);
                
                if (foundPoll) {
                    setPoll(foundPoll);
                } else {
                    setError('Poll not found');
                }
            } catch (err) {
                console.error('Error fetching poll:', err);
                setError('Failed to fetch poll from blockchain');
            } finally {
                setLoading(false);
            }
        };

        if (id && anchorWallet) {
            fetchPoll();
        }
    }, [id, anchorWallet]);

    const handleSubmit = async () => {
        if (!poll || !anchorWallet) return;

        try {
            setClaiming(true);

            // Convert answers to the format expected by the contract
            const formattedAnswers = userAnswers.map((answer, index) => {
                const question = poll.questions[index];
                if (question.type === 'one') {
                    return { type: 'Single' as const, value: answer as string };
                } else {
                    return { type: 'Multiple' as const, value: answer as string[] };
                }
            });

            // Submit answers and claim reward in one flow
            await submitAndClaim({
                pollId: poll.id,
                answers: formattedAnswers,
                walletFull: anchorWallet,
            });

            alert('Poll completed and reward claimed successfully!');
            navigate('/');
        } catch (err: any) {
            console.error('Error submitting poll:', err);
            const errorMsg = err.message || 'Failed to submit poll';
            alert(`Error: ${errorMsg}`);
        } finally {
            setClaiming(false);
        }
    };

    if (!wallet || !id) {
        return (
            <Navigate
                to='/'
                replace
            />
        );
    }

    if (loading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    if (!poll) {
        return <div className={styles.error}>Poll not found</div>;
    }

    const currentQuestion = poll.questions[currentQuestionIndex];

    const handleSingleSelect = (option: string) => {
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = option;
        setUserAnswers(newAnswers);
    };

    const handleMultiSelect = (option: string) => {
        const currentAnswers = (userAnswers[currentQuestionIndex] as string[]) || [];
        const newAnswers = [...userAnswers];

        if (currentAnswers.includes(option)) {
            newAnswers[currentQuestionIndex] = currentAnswers.filter(item => item !== option);
        } else {
            newAnswers[currentQuestionIndex] = [...currentAnswers, option];
        }

        setUserAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestionIndex < poll.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const canProceed =
        userAnswers[currentQuestionIndex] !== undefined &&
        userAnswers[currentQuestionIndex] !== null &&
        (currentQuestion.type !== 'many' ||
            (userAnswers[currentQuestionIndex] as string[]).length > 0);

    return (
        <div className={styles.container}>
            <h1 className={styles.header}>{poll.topic}</h1>
            <p className={styles.reward}>Reward: {poll.reward} RWD</p>
            <p className={styles.deadline}>Active until: {poll.activeUntil}</p>

            <div className={styles.progress}>
                Question {currentQuestionIndex + 1} / {poll.questions.length}
            </div>

            <div className={styles.question}>
                <h3>Question {currentQuestionIndex + 1}</h3>
                <div className={styles.options}>
                    {currentQuestion.options.map((option, index) => (
                        <div
                            key={index}
                            className={styles.option}
                        >
                            {currentQuestion.type === 'one' ? (
                                <label className={styles.radioLabel}>
                                    <input
                                        type='radio'
                                        name={`question-${currentQuestionIndex}`}
                                        value={option}
                                        checked={userAnswers[currentQuestionIndex] === option}
                                        onChange={() => handleSingleSelect(option)}
                                    />
                                    <span>{option}</span>
                                </label>
                            ) : (
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type='checkbox'
                                        value={option}
                                        checked={(
                                            (userAnswers[currentQuestionIndex] as string[]) || []
                                        ).includes(option)}
                                        onChange={() => handleMultiSelect(option)}
                                    />
                                    <span>{option}</span>
                                </label>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.navigation}>
                <Button
                    onClick={handlePrev}
                    disabled={currentQuestionIndex === 0}
                >
                    Previous
                </Button>

                {currentQuestionIndex < poll.questions.length - 1 ? (
                    <Button
                        onClick={handleNext}
                        disabled={!canProceed}
                    >
                        Next
                    </Button>
                ) : (
                    <Button
                        size='medium'
                        onClick={handleSubmit}
                        disabled={!canProceed || claiming}
                    >
                        {claiming ? 'Claiming Reward...' : 'End poll'}
                    </Button>
                )}
            </div>
        </div>
    );
};
