import type React from 'react';
import type { ButtonHTMLAttributes } from 'react';

import styles from './Button.module.scss';

type Variant = 'pressed' | 'not_pressed' | 'no_diff';
type Size = 'default' | 'medium' | 'large' | 'small';
type BackgroundColor = 'blue' | 'red' | 'gray' | 'light' | 'transparent';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    backgroundColor?: BackgroundColor;
    children: React.ReactNode;
}

export const Button = ({
    variant = 'not_pressed',
    size = 'default',
    backgroundColor = 'blue',
    children,
    ...attrs
}: ButtonProps) => {
    return (
        <>
            <button
                className={`${styles.btn} ${styles[`btn--${variant}`]} ${styles[`btn--${size}`]} ${
                    styles[`btn--color_${variant === 'not_pressed' ? backgroundColor : 'white'}`]
                }`}
                {...attrs}
            >
                {children}
            </button>
        </>
    );
};
