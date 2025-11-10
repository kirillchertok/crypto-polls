import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { formatDate, getTomorrow } from '@/utils/date';
import { createPollAnchor } from '@/utils/solana/createPollAnchor';

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

    const createPoll = async () => {
        if (!walletFull) return;

        // Validate form
        if (!form.topic.trim()) return alert('Please enter a topic');
        if (form.total <= 0) return alert('Please enter a positive reward amount');
        if (form.passages <= 0) return alert('Please enter a positive number of participants');
        if (form.questions.some(q => q.options.length === 0))
            return alert('All questions must have at least one option');
        if (form.questions.length > 10) return alert('Maximum 10 questions allowed');

        for (const question of form.questions) {
            if (question.options.length > 10) return alert('Maximum 10 options per question');
            for (const option of question.options) {
                if (!option.trim()) return alert('All options must have text');
                if (option.length > 100) return alert('Option text must be under 100 characters');
            }
        }

        if (form.topic.length > 200) return alert('Topic must be under 200 characters');

        try {
            setLoading(true);

            await createPollAnchor({
                topic: form.topic,
                rewardPerUser: form.total,
                totalParticipants: form.passages,
                activeUntil: form.activeUntill,
                questions: form.questions,
                walletFull,
            });

            alert('Poll created successfully on the blockchain!');
            navigate('/');
        } catch (err: any) {
            console.error('Error creating poll:', err);
            const errorMsg = err.message || 'Failed to create poll. See console for details.';
            alert(`Error: ${errorMsg}`);
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
