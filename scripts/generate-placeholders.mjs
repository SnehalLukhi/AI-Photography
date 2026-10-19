// Generates temporary SVG placeholders into public/images/. Replace any file with your real image
// (same name/extension, or update the path in src/data/images.js). Run: node scripts/generate-placeholders.mjs
// Your own template photos (public/images/template/) are NOT touched by this script.
import { register } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// src/data/templates.js imports Vite's virtual module `virtual:template-images`; give plain Node an empty stand-in.
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { if (s === 'virtual:template-images') return { url: 'data:text/javascript,export default []', shortCircuit: true }; if (s === 'virtual:explore-folders') return { url: 'data:text/javascript,export default {}; export const sizes = {}', shortCircuit: true }; return n(s, c) }`))

const root = join(process.cwd(), 'public', 'images')
const hue = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7)
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const write = (path, content) => { const f = join(root, path); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, content) }

function make(path, label, w, h, sub = '', rx = 0) {
  const h1 = hue(path), h2 = (h1 + 55) % 360
  const fs = Math.round(w / 14)
  write(path, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1} 70% 32%)"/><stop offset="1" stop-color="hsl(${h2} 75% 12%)"/></linearGradient>
<radialGradient id="r" cx=".3" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<clipPath id="c"><rect width="${w}" height="${h}" rx="${rx}"/></clipPath></defs>
<g clip-path="url(#c)"><rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#r)"/>
<circle cx="${w / 2}" cy="${h * 0.38}" r="${w * 0.16}" fill="#fff" fill-opacity=".14"/>
<path d="M${w * 0.2} ${h * 0.72} Q${w / 2} ${h * 0.48} ${w * 0.8} ${h * 0.72} Z" fill="#fff" fill-opacity=".12"/>
<text x="50%" y="${h * 0.86}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="700" font-size="${fs}" fill="#fff" fill-opacity=".85">${esc(label)}</text>
<text x="50%" y="${h * 0.86 + fs * 1.3}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="${Math.round(fs * 0.6)}" fill="#fff" fill-opacity=".5">${esc(sub || 'placeholder ' + w + 'x' + h)}</text></g></svg>`)
}

// Template / category / dance placeholders (paths come from src/data/images.js)
const { templates, dances } = await import('../src/data/templates.js')
const heroCats = { couple: 'Couple Love', cinematic: 'Cinematic Portrait', action: 'Action & Adventure', neon: 'Neon Vibes' }
for (const [id, name] of Object.entries(heroCats)) make(`templates/categories/category-${id}.svg`, name, 435, 580)
for (const t of templates) make(`templates/${t.categoryId}/${t.categoryId}-${String(t.index).padStart(2, '0')}.svg`, t.name, 540, 960, `${t.category} · ${t.slots.join(' + ')}`)
for (const d of dances) make(`templates/dance/dance-${d.index}.svg`, d.name, 540, 960)

// Hero right-side cards: ONLY the gradient border is drawn here (card pre-rotated inside a transparent canvas, as in the
// reference art). The photo is layered underneath in Home.jsx using `heroCards` in src/data/images.js - keep the numbers in sync.
function heroFrame(path, w, h, cw, ch, cx, cy, rot, rx) {
  write(path, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c084fc"/><stop offset=".5" stop-color="#ec4899"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>
<g transform="translate(${cx} ${cy}) rotate(${rot})"><rect x="${-cw / 2 + 3}" y="${-ch / 2 + 3}" width="${cw - 6}" height="${ch - 6}" rx="${rx - 3}" fill="none" stroke="url(#b)" stroke-width="6"/></g></svg>`)
}
heroFrame('hero/hero-phone-1.svg', 520, 796, 440, 756, 260, 398, -7, 37)
heroFrame('hero/hero-phone-2.svg', 340, 441, 282, 407, 170, 220.5, -10, 26)
make('hero/login-collage.svg', 'Login Collage', 960, 1000, 'login background 960x1000')
make('hero/dance-banner.svg', 'Dance Banner', 1200, 500, 'banner 1200x500')

// Feature icons (96x96)
const icon = (name, color, glyph) => write(`features/feature-${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="45" fill="#0B0812" stroke="${color}" stroke-width="3"/>${glyph}</svg>`)
icon('fast', '#8C1AF2', '<path d="M48 26 L53 43 L70 48 L53 53 L48 70 L43 53 L26 48 L43 43Z" fill="#a855f7"/>')
icon('quality', '#ed2e94', '<path d="M48 28 L68 48 L48 68 L28 48Z" fill="#ed2e94"/>')
icon('download', '#f59e0b', '<path d="M44 26h8v22h10L48 66 34 48h10z" fill="#f59e0b"/>')
icon('styles', '#8C1AF2', '<path d="M48 27 L54 41 L69 42 L58 52 L61 67 L48 59 L35 67 L38 52 L27 42 L42 41Z" fill="#a855f7"/>')

// Brand assets
write('features/coin.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="#f59e0b" stroke="#fde68a" stroke-width="4"/><circle cx="32" cy="32" r="20" fill="none" stroke="#fbbf24" stroke-width="3"/><text x="32" y="42" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="800" font-size="28" fill="#fff7d6">C</text></svg>`)
write('features/logo.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9333EA"/><stop offset="1" stop-color="#EC4899"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#g)"/><text x="64" y="88" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="800" font-size="76" fill="#fff">P</text></svg>`)
make('features/qr-placeholder.svg', 'QR', 120, 120, 'replace with QR')
// Google Play badge (black pill, multicolour Play logo). Replace with Google's official badge file if you have one.
write('features/store-badge.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="108" viewBox="0 0 360 108" role="img" aria-label="Get it on Google Play"><rect x="2" y="2" width="356" height="104" rx="16" fill="#000" stroke="#a6a6a6" stroke-width="3"/>
<g transform="translate(26 15) scale(3.2)"><path fill="#fbbc04" d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594z"/><path fill="#00a0ff" d="M1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924z"/><path fill="#00e676" d="M13.544 10.989l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973z"/><path fill="#ff3a44" d="M13.544 13.056l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"/></g>
<text x="118" y="44" font-family="Product Sans,Google Sans,Segoe UI,Arial,sans-serif" font-size="21" fill="#fff" textLength="112" lengthAdjust="spacingAndGlyphs">GET IT ON</text>
<text x="116" y="85" font-family="Product Sans,Google Sans,Segoe UI,Arial,sans-serif" font-size="44" font-weight="500" fill="#fff" textLength="208" lengthAdjust="spacingAndGlyphs">Google Play</text></svg>`)

// Tool cards and demo creations
for (const [id, n] of [['image-to-image', 'Image to Image'], ['image-to-video', 'Image to Video'], ['first-last-frame', 'First & Last Frame'], ['ai-avatar', 'Face Talk']]) make(`tools/tool-${id}.svg`, n, 640, 480, 'tool card 640x480')
for (let i = 1; i <= 8; i++) make(`creations/creation-image-${i}.svg`, `Creation ${i}`, 540, 720, 'demo creation 540x720')
for (let i = 1; i <= 4; i++) make(`creations/creation-video-${i}.svg`, `Video ${i}`, 540, 960, 'demo video 540x960')
// NOTE: public/images/explore/<folder>/ holds your real category photos - this script never touches it.
console.log('placeholders written to public/images')
