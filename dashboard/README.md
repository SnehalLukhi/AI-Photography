# Admin Console

One dashboard for several apps. Each app has its own pages; the sidebar, connect screen, tables, dialogs, charts and toasts are shared.

## Run it
```
cd dashboard
npm install
npm run dev        # http://localhost:5180
```
Open it, pick an app and sign in with an admin **user name and password**. Admins are created with the API (see below) and managed on the **Admins** page. The API address is set once in `dashboard/.env` (`VITE_PICTRIFY_API`). The sign-in lasts 12 hours and is kept in this browser until then.

The app's server must allow this console's address: set `CORS_ORIGIN` on that server (e.g. `https://admin.example.com`). `http://localhost:5180` is already allowed for local development.

## Pictrify pages
Overview (users joined, subscribers, revenue) · Users · Subscriptions (name, email, plan, status, payments) · API usage (every image-provider call: outcome, time, coins, result image) · Categories (add / edit / delete) · Templates (add / edit / delete, upload picture, Trending star, "Add many" to upload a batch) · Trending (drag to reorder).
They use the backend's `/api/admin/*` endpoints.

## Add another app
1. Create `src/apps/<name>/index.js` like `src/apps/pictrify/index.js`: `id`, `name`, `apiUrl`, `loginPath` (a POST taking `{ username, password }` and answering `{ token, username, expiresAt }`) and `nav` (groups of pages).
2. Write its pages in `src/apps/<name>/pages/`. A page is a React component that receives `{ api, app }`; call `api.get / post / put / del('/api/...')` (the sign-in token is sent as `Authorization: Bearer`; a 401 sends the person back to the sign-in screen).
3. Add it to the list in `src/apps/index.js`.

Use the shared pieces from `src/core`: `useLoad` (data loading), `PageHeader`, `Stat`, `Badge`, `Modal`, `Confirm`, `Tabs`, `SearchBox`, `Pagination`, `AreaChart`, `Donut`, `useConsole().toast`.

## Build / deploy
`npm run build` makes a static site in `dist/` (any static host).

## Create the first admin
Admins are rows in the app's database (passwords stored only as hashes). The first one is made with the server's `ADMIN_API_KEY`:
```
curl -X POST https://YOUR-SITE/api/admin/admins   -H "x-admin-key: <ADMIN_API_KEY>" -H "content-type: application/json"   -d '{"username":"jane","password":"a long password"}'
```
Then sign in to the dashboard with those details. From then on any signed-in admin can add, switch off, reset or delete admins on the Admins page (or with `POST / PUT / DELETE /api/admin/admins`).
