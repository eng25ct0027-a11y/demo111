import { create } from 'zustand';
const saved = localStorage.getItem('cofounder-theme') || 'dark';
export const useTheme = create((set) => ({
  theme: saved,
  toggle: () => set((state) => {
    const theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('cofounder-theme', theme);
    document.documentElement.classList.toggle('light', theme === 'light');
    return { theme };
  })
}));
