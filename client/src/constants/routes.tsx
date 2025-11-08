import { Creating } from '@/pages/Creating';
import { Home } from '@/pages/Home';
import { Passage } from '@/pages/Passage';
import { Profile } from '@/pages/Profiile';

export const ROUTES = [
    { path: '/', element: <Home /> },
    { path: '/creating', element: <Creating /> },
    { path: '/passage/:id', element: <Passage /> },
    { path: '/profile', element: <Profile /> },
];
