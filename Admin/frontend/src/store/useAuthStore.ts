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
  return {
    id: 'default-chief',
    email: 'admin@omsai.com',
    name: 'Sindhu Sharma',
    role: 'CHIEF',
    title: 'Chief Warden & Administrator',
    allowedTabs: DEFAULT_TABS,
    allowedBlocks: ['ALL']
  };
}

interface AuthState {
  user: AdminUser;
  role: Role;
  name: string;
  title: string;
  allowedTabs: string[];
  allowedBlocks: string[];
  setAdminUser: (user: AdminUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const initial = getInitialUser();
  return {
    user: initial,
    role: initial.role,
    name: initial.name,
    title: initial.title,
    allowedTabs: initial.allowedTabs || DEFAULT_TABS,
    allowedBlocks: initial.allowedBlocks || ['ALL'],
    setAdminUser: (user: AdminUser) => {
      localStorage.setItem('admin_user', JSON.stringify(user));
      localStorage.setItem('admin_authenticated', 'true');
      set({
        user,
        role: user.role,
        name: user.name,
        title: user.title,
        allowedTabs: user.allowedTabs || DEFAULT_TABS,
        allowedBlocks: user.allowedBlocks || ['ALL']
      });
    },
    logout: () => {
      localStorage.removeItem('admin_authenticated');
      localStorage.removeItem('admin_user');
      const resetUser = {
        id: 'default-chief',
        email: 'admin@omsai.com',
        name: 'Sindhu Sharma',
        role: 'CHIEF' as Role,
        title: 'Chief Warden & Administrator',
        allowedTabs: DEFAULT_TABS,
        allowedBlocks: ['ALL']
      };
      set({
        user: resetUser,
        role: resetUser.role,
        name: resetUser.name,
        title: resetUser.title,
        allowedTabs: resetUser.allowedTabs,
        allowedBlocks: resetUser.allowedBlocks
      });
    }
  };
});
