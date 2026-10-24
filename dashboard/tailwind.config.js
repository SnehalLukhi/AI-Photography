export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], display: ['Bricolage Grotesque', 'Inter', 'system-ui', 'sans-serif'] },
      colors: { ink: '#0B0A12', panel: '#14121F', raised: '#1B1829', line: 'rgba(255,255,255,0.08)', brand: '#8B6CFF', pink: '#FF5CA8' },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        pop: { from: { opacity: '0', transform: 'scale(.96)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
        slide: { from: { opacity: '0', transform: 'translateX(24px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { rise: 'rise .35s ease-out both', pop: 'pop .2s ease-out both', shimmer: 'shimmer 1.6s linear infinite', slide: 'slide .25s ease-out both' },
    },
  },
  plugins: [],
}
