import * as anchor from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Web3Storage } from 'web3.storage';

import { REWARD_TOKEN_MINT, WEB3_STORAGE_TOKEN } from '@/constants/token';
import { formatDate, getTomorrow } from '@/utils/date';
import { getAnchorClient } from '@/utils/solana/anchorClient';

import { Button } from '../ui/Button/Button';
import { Input } from '../ui/Input/Input';
import styles from './NewPoll.module.scss';

const minDate = formatDate(getTomorrow());

interface CreatePollForm {
    topic: string;
    total: number;
    passages: number;
    activeUntill: string;
    questions: { type: 'one' | 'many'; options: string[] }[];
}

export const NewPoll = () => {
    const [form, setForm] = useState<CreatePollForm>({
        topic: '',
        total: 0,
        passages: 0,
        activeUntill: minDate,
        questions: [{ type: 'one', options: [] }],
    });
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

    const updateQuestionType = (index: number, newType: 'one' | 'many') => {
        setForm(prev => ({
            ...prev,
            questions: prev.questions.map((q, i) => (i === index ? { ...q, type: newType } : q)),
        }));
    };

    const addNewOption = (questionIndex: number) => {
        if (!newOption.trim()) return;
        setForm(prev => ({
            ...prev,
            questions: prev.questions.map((q, i) =>
                i === questionIndex ? { ...q, options: [...q.options, newOption] } : q
            ),
        }));
        setNewOption('');
    };

    const addNewQuestion = () => {
        setForm(prev => ({
            ...prev,
            questions: [...prev.questions, { type: 'one', options: [] }],
        }));
    };

    const removeQuestion = (index: number) => {
        if (form.questions.length <= 1) return;
        setForm(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index),
        }));
    };

    const removeOption = (questionIndex: number, optionIndex: number) => {
        setForm(prev => ({
            ...prev,
            questions: prev.questions.map((q, i) =>
                i === questionIndex
                    ? { ...q, options: q.options.filter((_, idx) => idx !== optionIndex) }
                    : q
            ),
        }));
    };

    const generatePollId = (): string => {
        return `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    const convertDateToTimestamp = (dateString: string): anchor.BN => {
        const timestamp = Math.floor(new Date(dateString).getTime() / 1000);
        return new anchor.BN(timestamp);
    };

    // 🔹 Функция загрузки JSON на IPFS через Web3.Storage
    const uploadPollToIPFS = async (poll: {
        topic: string;
        questions: any[];
        answers: any[];
        activeUntil: any;
    }) => {
        const client = new Web3Storage({ token: WEB3_STORAGE_TOKEN });
        const blob = new Blob([JSON.stringify(poll)], { type: 'application/json' });
        const file = new File([blob], 'poll.json');
        const cid = await client.put([file]);
        return `https://${cid}.ipfs.dweb.link/poll.json`;
    };

    const createPoll = async () => {
        if (!walletFull) return;

        // 🔹 Валидация формы
        if (!form.topic.trim()) return alert('Please enter a topic');
        if (form.total <= 0) return alert('Please enter a positive reward amount');
        if (form.passages <= 0) return alert('Please enter a positive number of participants');
        if (form.questions.some(q => q.options.length === 0))
            return alert('All questions must have at least one option');

        for (const question of form.questions) {
            for (const option of question.options) {
                if (!option.trim()) return alert('All options must have text');
            }
        }

        try {
            setLoading(true);
            const { program, provider } = getAnchorClient(walletFull);

            // 🔹 Генерация pollId и timestamp
            const pollId = generatePollId();
            const activeUntilTimestamp = convertDateToTimestamp(form.activeUntill);

            // 🔹 Загрузка опроса на IPFS
            const ipfsUri = await uploadPollToIPFS({
                topic: form.topic,
                questions: form.questions,
                answers: [],
                activeUntil: activeUntilTimestamp,
            });

            // 🔹 Находим PDA для аккаунтов
            const [pollAccountPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from('poll'), Buffer.from(pollId)],
                program.programId
            );

            const [pollVaultPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from('vault'), Buffer.from(pollId)],
                program.programId
            );

            const [registryPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from('registry')],
                program.programId
            );

            const rewardTokenMint = new PublicKey(REWARD_TOKEN_MINT);
            const creatorTokenAccount = await getAssociatedTokenAddress(
                rewardTokenMint,
                walletFull.publicKey
            );

            // 🔹 Вызов метода createPoll на блокчейне
            const tx = await program.methods
                .createPoll(pollId, new anchor.BN(form.total), form.passages, ipfsUri)
                .accounts({
                    creator: walletFull.publicKey,
                    pollAccount: pollAccountPDA,
                    registry: registryPDA,
                    rewardToken: rewardTokenMint,
                    creatorTokenAccount: creatorTokenAccount,
                    pollVault: pollVaultPDA,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .rpc();

            console.log('Poll created successfully. Transaction:', tx);
            navigate('/');
        } catch (err: any) {
            console.error('Error creating poll:', err);
            alert('Failed to create poll. See console for details.');
        } finally {
            setLoading(false);
        }
    };

    const updateFormField = (field: keyof CreatePollForm, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    return (
        <>
            <h1 className={styles.header}>Creating new poll</h1>
            <div className={styles.fields}>
                <Input
                    sizeType='small'
                    label='Topic'
                    value={form.topic}
                    onChange={e => updateFormField('topic', e.target.value)}
                    placeholder='Enter poll topic'
                />
                <div className={styles.questions__container}>
                    <h2>Questions</h2>
                    {form.questions.map((question, i) => (
                        <div
                            key={i}
                            className={styles.question}
                        >
                            <div className={styles.questionHeader}>
                                <h3>Question {i + 1}</h3>
                                {form.questions.length > 1 && (
                                    <Button
                                        size='small'
                                        backgroundColor='red'
                                        onClick={() => removeQuestion(i)}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                            <div className={styles.radio}>
                                <p>Question type</p>
                                <Input
                                    type='radio'
                                    label='Single choice'
                                    value='one'
                                    sizeType='xs'
                                    checked={question.type === 'one'}
                                    onChange={e =>
                                        updateQuestionType(i, e.target.value as 'one' | 'many')
                                    }
                                />
                                <Input
                                    type='radio'
                                    label='Multiple choice'
                                    value='many'
                                    sizeType='xs'
                                    checked={question.type === 'many'}
                                    onChange={e =>
                                        updateQuestionType(i, e.target.value as 'one' | 'many')
                                    }
                                />
                            </div>
                            <div className={styles.options}>
                                <p>Options</p>
                                {question.options.map((option, index) => (
                                    <div
                                        key={index}
                                        className={styles.optionItem}
                                    >
                                        <span>
                                            {index + 1}. {option}
                                        </span>
                                        <Button
                                            size='small'
                                            backgroundColor='red'
                                            onClick={() => removeOption(i, index)}
                                        >
                                            ×
                                        </Button>
                                    </div>
                                ))}
                                <Input
                                    type='text'
                                    label='New option'
                                    value={newOption}
                                    onChange={e => setNewOption(e.target.value)}
                                    placeholder='Enter option text'
                                />
                                <Button
                                    size='medium'
                                    backgroundColor='blue'
                                    onClick={() => addNewOption(i)}
                                    disabled={!newOption.trim()}
                                >
                                    Add option
                                </Button>
                            </div>
                        </div>
                    ))}
                    <Button
                        onClick={addNewQuestion}
                        backgroundColor='red'
                    >
                        Add new question
                    </Button>
                </div>
                <div className={styles.amount}>
                    <Input
                        type='number'
                        sizeType='small'
                        label='Reward per user (tokens)'
                        value={form.total}
                        onChange={e => updateFormField('total', Number(e.target.value))}
                        min='0'
                        step='1'
                    />
                    <Input
                        type='number'
                        sizeType='small'
                        label='Number of participants'
                        value={form.passages}
                        onChange={e => updateFormField('passages', Number(e.target.value))}
                        min='1'
                        step='1'
                    />
                </div>
                <Input
                    sizeType='small'
                    label='Active until'
                    type='date'
                    min={minDate}
                    value={form.activeUntill}
                    onChange={e => updateFormField('activeUntill', e.target.value)}
                />
                <div className={styles.creationInfo}>
                    <p>
                        Current poll size: {form.questions.length} question(s),{' '}
                        {form.questions.reduce((acc, q) => acc + q.options.length, 0)} option(s)
                    </p>
                </div>
                <Button
                    size='large'
                    onClick={createPoll}
                    disabled={loading}
                    backgroundColor={loading ? 'gray' : 'blue'}
                >
                    {loading ? 'Creating Poll...' : 'Create Poll'}
                </Button>
            </div>
        </>
    );
};
