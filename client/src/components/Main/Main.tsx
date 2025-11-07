import type React from 'react';

import styles from './Main.module.scss';

interface MainProps {
    children: React.ReactNode;
}

export const Main = ({ children }: MainProps) => {
    return (
        <>
            <main className={styles.main}>
                <div className={styles.main__container}>{children}</div>
            </main>
        </>
    );
};
