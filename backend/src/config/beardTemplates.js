/**
 * AI Beard Styling templates: the confirmed link between each template of src/data/ai-beard-styling_templates.json (matched by its `id`)
 * and its preview image in public/images/explore/beard/. The mapping is written out explicitly - never derived from a file name at request time.
 * `file: null` = the JSON entry has no preview image, so it cannot be sent as the reference image (`image_template`).
 *
 * API (https://www.ailabtools.com/docs/ai-portrait/editing/ai-beard-styling/api): POST /api/portrait/editing/ai-beard-styling, multipart:
 *   image (binary, required) + EITHER `beard` (enum preset) OR `image_template` (binary reference image; `beard` wins when both are sent).
 * This integration sends `image_template` = the template's preview image, and never `beard`.
 */
const TEMPLATES = {
  beard_fullbeardclassic: 'FullBeardClassic (FullBeardClassic).jpg',
  beard_corporatebeard: 'CorporateBeard (CorporateBeard).jpg',
  beard_garibaldi: 'Garibaldi (Garibaldi).jpg',
  beard_verdi: 'Verdi (Verdi).jpg',
  beard_fullbeardtapered: 'FullBeardTapered (FullBeardTapered).jpg',
  beard_vandyke: 'VanDyke (VanDyke).jpg',
  beard_bandholz: 'Bandholz (Bandholz).jpg',
  beard_vandykerefined: null, // no preview image in the folder
  beard_goatee: 'Goatee (Goatee).jpg',
  beard_extendedgoatee: 'ExtendedGoatee (ExtendedGoatee).jpg',
  beard_balbo: 'Balbo (Balbo).jpg',
  beard_anchorbeardclean: 'AnchorBeardClean (AnchorBeardClean).jpg',
  beard_ducktailbeardpointed: 'DucktailBeardPointed (DucktailBeardPointed).jpg',
  beard_anchorbeardfull: 'AnchorBeardFull (AnchorBeardFull).jpg',
  beard_ducktailbeardfull: 'DucktailBeardFull (DucktailBeardFull).jpg',
  beard_heavystubble: 'HeavyStubble (HeavyStubble).jpg',
  beard_chevronmoustache: 'ChevronMoustache (ChevronMoustache).jpg',
  beard_handlebarmoustache: 'HandlebarMoustache (HandlebarMoustache).jpg',
  beard_imperialmoustache: 'ImperialMoustache (ImperialMoustache).jpg',
  beard_circlebeard: 'CircleBeard (CircleBeard).jpg',
  beard_chinstrap: 'ChinStrap (ChinStrap).jpg',
  beard_muttonchops: 'MuttonChops (MuttonChops).jpg',
  beard_soulpatch: 'SoulPatch (SoulPatch).jpg',
  beard_petitegoatee: 'PetiteGoatee (PetiteGoatee).jpg',
}

module.exports = TEMPLATES
