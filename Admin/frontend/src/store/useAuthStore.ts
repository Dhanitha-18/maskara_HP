import { create } from 'zustand';

export type Role = 'CHIEF' | 'OVERFLOW';

interface AuthState {
  role: Role;
  name: string;
  title: string;
  toggleRole: () => void;
}

export const useAuthStore = create<AuthState>(() => ({
  role: 'CHIEF',
  name: 'Sindhu Sharma',
  title: 'Chief Warden & Administrator',
  toggleRole: () => {}
}));
