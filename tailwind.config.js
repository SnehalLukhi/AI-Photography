export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], display: ['Bricolage Grotesque', 'Inter', 'system-ui', 'sans-serif'], mono: ['Inter', 'system-ui', 'sans-serif'] },
      colors: { page: '#0F0433', panel: '#2A1B52', accent: '#B070FA', pink: '#B070FA', footer: '#0F0433' },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'card-float-3d': { '0%,100%': { transform: 'translateY(0) rotateY(-12deg) rotateX(6deg)' }, '50%': { transform: 'translateY(-14px) rotateY(-8deg) rotateX(10deg)' } },
        'floating-badge': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-7px)' } },
        'ring-orbit-3d': { from: { transform: 'rotateX(72deg) rotateY(-18deg) rotate(0)' }, to: { transform: 'rotateX(72deg) rotateY(-18deg) rotate(360deg)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        'marquee-slow': 'marquee 80s linear infinite',
        'card-float': 'card-float-3d 6s ease-in-out infinite',
        'badge-float': 'floating-badge 4s ease-in-out infinite',
        'ring-orbit': 'ring-orbit-3d 10s linear infinite',
        'fade-in': 'fade-in .5s ease-out both',
      },
    },
  },
  plugins: [],
}
