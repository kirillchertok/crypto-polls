import { POOLS_DATA } from '@/data/polls';

import { Poll } from '../Poll/Poll';
import styles from './Polls.module.scss';

export const Polls = () => {
    return (
        <>
            <h1 className={styles.header}>Current active polls</h1>
            <div className={styles.polls}>
                {POOLS_DATA.map(poll => (
                    <Poll poll={poll} />
                ))}
            </div>
        </>
    );
};
