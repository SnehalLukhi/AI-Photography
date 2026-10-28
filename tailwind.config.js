export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], display: ['Outfit', 'Inter', 'sans-serif'], serif: ['Outfit', 'Inter', 'sans-serif'], mono: ['Inter', 'system-ui', 'sans-serif'] },
      colors: { page: '#0A0809', panel: '#1D181B', ink: '#0A0809', slate: '#141011', graphite: '#1D181B', line: '#2C2529', bone: '#FAFAFA', citron: '#B653F6', ice: '#B653F6', mint: '#B653F6', coral: '#D98282', accent: '#B653F6', pink: '#B653F6', footer: '#0A0809' },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'card-float-3d': { '0%,100%': { transform: 'translateY(0) rotateY(-12deg) rotateX(6deg)' }, '50%': { transform: 'translateY(-14px) rotateY(-8deg) rotateX(10deg)' } },
        'floating-badge': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-7px)' } },
        'ring-orbit-3d': { from: { transform: 'rotateX(72deg) rotateY(-18deg) rotate(0)' }, to: { transform: 'rotateX(72deg) rotateY(-18deg) rotate(360deg)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'hero-float': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        'hero-up': { from: { transform: 'translateY(0)' }, to: { transform: 'translateY(-50%)' } },
        'hero-down': { from: { transform: 'translateY(-50%)' }, to: { transform: 'translateY(0)' } },
      },
      animation: {
        'marquee-slow': 'marquee 80s linear infinite',
        'card-float': 'card-float-3d 6s ease-in-out infinite',
        'badge-float': 'floating-badge 4s ease-in-out infinite',
        'ring-orbit': 'ring-orbit-3d 10s linear infinite',
        'fade-in': 'fade-in .5s ease-out both',
        'hero-up': 'hero-up 60s linear infinite',
        'hero-float': 'hero-float 5s ease-in-out infinite',
        'hero-float-2': 'hero-float 6s ease-in-out -2s infinite',
        'hero-down': 'hero-down 60s linear infinite',
      },
    },
  },
  plugins: [],
}
