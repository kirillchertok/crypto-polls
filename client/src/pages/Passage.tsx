import { useParams } from 'react-router-dom';

import { Header } from '@/components/Header/Header';
import { Main } from '@/components/Main/Main';
import { PollPassage } from '@/components/PollPassage/PollPassage';

export const Passage = () => {
    const { id } = useParams<{ id: string }>();

    return (
        <>
            <Header />
            <Main>
                <PollPassage id={id} />
            </Main>
        </>
    );
};
