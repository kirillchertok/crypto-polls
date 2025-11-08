import { Link } from 'react-router-dom';

import { addIcon, profileIcon } from '@/constants/icons';

import { Button } from '../ui/Button/Button';
import styles from './Nav.module.scss';

export const Nav = () => {
    return (
        <>
            <nav className={styles.nav}>
                <Link to='/creating'>
                    <Button title='Add new poll'>{addIcon}</Button>
                </Link>
                <Link to='/profile'>
                    <Button
                        backgroundColor='red'
                        title='Go to profile'
                    >
                        {profileIcon}
                    </Button>
                </Link>
            </nav>
        </>
    );
};
