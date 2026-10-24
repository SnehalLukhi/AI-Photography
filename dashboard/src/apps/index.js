import pictrify from './pictrify/index.js'

/**
 * The apps this console manages. To add another application:
 *   1. make a folder src/apps/<name>/ with an index.js like src/apps/pictrify/index.js (id, name, default API address, and its pages);
 *   2. import it here and add it to the list.
 * Its pages get `{ api, app }` and call that app's own admin API through `api.get / post / put / del`. The sidebar, connection screen,
 * toasts, tables, dialogs and charts (src/core) are shared, so a new app only needs its own pages.
 */
export default [pictrify]
