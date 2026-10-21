/**
 * Documented values of the AILabTools Hairstyle Changer Premium API (POST /api/portrait/effects/hairstyle-editor-premium):
 * https://www.ailabtools.com/docs/ai-portrait/effects/hairstyle-editor-premium/api  (`hair_style` and `color` enums, copied from the docs).
 */
const pad = (n, w) => String(n).padStart(w, '0')
const range = (prefix, count) => Array.from({ length: count }, (_, i) => `${prefix}${pad(i + 1, 4)}`)

const HAIR_STYLES = [
  'BuzzCut', 'UnderCut', 'Pompadour', 'SlickBack', 'CurlyShag', 'WavyShag', 'FauxHawk', 'Spiky', 'CombOver', 'HighTightFade', 'ManBun', 'Afro', 'LowFade',
  'UndercutLongHair', 'TwoBlockHaircut', 'TexturedFringe', 'BluntBowlCut', 'LongWavyCurtainBangs', 'MessyTousled', 'CornrowBraids', 'LongHairTiedUp',
  'Middle-parted', 'ManGreased', 'WavyMiddlePart', 'Natural_Side-Part', 'Wolf_Crop', 'Wind-Tousled_Crop', 'Side-Parted_Textured', 'FluffyMiddlePart',
  'FreshSide-Parted', 'Smooth_Crop', 'Korean_Wavy_Crop', 'Comma_Hair', 'Side-Part_Crop', 'Natural_Middle_Part', 'ShortPixieWithShavedSides', 'ShortNeatBob',
  'DoubleBun', 'Updo', 'Spiked', 'bowlCut', 'Chignon', 'PixieCut', 'SlickedBack', 'LongCurly', 'CurlyBob', 'StackedCurlsInShortBob',
  'SidePartCombOverHairstyleWithHighFade', 'WavyFrenchBobVibesfrom1920', 'BobCut', 'ShortTwintails', 'ShortCurlyPixie', 'LongStraight', 'LongWavy', 'FishtailBraid',
  'TwinBraids', 'Ponytail', 'Dreadlocks', 'Cornrows', 'ShoulderLengthHair', 'LooseCurlyAfro', 'LongTwintails', 'LongHimeCut', 'BoxBraids', 'Layered_Waves',
  'Side_Flip_Perm', 'Textured_Crop', 'Mushroom_Curl', 'Vintage_Curls', 'Magic_Perm', 'Side-Parted_Waves', 'Fluffy_Short', 'Smooth_Inward_Bob', 'Neat_Short',
  'Natural_Short', 'Chic_Tapered_Bob', 'Edgy_Textured_Pixie', 'Elegant_Wavy_Crop', 'Chic_Wavy_Pixie', 'Elegant_Side_Wave', 'Soft_Layered_Curl', 'Executive_Pixie',
  'Curved_Chic_Bob', 'Airy_Short_Curls', 'Playful_Curly_Bob', 'Playful_Wavy_Bob', 'Elegant_Soft_Curl', 'Elegant_Smooth_Bob', 'Retro_Airy_Curl', 'Soft_Wavy_Bob',
  'Light_Inward_Bob', 'Neat_Curly_Crop_Cut', 'Elegant_Volumized_Bob', 'Modern_Curls_Chic', 'Mocha_Volume_Pixie', 'Elegant_Side_Flow', 'Chestnut', 'ChoppyBangs',
  'StructuredWavyShag', 'TinfoilPerm', 'ClassicWavyBob', 'Fluffy_Pixie_Cut', 'FrenchBangs', 'JapaneseShort', 'MediumLongLayered',
  ...range('male_hairstyle_', 62),
  ...range('female_hairstyle_', 73),
]

const COLORS = [
  'original', 'reference', 'blonde', 'platinumBlonde', 'brown', 'lightBrown', 'blue', 'lightBlue', 'purple', 'lightPurple', 'pink', 'black', 'white', 'grey',
  'silver', 'red', 'orange', 'green', 'gradient', 'multicolored', 'darkBlue', 'burgundy', 'darkGreen',
]

module.exports = { HAIR_STYLES, COLORS }
