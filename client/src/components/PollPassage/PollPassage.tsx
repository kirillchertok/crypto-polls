import * as anchor from '@coral-xyz/anchor';
import {
    createAssociatedTokenAccountInstruction,
    getAccount,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import $api from '@/api';
import { useAppSelectore } from '@/store/hooks';
import type { IPoll } from '@/types/IPoll';
import { getAnchorClient } from '@/utils/solana/anchorClient';

import { Button } from '../ui/Button/Button';
import styles from './PollPassage.module.scss';

interface PollPassageProps {
    id: string | undefined;
}

type UserAnswers = (string | string[])[];

const REWARD_TOKEN_MINT = new PublicKey('DCV2LkCa623dRcBPFEfcDJFVYtYqUrWPRvX1zVCXVrjS');

export const PollPassage = ({ id }: PollPassageProps) => {
    const { wallet } = useAppSelectore(state => state.crypto);
    const anchorWallet = useAnchorWallet();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<UserAnswers>([]);
    const [poll, setPoll] = useState<IPoll | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [claiming, setClaiming] = useState(false);
    const [creatingAccount, setCreatingAccount] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPoll = async () => {
            try {
                setLoading(true);
                const response = await $api.get(`/polls/${id}`);
                setPoll(response.data);
            } catch (err) {
                setError('Failed to fetch poll');
                console.log('Error fetching poll:', err);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPoll();
        }
    }, [id]);

    // 🆕 Функция для создания токен-аккаунта пользователя
    const createUserTokenAccount = async (): Promise<PublicKey> => {
        if (!anchorWallet) throw new Error('Wallet not connected');

        const { provider } = getAnchorClient(anchorWallet);
        const userTokenAccount = await getAssociatedTokenAddress(
            REWARD_TOKEN_MINT,
            anchorWallet.publicKey
        );

        try {
            // Сначала проверяем существует ли аккаунт
            await getAccount(provider.connection, userTokenAccount);
            console.log('✅ User token account already exists');
            return userTokenAccount;
        } catch (error) {
            // Если не существует - создаем
            console.log('🆕 Creating user token account...');
            setCreatingAccount(true);

            const transaction = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    anchorWallet.publicKey, // payer
                    userTokenAccount, // associated token account
                    anchorWallet.publicKey, // owner
                    REWARD_TOKEN_MINT // mint
                )
            );

            // Добавляем немного SOL для rent exemption
            const rentExemptAmount = await provider.connection.getMinimumBalanceForRentExemption(
                165
            );

            const modifyComputeUnits = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
                units: 100000,
            });
            transaction.add(modifyComputeUnits);

            try {
                const signature = await provider.sendAndConfirm(transaction);
                console.log('✅ User token account created, signature:', signature);
                return userTokenAccount;
            } catch (createError) {
                console.error('❌ Error creating token account:', createError);
                throw createError;
            } finally {
                setCreatingAccount(false);
            }
        }
    };

    // 🆕 Функция для получения награды через смарт-контракт
    const claimReward = async () => {
        if (!anchorWallet || !poll) {
            console.error('Wallet not connected or poll not loaded');
            return;
        }

        try {
            setClaiming(true);
            const { program } = getAnchorClient(anchorWallet);

            // ✅ Получаем PDA для poll account
            const [pollAccountPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from('poll'), Buffer.from(poll.id)],
                program.programId
            );

            // ✅ Используем vault адрес из данных опроса
            const pollVault = new PublicKey(poll.vault);

            // ✅ Создаем токен-аккаунт пользователя если нужно
            console.log('🔧 Creating/checking user token account...');
            const userTokenAccount = await createUserTokenAccount();

            console.log('🎁 Claiming reward...');
            console.log('Poll ID:', poll.id);
            console.log('PollAccount PDA:', pollAccountPDA.toBase58());
            console.log('Vault from backend:', pollVault.toBase58());
            console.log('User token account:', userTokenAccount.toBase58());

            // Вызов on-chain функции claim_reward
            const txSignature = await program.methods
                .claimReward(poll.id)
                .accounts({
                    user: anchorWallet.publicKey,
                    pollAccount: pollAccountPDA,
                    pollVault: pollVault,
                    userTokenAccount: userTokenAccount,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .rpc();

            console.log('✅ Reward successfully claimed!');
            console.log('Transaction signature:', txSignature);

            alert(`Successfully claimed ${poll.reward} tokens!`);
        } catch (err: any) {
            console.error('❌ Error claiming reward:', err);

            // Более информативные ошибки
            if (err.message?.includes('AllRewardsClaimed')) {
                alert('All rewards for this poll have already been claimed.');
            } else if (err.message?.includes('InsufficientFunds')) {
                alert('Insufficient funds in the poll vault.');
            } else if (err.message?.includes('InvalidPollId')) {
                alert('Invalid poll ID.');
            } else if (err.message?.includes('Attempt to debit an account')) {
                alert('Token account issue. Please try again.');
            } else {
                alert('Error claiming reward. Check console for details.');
            }
        } finally {
            setClaiming(false);
        }
    };

    // 🆕 Обновленная функция отправки результатов
    const handleSubmit = async () => {
        if (!poll) return;

        try {
            // Сначала сохраняем результаты опроса
            const results = {
                pollId: poll.id,
                userWallet: wallet,
                answers: userAnswers,
                timestamp: new Date().toISOString(),
            };

            console.log('Results to send to server:', results);
            const response = await $api.post('/results', results);

            if (response.data) {
                console.log('✅ Poll results saved:', response.data);

                // Затем выплачиваем награду
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
                        disabled={!canProceed || claiming || creatingAccount}
                    >
                        {creatingAccount
                            ? 'Creating Account...'
                            : claiming
                            ? 'Claiming Reward...'
                            : 'End poll'}
                    </Button>
                )}
            </div>
        </div>
    );
};
