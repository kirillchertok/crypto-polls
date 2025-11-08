import { type InputHTMLAttributes, useRef, useState } from 'react';

import { useClickOutside } from '@/hooks/useClickOutside';

import styles from './Input.module.scss';

type SizeType = 'default' | 'medium' | 'large' | 'small' | 'xs';

export interface IInput extends InputHTMLAttributes<HTMLInputElement> {
    sizeType?: SizeType;
    label?: string;
    icon?: React.ReactNode;
}

export const Input = ({ sizeType = 'default', label, icon, ...attrs }: IInput) => {
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const inputRef = useRef<HTMLDivElement>(null);
    const inputFieldRef = useRef<HTMLInputElement>(null);

    const setFocus = () => {
        if (inputFieldRef.current) {
            inputFieldRef.current.focus();
        }
        setIsFocused(true);
    };
    const setUnFocus = () => {
        if (inputFieldRef.current) {
            inputFieldRef.current.blur();
        }
        setIsFocused(false);
    };

    useClickOutside<HTMLDivElement>({ ref: inputRef, onClose: setUnFocus });

    return (
        <>
            <div className={`${styles.container} ${styles[`container--${sizeType}`]}`}>
                <div
                    ref={inputRef}
                    onClick={setFocus}
                    className={`${styles.input} ${
                        styles[`input--${label ? 'label' : 'no_label'}`]
                    } ${styles[`input--${isFocused ? 'focused' : 'not_focused'}`]}`}
                >
                    {icon && <div className={styles.input__icon}>{icon}</div>}
                    <input
                        ref={inputFieldRef}
                        className={`${styles.input__field} ${
                            styles[`input__field--${icon ? 'icon' : 'no_icon'}`]
                        } ${styles[`input__field--${sizeType}`]} ${
                            styles[`input__field--${isFocused ? 'focused' : 'not_focused'}`]
                        }`}
                        {...attrs}
                    />
                </div>
                {label && <span className={styles.label}>{label}</span>}
            </div>
        </>
    );
};
