export const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
};

export const getCurrentDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${day}.${month}.${year}`;
};

export const convertDate = (date: string) => {
    const [year, month, day] = date.split('-');
    return `${day}.${month}.${year}`;
};

export const formatDate = (date: Date) => date.toISOString().split('T')[0];
