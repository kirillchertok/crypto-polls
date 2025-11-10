export type QuestionType = 'one' | 'many';

export interface Question {
    type: QuestionType;
    options: string[];
}

export interface IPoll {
    id: string;
    creator: string;
    vault: string;
    topic: string;
    reward: number;
    totalParticipants: number;
    claimedParticipants: number;
    activeUntil: string;
    questions: Question[];
}
