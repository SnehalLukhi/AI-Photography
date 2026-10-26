import { useLoad } from '../../core/hooks.js'

/** The id the website uses for a template card, and the one the Trending API takes: "<category>/<template id>". */
export const tid = (t) => `${t.category_id}/${t.id}`

export const FLOW_LABEL = { photography: 'AI Photography', cartoon: 'Cartoon', beard: 'Beard', hairstyle: 'Hairstyle' }
export const FLOW_TONE = { photography: 'violet', cartoon: 'pink', beard: 'amber', hairstyle: 'blue' }

/** Everything the catalogue pages need: { flows, categories (with template counts), templates (all, inactive too) }. */
export const useCatalogue = (api) => useLoad(() => api.get('/api/admin/catalogue'), [api])

/** A template's picture: its own address, or the website's when it is a site path (/images/...). */
export const imageUrl = (api, t) => (/^https?:/.test(t.preview_url) ? t.preview_url : `${api.url}${t.preview_url}`)
