import { useEffect } from 'react';

interface IUseClickOutside<T extends HTMLElement> {
    ref: React.RefObject<T | null>;
    onClose: () => void;
}

export const useClickOutside = <T extends HTMLElement>({ ref, onClose }: IUseClickOutside<T>) => {
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [ref, onClose]);
};
