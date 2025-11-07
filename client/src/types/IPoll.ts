export type QuestionType = 'one' | 'many';

export interface Question {
    type: QuestionType;
    options: string[];
}

export interface IPoll {
    creator: string;
    topic: string;
    reward: number;
    createdAt: string;
    activeUntill: string;
    questions: Question[];
}
