import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import $api from '@/api';
import { useAppSelectore } from '@/store/hooks';
import type { IPoll } from '@/types/IPoll';
import { getAnchorClient } from '@/utils/solana/anchorClient';
import { createUserTokenAccount } from '@/utils/solana/createUserTokenAccount';

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
            try {
                setLoading(true);
                const response = await $api.get(`/polls/${id}`);
                setPoll(response.data);
            } catch (err) {
                setError('Failed to fetch poll');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPoll();
        }
    }, [id]);

    const claimReward = async () => {
        if (!anchorWallet || !poll) {
            return;
        }

        try {
            setClaiming(true);
            const { program } = getAnchorClient(anchorWallet);

            const [pollAccountPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from('poll'), Buffer.from(poll.id)],
                program.programId
            );

            const pollVault = new PublicKey(poll.vault);

            const userTokenAccount = await createUserTokenAccount({ anchorWallet });

            await program.methods
                .claimReward(poll.id)
                .accounts({
                    user: anchorWallet.publicKey,
                    pollAccount: pollAccountPDA,
                    pollVault: pollVault,
                    userTokenAccount: userTokenAccount,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .rpc();
        } catch (err: any) {
            console.error('Error claiming reward:', err);
        } finally {
            setClaiming(false);
        }
    };

    const handleSubmit = async () => {
        if (!poll) return;

        try {
            const results = {
                pollId: poll.id,
                userWallet: wallet,
                answers: userAnswers,
                timestamp: new Date().toISOString(),
            };

            const response = await $api.post('/results', results);

            if (response.data) {
                await claimReward();
                navigate('/');
            }
        } catch (err) {
            console.error('Error submitting poll:', err);
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
            <p className={styles.deadline}>Active until: {poll.activeUntill}</p>

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
