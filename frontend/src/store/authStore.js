import { create } from 'zustand';

export const useAuth = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => { localStorage.removeItem('cofounder-token'); set({ user: null }); }
}));
