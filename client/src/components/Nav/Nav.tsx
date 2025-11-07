import { addIcon, profileIcon } from '@/constants/icons';

import { Button } from '../Button/Button';
import styles from './Nav.module.scss';

export const Nav = () => {
    return (
        <>
            <nav className={styles.nav}>
                <Button title='Add new survey'>{addIcon}</Button>
                <Button
                    backgroundColor='red'
                    title='Go to profile'
                >
                    {profileIcon}
                </Button>
            </nav>
        </>
    );
};
