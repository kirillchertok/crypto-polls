import * as anchor from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { v4 } from 'uuid';

import $api from '@/api';
import type { Question, QuestionType } from '@/types/IPoll';
import { convertDate, formatDate, getCurrentDate, getTomorrow } from '@/utils/date';
import { getAnchorClient } from '@/utils/solana/anchorClient';

import { Button } from '../ui/Button/Button';
import { Input } from '../ui/Input/Input';
import styles from './NewPoll.module.scss';

const minDate = formatDate(getTomorrow());

const REWARD_TOKEN_MINT = new PublicKey('DCV2LkCa623dRcBPFEfcDJFVYtYqUrWPRvX1zVCXVrjS');

export const NewPoll = () => {
    const [topic, setTopic] = useState('');
    const [total, setTotal] = useState(0);
    const [passages, setPassages] = useState(0);
    const [activeUntill, setActiveUntill] = useState(formatDate(getTomorrow()));
    const [questions, setQuestions] = useState<Question[]>([{ type: 'one', options: [] }]);
    const [newOption, setNewOption] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const walletFull = useAnchorWallet();

    if (!walletFull?.publicKey) {
        return (
            <Navigate
                to='/'
                replace
            />
        );
    }

    const updateQuestionType = (index: number, newType: QuestionType) => {
        setQuestions(prev => prev.map((q, i) => (i === index ? { ...q, type: newType } : q)));
    };

    const addNewOption = (questionIndex: number) => {
        if (!newOption.trim()) return;
        setQuestions(prev =>
            prev.map((q, i) =>
                i === questionIndex ? { ...q, options: [...q.options, newOption] } : q
            )
        );
        setNewOption('');
    };

    const addNewQuestion = () => {
        setQuestions(prev => [...prev, { type: 'one', options: [] }]);
    };

    const createPoll = async () => {
        if (!walletFull) {
            return;
        }

        const pollId = v4().replace(/-/g, '').slice(0, 32);
        const rewardPerUser = Math.floor((total * 1_000_000) / passages);
        const totalParticipants = passages;

        try {
            setLoading(true);
            const { program } = getAnchorClient(walletFull);

            // PDA адреса для poll и vault
            const [pollAccountPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from('poll'), Buffer.from(pollId)],
                program.programId
            );

            const [pollVaultPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from('vault'), Buffer.from(pollId)],
                program.programId
            );

            // Ассоциированный токен-аккаунт создателя (кошелька)
            const creatorTokenAccount = await getAssociatedTokenAddress(
                REWARD_TOKEN_MINT,
                walletFull.publicKey
            );

            console.log('Creating poll...');
            console.log('PollAccount:', pollAccountPDA.toBase58());
            console.log('Vault:', pollVaultPDA.toBase58());
            console.log('Creator token account:', creatorTokenAccount.toBase58());

            // Вызов on-chain функции create_poll
            await program.methods
                .createPoll(pollId, new anchor.BN(rewardPerUser), totalParticipants)
                .accounts({
                    creator: walletFull.publicKey,
                    pollAccount: pollAccountPDA,
                    rewardToken: REWARD_TOKEN_MINT,
                    creatorTokenAccount,
                    pollVault: pollVaultPDA,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .rpc();

            console.log('Poll successfully created on Solana blockchain!');

            const response = await $api.post('/polls', {
                id: pollId,
                creator: walletFull.publicKey.toBase58(),
                vault: pollVaultPDA.toBase58(),
                topic,
                reward: rewardPerUser,
                totalParticipants,
                createdAt: getCurrentDate(),
                activeUntill: convertDate(activeUntill),
                questions,
            });

            if (response.data) {
                console.log('Poll saved to backend:', response.data);
                navigate('/');
            }
        } catch (err) {
            console.error('Error creating poll:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <h1 className={styles.header}>Creating new poll</h1>
            <div className={styles.fields}>
                <Input
                    sizeType='small'
                    label='Topic'
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                />

                <div className={styles.questions__container}>
                    <h2>Questions</h2>
                    <div className={styles.questions}>
                        {questions.map((question, i) => (
                            <div
                                key={i}
                                className={styles.question}
                            >
                                <h3>Question {i + 1}</h3>
                                <div className={styles.radio}>
                                    <p>Question type</p>
                                    <Input
                                        type='radio'
                                        label='one'
                                        value='one'
                                        sizeType='xs'
                                        checked={question.type === 'one'}
                                        onChange={e =>
                                            updateQuestionType(i, e.target.value as QuestionType)
                                        }
                                    />
                                    <Input
                                        type='radio'
                                        label='many'
                                        value='many'
                                        sizeType='xs'
                                        checked={question.type === 'many'}
                                        onChange={e =>
                                            updateQuestionType(i, e.target.value as QuestionType)
                                        }
                                    />
                                </div>
                                <div className={styles.options}>
                                    <p>Options</p>
                                    {question.options.map((option, index) => (
                                        <p key={index}>
                                            {index + 1}. {option}
                                        </p>
                                    ))}
                                    <Input
                                        type='text'
                                        label='option'
                                        value={newOption}
                                        onChange={e => setNewOption(e.target.value)}
                                    />
                                    <Button
                                        size='medium'
                                        backgroundColor='red'
                                        onClick={() => addNewOption(i)}
                                    >
                                        Add new option
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <Button onClick={addNewQuestion}>Add new question</Button>
                    </div>
                </div>

                <Input
                    type='number'
                    sizeType='small'
                    label='Total tokens to deposit'
                    value={total}
                    onChange={e => setTotal(Number(e.target.value))}
                />
                <Input
                    type='number'
                    sizeType='small'
                    label='Number of participants'
                    value={passages}
                    onChange={e => setPassages(Number(e.target.value))}
                />
                <Input
                    sizeType='small'
                    label='Active until'
                    type='date'
                    min={minDate}
                    value={activeUntill}
                    onChange={e => setActiveUntill(e.target.value)}
                />

                <Button
                    size='medium'
                    onClick={createPoll}
                    disabled={loading}
                >
                    {loading ? 'Creating...' : 'Create New'}
                </Button>
            </div>
        </>
    );
};
