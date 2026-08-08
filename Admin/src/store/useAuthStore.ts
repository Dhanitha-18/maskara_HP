import { create } from 'zustand';

export type Role = 'CHIEF' | 'SUB_ADMIN' | 'OVERFLOW';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  title: string;
  allowedTabs: string[];
  allowedBlocks?: string[];
}

const DEFAULT_TABS = [
  '/',
  '/applications',
  '/database',
  '/blocks',
  '/occupancy',
  '/communication',
  '/payments',
  '/student-controls',
  '/admin-management'
];

function getInitialUser(): AdminUser {
  try {
    const saved = localStorage.getItem('admin_user');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  // No saved session — return a blank placeholder (login page will be shown)
  return {
    id: '',
    email: '',
    name: '',
    role: 'SUB_ADMIN',
    title: '',
    allowedTabs: [],
    allowedBlocks: []
  };
}

interface AuthState {
  user: AdminUser;
  role: Role;
  name: string;
  title: string;
  token: string | null;
  allowedTabs: string[];
  allowedBlocks: string[];
  setAdminUser: (user: AdminUser, token?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const initial = getInitialUser();
  const savedToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  return {
    user: initial,
    role: initial.role,
    name: initial.name,
    title: initial.title,
    token: savedToken,
    allowedTabs: initial.allowedTabs || DEFAULT_TABS,
    allowedBlocks: initial.allowedBlocks || ['ALL'],
    setAdminUser: (user: AdminUser, token?: string) => {
      localStorage.setItem('admin_user', JSON.stringify(user));
      localStorage.setItem('admin_authenticated', 'true');
      if (token) {
        localStorage.setItem('admin_token', token);
      }
      set({
        user,
        role: user.role,
        name: user.name,
        title: user.title,
        token: token || savedToken,
        allowedTabs: user.allowedTabs || DEFAULT_TABS,
        allowedBlocks: user.allowedBlocks || ['ALL']
      });
    },
    logout: () => {
      localStorage.removeItem('admin_authenticated');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_token');
      const emptyUser: AdminUser = {
        id: '',
        email: '',
        name: '',
        role: 'SUB_ADMIN',
        title: '',
        allowedTabs: [],
        allowedBlocks: []
      };
      set({
        user: emptyUser,
        role: emptyUser.role,
        name: emptyUser.name,
        title: emptyUser.title,
        token: null,
        allowedTabs: emptyUser.allowedTabs,
        allowedBlocks: emptyUser.allowedBlocks
      });
    }
  };
});
