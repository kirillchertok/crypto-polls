import { Header } from '@/components/Header/Header';
import { Main } from '@/components/Main/Main';
import { NewPoll } from '@/components/NewPoll/NewPoll';

export const Creating = () => {
    return (
        <>
            <Header />
            <Main>
                <NewPoll />
            </Main>
        </>
    );
};
