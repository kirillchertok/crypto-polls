import { Header } from '@/components/Header/Header';
import { Main } from '@/components/Main/Main';
import { UserProfile } from '@/components/UserProfile/UserProfile';

export const Profile = () => {
    return (
        <>
            <Header />
            <Main>
                <UserProfile />
            </Main>
        </>
    );
};
