/**
 * Cartoon Yourself templates: the explicit link between a Pictrify template id and the AILabTools `type` value that is sent to
 * POST /api/portrait/effects/portrait-animation. Nothing is guessed or derived at request time: an id that is not in this table (or an
 * `api_value` set in the Admin) and is not itself a documented type is rejected, never forwarded to the API.
 *
 * Verified against (1) the official list of 49 `type` values (./cartoonTypes.js) and (2) the template list the templates were created from
 * (cartoon_yourself_templates.json: id + name for all 49). In that list every id is exactly the API type. The database holds 48 of those templates:
 * 46 under that id, and two that were uploaded with name-derived ids that are NOT API types; they are mapped here to the type the source list gives them:
 *   3d_toon  ("3D Toon")  -> 3d_cartoon
 *   artistic ("Artistic") -> artstyle
 * The API itself offers no per-type descriptions, so the names below are the source list's.
 */
const TYPES = {
  jpcartoon: 'jpcartoon', // Japanese Toon
  anime: 'anime', // Anime Style
  'retro_anime_90s': 'retro_anime_90s', // 90s Anime
  shoujo_manga: 'shoujo_manga', // Shojo Toon
  black_white_manga: 'black_white_manga', // Mono Manga
  korean_webtoon: 'korean_webtoon', // K-Toon
  hkcartoon: 'hkcartoon', // HK Toon
  hongkong: 'hongkong', // Hong Kong Comic
  amcartoon: 'amcartoon', // American Toon
  comic: 'comic', // Comic Book
  classic_cartoon: 'classic_cartoon', // Vintage Toon
  tccartoon: 'tccartoon', // Cute Toon
  ukiyoe_cartoon: 'ukiyoe_cartoon', // Ukiyo Art
  'animation3d': 'animation3d', // 3D Animated
  '3d_cartoon': '3d_cartoon', // 3D Toon
  '3d': '3d', // 3D Style
  '3d_game': '3d_game', // Game Render 3D
  pixar: 'pixar', // Studio 3D
  pixar_plus: 'pixar_plus', // Studio 3D Plus
  handdrawn: 'handdrawn', // Hand Sketch
  sketch: 'sketch', // Line Sketch
  'pencil_drawing_2': 'pencil_drawing_2', // Graphite Sketch
  colored_pencil: 'colored_pencil', // Color Pencil Sketch
  watercolor: 'watercolor', // Watercolor Wash
  gouache: 'gouache', // Gouache Paint
  oil_painting: 'oil_painting', // Oil Canvas
  pastel_drawing: 'pastel_drawing', // Soft Pastel
  ink_wash: 'ink_wash', // Ink Brush
  claborate: 'claborate', // Detailed Art
  paper_cut: 'paper_cut', // Papercraft
  fashion_illustration: 'fashion_illustration', // Fashion Sketch
  concept_art: 'concept_art', // Concept Sketch
  flat_vector: 'flat_vector', // Flat Illustration
  sticker_cartoon: 'sticker_cartoon', // Sticker Toon
  low_poly: 'low_poly', // Polygon Art
  pixel_art: 'pixel_art', // 8-Bit Pixel
  clay_animation: 'clay_animation', // Claymation Look
  felt_doll: 'felt_doll', // Felt Toy
  western: 'western', // Western Toon
  angel: 'angel', // Celestial Angel
  demon: 'demon', // Dark Demon
  avatar: 'avatar', // Avatar Look
  cyberpunk: 'cyberpunk', // Neon Cyber
  steampunk: 'steampunk', // Steam Gear
  noir_comic: 'noir_comic', // Dark Noir
  bopu_cartoon: 'bopu_cartoon', // Bubble Toon
  crayon_childlike: 'crayon_childlike', // Kids Crayon
  artstyle: 'artstyle', // Artistic
  famous: 'famous', // Celebrity Style
}

// ids that exist in the database but differ from the API type
const ALIASES = {
  '3d_toon': '3d_cartoon', // "3D Toon"
  artistic: 'artstyle', // "Artistic"
}

/** The AILabTools `type` for a template id, or '' when the id is unknown. */
const cartoonTypeFor = (id) => (Object.hasOwn(ALIASES, id) ? ALIASES[id] : Object.hasOwn(TYPES, id) ? TYPES[id] : '')

module.exports = { TYPES, ALIASES, cartoonTypeFor }
