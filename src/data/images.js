// Single source of truth for image paths. Files live in /public/images/*.
// Replace a file in place (same name) or change the path/extension here - no UI changes needed.
export const IMG_BASE = '/images'
const ext = 'svg' // change to 'jpg' / 'webp' when you add real images with that extension

export const heroImages = {
  phone1: `${IMG_BASE}/hero/hero-phone-1.${ext}`, // 520x800, rounded corners baked into the file
  phone2: `${IMG_BASE}/hero/hero-phone-2.${ext}`, // 340x440, rounded corners baked into the file
  danceBanner: `${IMG_BASE}/hero/dance-banner.${ext}`,
}
export const categoryImage = (id) => `${IMG_BASE}/templates/categories/category-${id}.${ext}`
export const templateImage = (cat, n) => `${IMG_BASE}/templates/${cat}/${cat}-${String(n).padStart(2, '0')}.${ext}`
export const danceImage = (n) => `${IMG_BASE}/templates/dance/dance-${n}.${ext}`
export const featureImage = (id) => `${IMG_BASE}/features/feature-${id}.${ext}`
// Explore category photos: dir = folder path under /public/images (e.g. "explore/cartoon" or "Top Carousel"), one segment at a time.
// '&' is valid in a URL path and some dev servers do not decode %26, so it is kept literal (folder "explore/80&90").
const pathPart = (v) => encodeURIComponent(v).replace(/%26/g, '&')
export const exploreImage = (dir, file) => `${IMG_BASE}/${dir.split('/').map(pathPart).join('/')}/${pathPart(file)}`
export const creationImage = (n) => `${IMG_BASE}/creations/creation-image-${n}.${ext}`
export const creationVideo = (n) => `${IMG_BASE}/creations/creation-video-${n}.${ext}`
export const brandImages = {
  logo: `${IMG_BASE}/features/logo.${ext}`,
  coin: `${IMG_BASE}/features/coin.${ext}`,
  qr: `${IMG_BASE}/features/qr-placeholder.${ext}`,
  storeBadge: `${IMG_BASE}/features/store-badge.${ext}`,
  loginCollage: `${IMG_BASE}/hero/login-collage.${ext}`,
  // Login showcase previews. null = built-in CSS/SVG scenes; set a path (e.g. `${IMG_BASE}/hero/login-center.jpg`) to use a real image.
  loginShowcase: { left: null, center: null, right: null },
}

// Hero right-side cards: photo from /public/images/<dir> + the card's shape inside its frame image (canvas, card box, tilt, corner radius).
// Change `file` to use another template photo; the frame (border) images are heroImages.phone1/phone2.
export const heroCards = {
  large: { dir: 'explore/80&90', file: 'Retro Phone Call.jpg', canvas: [520, 796], box: [440, 756], center: [260, 398], rotate: -7, radius: 37 },
  small: { dir: 'explore/80&90', file: 'Vintage Golden.jpg', canvas: [340, 441], box: [282, 407], center: [170, 220.5], rotate: -10, radius: 26 },
}
