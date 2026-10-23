import exploreFolderFiles, { sizes as exploreSizes } from 'virtual:explore-folders'
import { categoryImage, templateImage, exploreImage, danceImage, featureImage, creationImage, creationVideo } from './images.js'

export const categories = [
  { id: 'couple', name: 'Couple Love', image: categoryImage('couple') },
  { id: 'cinematic', name: 'Cinematic Portrait', image: categoryImage('cinematic') },
  { id: 'action', name: 'Action & Adventure', image: categoryImage('action') },
  { id: 'neon', name: 'Neon Vibes', image: categoryImage('neon') },
]

export const slug = (str) => str.toLowerCase().replace(/[’']/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// Explore categories (labels match the reference). The "All"/"Trending" chips are virtual lists built below.
export const exploreChips = ["Trending", "80's & 90's", 'Timeless Love', 'Coachella Aesthetic', 'Birthday Glam', 'Candid Frames', 'Cigar Society', 'Island Noir', 'Linen Retreat', 'Spring Blossom', 'Urban Ease', 'Model Energy', 'Love Scrapbook', 'Dynamic Duo', 'Femme Aura', 'Gentleman’s Hour', 'Slay Mode', 'Couple Vibes', 'Rose Lust', 'Honey Glow', 'Dark Editorial', 'Hot Mood', 'Royal Terrace', 'Fifty Shades', 'Burning Boss', 'Urban Elite']
export const exploreCategories = exploreChips.slice(1).map((name) => ({ id: slug(name), name }))

const COUPLE = ['timeless-love', 'love-scrapbook', 'dynamic-duo', 'couple-vibes']
const FEMALE = ['femme-aura', 'rose-lust', 'honey-glow', 'slay-mode', 'hot-mood', 'birthday-glam', 'spring-blossom', 'fifty-shades']
const MALE = ['gentlemans-hour', 'cigar-society', 'burning-boss', 'urban-elite']
const adjectives = ['Velvet', 'Scarlet', 'Golden', 'Midnight', 'Ivory', 'Crimson', 'Azure', 'Amber', 'Silver', 'Noir', 'Rustic', 'Neon']
const nouns = ['Affair', 'Mirror', 'Glow', 'Story', 'Muse', 'Reverie']
// A few names are fixed so the example deep links keep working:
// /generate?categoryId=rose-lust&assetId=midnight-desire, cigar-society/black-suit, couple-vibes/cannnas-couple
const fixedNames = {
  'rose-lust': ['Velvet Lace', 'Scarlet Mirror', 'Red Finale', 'Pink Seduction', 'Paris Affair', 'Ocean Blossom', 'Midnight Desire', 'Ivory Desire', 'Golden Bloom', 'Eiffel Nights', 'Crimson Heat', 'Blush Temptation'],
  'cigar-society': ['Black Suit'],
  'couple-vibes': ['Cannes Couple'],
}
const assetAliases = { 'couple-vibes/cannnas-couple': 'couple-vibes/cannes-couple' }

const slotsFor = (cat, i) => (COUPLE.includes(cat) ? ['Male', 'Female'] : FEMALE.includes(cat) ? ['Female'] : MALE.includes(cat) ? ['Male'] : [i % 2 ? 'Male' : 'Female'])

export const templates = exploreCategories.flatMap((c, ci) =>
  Array.from({ length: 12 }, (_, i) => {
    const name = fixedNames[c.id]?.[i] || `${adjectives[(i + ci) % 12]} ${nouns[(ci + Math.floor(i / 3)) % nouns.length]}`
    return { id: `${c.id}/${slug(name)}`, categoryId: c.id, category: c.name, name, assetId: slug(name), type: 'image', slots: slotsFor(c.id, i), coins: 120, index: i + 1, image: templateImage(c.id, i + 1) }
  })
)
export const byCategory = (id) => templates.filter((t) => t.categoryId === id)
// "All": round-robin across categories (first 48, like the reference grid); "Trending": first template of the first 12 categories.
export const exploreList = Array.from({ length: 12 }, (_, k) => exploreCategories.map((c) => byCategory(c.id)[k])).flat().slice(0, 48)
export const trendingList = exploreCategories.slice(0, 12).map((c) => byCategory(c.id)[0])

const danceNames = ['Tiny Star', 'Power Moves', 'Cool Kid', 'Street Rhythm', 'Baby Steps', 'Golden Motion', 'Little Boss', 'Hip Hop Groove', 'Bollywood Beat', 'Salsa Night', 'K-Pop Move', 'Street Flow', 'Disco Fever', 'Robot Dance', 'Ballet Twirl', 'Shuffle Slide', 'Garba Night', 'Moonwalk']
export const dances = danceNames.map((name, i) => ({ id: `dance-videos/${slug(name)}`, categoryId: 'dance-videos', category: 'Dance Videos', name, assetId: slug(name), type: 'video', slots: ['Photo'], coins: 250, index: i + 1, image: danceImage(i + 1) }))

// Explore category tabs (after All / Trending). Each tab reads the photos of one folder under /public/images (auto-scanned by
// vite.config.js). `id` = the URL slug (?category=<id>).
// `folders` = places (relative to /public/images) where the tab's photos may live; the first one that has photos is used.
export const exploreTabs = [
  { id: '80s-and-90s', folders: ['explore/80&90'], name: "80's & 90's" },
  { id: 'cartoon', folders: ['explore/cartoon'], name: 'Cartoon' },
  { id: 'linkedin-headshot', folders: ['explore/linkedin-headshot', 'explore/Linkedin Headshot', 'Linkedin Headshot'], name: 'LinkedIn Headshot' },
  { id: 'old-money', folders: ['explore/old-money'], name: 'Old Money' },
  { id: 'top-carousel', folders: ['explore/top-carousel', 'explore/Top Carousel', 'Top Carousel'], name: 'Top Carousel' },
  // Beard: card title = file name up to the first space / opening bracket ('AnchorBeardClean (AnchorBeardClean).jpg' -> 'AnchorBeardClean'). Not part of "All".
  { id: 'beard', folders: ['explore/beard'], name: 'Beard', title: (stem) => stem.split(/[\s(]/)[0] || stem, hideFromAll: true, exclude: ['common_image'] }, // common_image is not a template: never listed or selectable
  // Seasonal / style categories (photos only, no JSON catalogue): every image in the folder becomes a card, titled with its file name. Not part of "All" or Trending.
  { id: 'christmas', folders: ['explore/Christmas'], name: 'Christmas', hideFromAll: true },
  { id: 'cinematic', folders: ['explore/Cinematic'], name: 'Cinematic', hideFromAll: true, landscapeLast: true, exclude: ['Golden Hour Car'] }, // portrait photos first, horizontal ones at the end
  { id: 'diwali', folders: ['explore/Diwali'], name: 'Diwali', hideFromAll: true },
  { id: 'halloween', folders: ['explore/Halloween'], name: 'Halloween', hideFromAll: true },
  // Hairstyle: three sub-categories (explore/Hairstyle/{baby,man,woman}); card title = file name without extension and without the trailing " (…)" part. Not part of "All".
  { id: 'hairstyle-baby', parent: 'hairstyle', folders: ['explore/Hairstyle/baby'], title: (stem) => stem.replace(/\s*\(.*$/, '').trim() || stem, name: 'Baby', category: 'Hairstyle · Baby', hideFromAll: true, exclude: ['Messy Bun (female_hairstyle_0039)'] }, // same style id as "Baby Soft Layered Bob" (and JSON 0039 is a bob, not a bun): unconfirmed
  { id: 'hairstyle-man', parent: 'hairstyle', folders: ['explore/Hairstyle/man'], title: (stem) => stem.replace(/\s*\(.*$/, '').trim() || stem, name: 'Man', category: 'Hairstyle · Man', hideFromAll: true },
  { id: 'hairstyle-woman', parent: 'hairstyle', folders: ['explore/Hairstyle/woman'], title: (stem) => stem.replace(/\s*\(.*$/, '').trim() || stem, name: 'Woman', category: 'Hairstyle · Woman', hideFromAll: true, exclude: ['Textured Pixie(female_hairstyle_00020)'] }, // "00020" is a typo, not a documented hair_style: unconfirmed
]
// Explore sidebar: Trending stays first, then every category added after these original ones - newest (the last one in `exploreTabs`) first - then the originals in
// their usual order. To add a category: append it to `exploreTabs`; it is not listed here, so it takes position 2 automatically.
const ORIGINAL_TAB_IDS = ['80s-and-90s', 'cartoon', 'linkedin-headshot', 'old-money', 'top-carousel', 'beard', 'hairstyle-baby', 'hairstyle-man', 'hairstyle-woman']
export const isOriginalTab = (t) => ORIGINAL_TAB_IDS.includes(t.id)
/** The "Hairstyle" sidebar entry: a parent whose subs are the hairstyle-* tabs above ({ id: URL ?sub=, tabId: key for categoryItems }). */
const parentTab = (id, name) => ({ id, name, subs: exploreTabs.filter((t) => t.parent === id).map((t) => ({ id: t.id.replace(`${id}-`, ''), name: t.name, tabId: t.id })) })
export const hairstyleTab = parentTab('hairstyle', 'Hairstyle')
const folderStem = (file) => file.replace(/\.[^.]+$/, '')
export const exploreFolderTemplates = Object.fromEntries(exploreTabs.map((tab) => {
  const used = new Set()
  const dir = tab.folders.find((d) => (exploreFolderFiles[d] || []).length) || tab.folders[0]
  const items = (exploreFolderFiles[dir] || []).filter((file) => !tab.exclude?.includes(folderStem(file))).map((file, i) => {
    const name = tab.title ? tab.title(folderStem(file)) : folderStem(file)
    let assetId = slug(name) || `${tab.id}-${i + 1}`
    while (used.has(assetId)) assetId = `${assetId}-${i + 1}`
    used.add(assetId)
    const [w, h] = exploreSizes[`${dir}/${file}`] || []
    return { id: `${tab.id}/${assetId}`, categoryId: tab.id, category: tab.category || tab.name, name, assetId, type: 'image', slots: ['Photo'], coins: 120, index: i + 1, image: exploreImage(dir, file), landscape: !!(w && h && w > h) }
  })
  if (tab.landscapeLast) items.sort((a, b) => Number(a.landscape) - Number(b.landscape)) // stable: each group keeps its file-name order
  return [tab.id, items]
}))
// Template gallery ("All" / "Trending" on Explore, Home > Trending Templates, hero cards, Login photo panel): the photos of the
// 80's & 90's and Old Money folders (the original /public/images/template/ folder no longer exists). Add a photo to either
// folder and it shows up everywhere automatically. Same photos, no copies.
const GALLERY_TABS = ['80s-and-90s', 'old-money']
export const folderTemplates = GALLERY_TABS.flatMap((id) => exploreFolderTemplates[id])
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
  .map((t, i) => ({ ...t, id: `trending-templates/${t.assetId}`, categoryId: 'trending-templates', category: 'Templates', index: i + 1 }))

// Explore "All" and "Trending": the gallery photos first (same order as before), then the Cartoon templates. They are the same
// objects as in their own tab (not copies), so each Cartoon template still also appears under Cartoon.
export const exploreAllTemplates = [...folderTemplates, ...exploreFolderTemplates.cartoon]

// Explore "All": every portrait template in the project except Top Carousel - the gallery photos, Cartoon, LinkedIn Headshot, Beard,
// Hairstyle (80's & 90's and Old Money are already inside the gallery photos). De-duplicated by image path, so a template that belongs to several
// categories is listed once. Any category added to exploreTabs later is included automatically.
const dedupe = (list) => { const seen = new Set(); return list.filter((t) => !seen.has(t.image) && seen.add(t.image)) }
export const exploreEverything = dedupe([...exploreAllTemplates, ...exploreTabs.flatMap((tab) => exploreFolderTemplates[tab.id])])
  .filter((t) => t.categoryId !== 'top-carousel' && !t.landscape) // Top Carousel / horizontal photos are not listed in All (they stay in their own tab)

/** Templates shown when an Explore category tab is selected. */
export const categoryItems = (id) => exploreFolderTemplates[id] || byCategory(id)

// Trending page: one template per category for the Spotlight Roll (the first six groups below, plus a second Old Money card) and up to 5 templates
// from EACH category in the grid (Top Carousel is not part of Trending). A category made of sub-folders (Hairstyle) is sampled round-robin across its subs.
const TRENDING_GROUPS = [['80s-and-90s'], ['cartoon'], ['linkedin-headshot'], ['old-money'], ['beard'], ['hairstyle-baby', 'hairstyle-man', 'hairstyle-woman']]
const roundRobin = (ids, max) => {
  const lists = ids.map((id) => categoryItems(id)); const out = []
  for (let i = 0; out.length < max && lists.some((l) => i < l.length); i++) lists.forEach((l) => { if (i < l.length && out.length < max) out.push(l[i]) })
  return out
}
// Spotlight Roll: the first six categories' lead templates, plus a second Old Money template as the 7th card
export const trendingSpotlight = [...TRENDING_GROUPS.slice(0, 6).map((g) => roundRobin(g, 1)[0]), categoryItems('old-money')[1]].filter(Boolean)
const trendingGroups = TRENDING_GROUPS.map((g) => roundRobin(g, 5))
// Grid order: round-robin across the categories (one from each, then the next one from each, ...), so templates of a category are never next to each other
export const trendingGrid = [0, 1, 2, 3, 4].flatMap((i) => trendingGroups.map((g) => g[i])).filter(Boolean)

// A template that is in Trending is not repeated in its own category (it is still in All and in Trending).
export const trendingIds = new Set([...trendingGrid, ...trendingSpotlight].map((t) => t.id))
export const ownItems = (id) => categoryItems(id).filter((t) => !trendingIds.has(t.id))

/** Resolve /generate?categoryId=&assetId= to an asset (with aliases for the reference's own spellings). */
export function findAsset(categoryId, assetId) {
  if (!categoryId || !assetId) return undefined
  const key = assetAliases[`${categoryId}/${assetId}`] || `${categoryId}/${assetId}`
  return [...templates, ...dances, ...folderTemplates, ...Object.values(exploreFolderTemplates).flat()].find((t) => t.id === key)
}
export const siblingsOf = (asset) => (asset.categoryId === 'dance-videos' ? dances : asset.categoryId === 'trending-templates' ? folderTemplates : exploreFolderTemplates[asset.categoryId] || byCategory(asset.categoryId))
export const generateUrl = (t) => `/generate?categoryId=${t.categoryId}&assetId=${t.assetId}`

export const steps = [
  { n: 1, title: 'Choose Template', text: 'Pick your favorite style' },
  { n: 2, title: 'Upload Photo', text: 'JPG, PNG up to 20MB' },
  { n: 3, title: 'Generate', text: 'AI creates magic ✦' },
]

export const features = [
  { image: featureImage('fast'), title: 'Fast AI Generation', text: 'Results in seconds, not hours' },
  { image: featureImage('quality'), title: 'High-Quality Results', text: 'Stunning AI photos & videos in HD' },
  { image: featureImage('download'), title: 'Easy Downloads', text: 'Download and share with one click' },
  { image: featureImage('styles'), title: 'Multiple Styles', text: 'Hundreds of templates & creative styles' },
]


export const demoCreations = [
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: `ci-${n}`, type: 'image', name: `Creation ${n}`, image: creationImage(n), date: 'Demo' })),
  ...[1, 2, 3, 4].map((n) => ({ id: `cv-${n}`, type: 'video', name: `Video ${n}`, image: creationVideo(n), date: 'Demo' })),
]

export const plans = [
  { id: 'weekly', name: 'Weekly Premium', price: '$4.99', per: '/ week', coins: '1,100 Coins', coinImg: 'coin', details: [['Coins included', '1,100'], ['Cost per image', '150 coins'], ['Images available', '7'], ['Coins used for 7 images', '1,050'], ['Remaining coins', '50']] },
  { id: 'monthly', name: 'Monthly Premium', price: '$9.99', per: '/ month', coins: '2,200 Coins', coinImg: 'coin', details: [['Coins included', '2,200'], ['Cost per image', '150 coins'], ['Images available', '14'], ['Coins used for 14 images', '2,100'], ['Remaining coins', '100']] },
  { id: 'yearly', name: 'Yearly Premium', price: '$39.99', per: '/ year', coins: '27,000 Coins / year', coinImg: 'coin', popular: true, details: [['Total coins', '27,000 per year'], ['Monthly allocation', '2,250 coins per month'], ['Cost per image', '150 coins'], ['Images available', '180 per year'], ['Monthly images', 'Up to 15']] },
]
