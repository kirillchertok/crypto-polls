import type { IPoll } from '@/types/IPoll';

export const POOLS_DATA: IPoll[] = [
    {
        creator: 'wallet1',
        topic: 'dota2',
        reward: 100,
        createdAt: '25.03.2005 12:12:12',
        activeUntill: '27.03.2005 12:12:12',
        questions: [
            {
                type: 'one',
                options: ['1', '2', '3', '4', '5'],
            },
            {
                type: 'one',
                options: ['6', '7', '8', '9', '10'],
            },
            {
                type: 'many',
                options: ['11', '12', '13', '14', '15'],
            },
        ],
    },
    {
        creator: 'wallet2',
        topic: 'dota2',
        reward: 200,
        createdAt: '01.01.2000 12:12:12',
        activeUntill: '03.01.2000 12:12:12',
        questions: [
            {
                type: 'many',
                options: ['16', '17', '18', '19', '20'],
            },
            {
                type: 'one',
                options: ['21', '22', '23', '24', '25'],
            },
            {
                type: 'many',
                options: ['26', '27', '28', '29', '30'],
            },
        ],
    },
];
