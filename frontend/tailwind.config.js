/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { ink: '#0B0F1A', violet: '#8B5CF6', indigo: '#6366F1', cyan: '#22D3EE' },
    fontFamily: { sans: ['DM Sans', 'sans-serif'], display: ['Space Grotesk', 'sans-serif'] },
    boxShadow: { glow: '0 10px 40px rgba(99,102,241,.28)' }
  } },
  plugins: []
};
