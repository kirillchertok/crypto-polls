import { Header } from '@/components/Header/Header';
import { Main } from '@/components/Main/Main';
import { Polls } from '@/components/Polls/Polls';

export const Home = () => {
    return (
        <>
            <Header />
            <Main>
                <Polls />
            </Main>
        </>
    );
};
