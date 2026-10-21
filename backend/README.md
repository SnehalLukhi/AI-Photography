# AI Photo Generator - Backend

Node.js + Express API in front of the AILabTools **AI Photography** API: the user uploads one portrait plus a style
(title + description) and gets back a styled AI photo. No frontend is included.

```
backend/
  src/
    server.js                 entry point (listen, temp-file sweeper, graceful shutdown)
    app.js                    express app: helmet, CORS, JSON, routes, error handling
    config/env.js             reads .env
    routes/index.js           /api/health, /api/photos/*   (rate limit + API-key guard + upload)
    controllers/              health.controller.js, photos.controller.js
    services/
      image.service.js        verifies the upload is a real JPEG/PNG/WebP, downscales if >= 4096 px
      ailab.service.js        AILabTools client: submit, poll (async task), error mapping
    middleware/               upload.js (multer), requireApiKey.js, errorHandler.js
    utils/                    AppError.js, tempFiles.js
  test/                       automated tests (local stand-in for AILabTools, test-only)
  postman/                    Postman collection
  .env.example  .gitignore
```

## 1. Install and run

Requires Node.js 20+ (developed on Node 22).

```bash
cd backend
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
# edit .env and set AILAB_API_KEY
npm run dev                 # auto-restart (nodemon)   |   npm start   for production
npm test                    # automated tests - no key, no internet and no credits needed
```
Server: `http://localhost:5001` (`PORT`). Check it: `curl http://localhost:5001/api/health`.

## 2. API key

Create a key at https://www.ailabtools.com/docs/get-api-key and put it in `backend/.env` as `AILAB_API_KEY=...`, then restart.
`.env` is git-ignored; **never put a real key in `.env.example`** (that file is meant to be committed).
The key is only sent to AILabTools in the `ailabapi-api-key` header; no endpoint returns it. Until a key is set,
`POST /api/photos/generate` answers `503 AILAB_API_KEY_MISSING`.

AI Photography costs **15 credits per successful request** (failed requests are not billed).
An account without credits gets `402 AILAB_INSUFFICIENT_CREDITS` (AILabTools: `ERROR_NOT_ENOUGH_CREDITS`).

## 3. API reference

Base URL: `http://localhost:5001`

### `GET /api/health`
```json
{ "status": "ok", "service": "ai-photo-generator-backend", "version": "1.0.0", "uptimeSeconds": 12,
  "timestamp": "2026-10-12T04:05:36.194Z", "ailab": { "provider": "ai-photography", "apiKeyConfigured": true } }
```

### `POST /api/photos/generate`
`Content-Type: multipart/form-data`. The field names are exactly the AILabTools parameter names.

| Field | Type | Required | Description (from the official docs) |
|---|---|---|---|
| `image` | file | yes | Original image. JPEG, JPG, PNG or WEBP, max 10 MB, resolution below 4096x4096 px (larger images are downscaled automatically). |
| `style_title` | text | yes | Style name. **English only**, max 500 characters (extra text is truncated). Use standard vocabulary to pass AILabTools' content review. |
| `style_desc` | text | yes | Style description. **English only**, max 1000 characters (extra text is truncated). Standard vocabulary again. |
| `image_size` | text | no | Output aspect ratio: `auto` (default), `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`. |

Optional query `?response=image` streams the first result image as binary instead of JSON.

The request is **asynchronous** at AILabTools. This endpoint submits the job, then polls
`GET https://www.ailabapi.com/api/common/query-async-task-result?task_id=...` every 5 seconds (the documented recommendation)
until `task_status` is `2` (completed) or `AILAB_POLL_TIMEOUT_MS` (120 s) passes.

Frontend example:
```js
const fd = new FormData()
fd.append('image', file)                                   // File from <input type="file">
fd.append('style_title', 'Golden hour film portrait')
fd.append('style_desc', 'Cinematic golden hour portrait, warm soft light, subtle film grain')
fd.append('image_size', '3:4')                             // optional
const res = await fetch('http://localhost:5001/api/photos/generate', { method: 'POST', body: fd })
const out = await res.json()
if (res.status === 200) show(out.images[0])                // result URL(s)
else if (res.status === 202) poll(out.pollUrl)             // still working: poll GET out.pollUrl
else console.error(out.error.code, out.error.message)
```
Do not set `Content-Type` yourself; the browser adds the multipart boundary.

**Responses**

`200 OK` - finished:
```json
{ "success": true, "status": "succeeded", "provider": "ai-photography", "taskId": "...", "requestId": "...", "logId": "...",
  "expiresInHours": 24, "images": ["https://..."], "data": { "...": "exactly what AILabTools returned in data" } }
```
`202 Accepted` - still `queued` / `processing` after the wait (poll with `pollUrl`):
```json
{ "success": true, "status": "processing", "taskId": "...", "pollUrl": "/api/photos/tasks/..." }
```
> **About `data` / `images`:** the AILabTools docs say the async result `data` "structure depends on the async API" and do not
> define its fields for AI Photography. The backend therefore returns `data` **untouched** and lists every `http(s)` URL found inside
> it in `images` (result files are kept by AILabTools for 24 hours). Nothing is invented or faked.

Errors always look like `{ "success": false, "error": { "code": "...", "message": "..." } }`:

| HTTP | `error.code` | Meaning |
|---|---|---|
| 400 | `MISSING_FIELDS`, `INVALID_IMAGE_SIZE`, `UNEXPECTED_FIELD`, `TOO_MANY_FILES` | missing / wrong form fields |
| 413 | `FILE_TOO_LARGE`, `FILE_SIZE_EXCEEDS_LIMIT` | image over 10 MB |
| 415 | `UNSUPPORTED_FILE_TYPE` | not JPG/PNG/WebP |
| 422 | `INVALID_IMAGE`, `INVALID_STYLE_TEXT`, or an AILabTools code (e.g. `ERROR_NO_FACE_IN_FILE`) | unusable image / non-English style text / API rejection |
| 402 | `AILAB_INSUFFICIENT_CREDITS` | AILabTools account is out of credits |
| 429 | `RATE_LIMITED`, `AILAB_RATE_LIMITED` | too many requests (ours: 10/min per IP) or AILabTools' limit |
| 502 | `AILAB_AUTH_FAILED`, `AILAB_ERROR`, `AILAB_UNREACHABLE`, ... | key rejected / upstream failure |
| 503 | `AILAB_API_KEY_MISSING` | `AILAB_API_KEY` not configured |
| 504 | `AILAB_TIMEOUT` | AILabTools did not answer in time |

### `GET /api/photos/tasks/:taskId`
Status/result of a job (use the `taskId` from a `202`). `200` with the same body as above when `task_status` = 2,
`202` with `status: "queued" | "processing"` otherwise. `?response=image` streams the first result image.

### Accounts (Google sign-in; login required)
There are no passwords: the only way in is "Continue with Google". Accounts live in a Supabase PostgreSQL database (`DATABASE_URL`: Supabase dashboard > Project Settings >
Database > Connection string > Session pooler). The tables are created automatically at start and Row Level Security is switched on for all of them, so the Supabase public
REST API cannot read or change them - only this backend can. Set `JWT_SECRET` (a long random string; required when `NODE_ENV=production`) and `GOOGLE_CLIENT_ID`
(OAuth client of type Web application; the same value as `VITE_GOOGLE_CLIENT_ID` in the frontend `.env`).

Moving from the old SQLite file (`backend/data/app.db`): set `DATABASE_URL`, then run `node scripts/migrate-sqlite-to-postgres.js` once (needs Node >= 22.13 for the old file; safe to run twice).

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/google` | JSON `{ accessToken }` (a Google access token with scopes `openid email profile`) -> `{ token, user }`. Log in **and** sign up: an unknown Google account gets a new user with the free signup coins; a known email logs into that user. Errors: `401 INVALID_GOOGLE_TOKEN`, `503 GOOGLE_NOT_CONFIGURED` |
| `GET /api/auth/me` | the logged-in user (`{ id, email, name, coins }`) |

The token is only trusted after Google confirms it was issued to your client id and the email is verified. Send `Authorization: Bearer <token>` (valid 7 days) on **every**
endpoint except `/api/health`, `/api/plans`, `/api/coin-packs` and `/api/auth/google`; otherwise `401 UNAUTHORIZED`.
Each user may start `DAILY_GENERATION_LIMIT` (default 100) generations per day (`429 DAILY_LIMIT_REACHED`); failed requests are not counted.
Sign-in attempts are limited to `AUTH_RATE_LIMIT_MAX` (20) per IP per 15 minutes. Stored generations belong to the user who made them; other users get `404`.

### Coins
Every generation costs `COIN_COST_PER_GENERATION` coins (default 15); a new account gets `SIGNUP_BONUS_COINS` (default 50). The coins are taken when the request
starts (`402 INSUFFICIENT_COINS` if the balance is too low, before AILabTools is called) and given back automatically if the request fails.
`DAILY_GENERATION_LIMIT` (default 100) stays as an abuse cap. Every change is kept in the `coin_ledger` table.

| Endpoint | Purpose |
|---|---|
| `GET /api/plans` | public: coin plans (`id`, `name`, `price`, `currency`, `per`, `coins`) + `costPerGeneration`; defined in `src/config/plans.js` |
| `GET /api/coin-packs` | public: one-time coin packs (`id`, `name`, `coins`, `price` in US dollars, `currency`) + `costPerGeneration`; defined in `src/config/packs.js` |
| `GET /api/wallet` | `{ coins, costPerGeneration, history[] }` (login required); `coins` is also in the `user` of `/api/auth/me`, login and register |
| `POST /api/wallet/redeem` | JSON `{ code }`: adds the coins of a one-time code (`404 INVALID_CODE`) |
| `POST /api/wallet/checkout` | JSON `{ itemId (plan or coin pack id), currency: "USD" (optional, the only currency) }`: starts a payment. **`503 PAYMENTS_NOT_CONFIGURED` until a payment gateway is connected** - no coins are ever credited for free |

Create redeem codes: `npm run create-code -- 100 5` (5 codes worth 100 coins each; users enter them on the "Transfer code" page).
To connect a gateway: make `createCheckout` in `src/services/payments.service.js` create the gateway's order, and have the gateway's verified webhook call
`grantPurchase(userId, planId, paymentId)` - it credits the plan's coins once per payment id, so webhook retries are safe.

### Stored images (DigitalOcean Spaces)
Set `SPACES_KEY` (a key with Read/Write/Delete permission), `SPACES_SECRET`, `SPACES_BUCKET` and `SPACES_REGION` (e.g. `blr1`) in `.env`. Then every call to the four
`/generate` endpoints saves the user's original photo, and the AI result once it has finished, as one *generation*. Responses get an extra `generation` field; if storage
is off or fails, generation still works and `generation` is missing / `stored: false`. If the job was still running (`202`), polling `GET /api/photos/tasks/:taskId`
saves the result when it finishes and returns `generation` as well.

- **Only images are stored in the Space**: `generations/<id>/original.<ext>` and `generations/<id>/result.<ext>`. Nothing else is written there.
- **The images are public**: every image is uploaded `public-read`, so anyone who has its URL can view it (the URL contains a random id, so it can't be guessed, but it is not secret).
  Keep the Space's "File Listing" on *Restricted* so nobody can browse the folder. `SPACES_PUBLIC_URL` can point to the Space's CDN address.
- **Who owns which image** (user, template, AILabTools task id, the two image keys) is kept in the PostgreSQL database (table `generations`), not in the Space.

A `generation` looks like:
```json
{ "id": "5c1e...-uuid", "status": "completed", "createdAt": "...", "api": "ai-photography", "template": "Retro Vibes",
  "original": { "url": "https://aiphoto.blr1.digitaloceanspaces.com/generations/5c1e.../original.jpg", "mimeType": "image/jpeg" },
  "result":   { "url": "https://aiphoto.blr1.digitaloceanspaces.com/generations/5c1e.../result.jpg", "mimeType": "image/jpeg" } }
```
`status` is `pending` (no result yet; `result` is `null`) or `completed`.

| Endpoint | Purpose |
|---|---|
| `POST /api/generations` | multipart `image` (+ optional `template_name`): save an original photo, returns `201` + `generation` |
| `POST /api/generations/:id/result` | multipart `image`: save an AI image for that generation (`409` if it already has one) |
| `GET /api/generations/:id` | the original + AI image of one generation (login required, owner only) |
| `GET /api/generations?limit=24&nextToken=` | the logged-in user's generations, newest first |
| `DELETE /api/generations/:id` | delete both images and the record; only for the user who created it |

Errors: `503 STORAGE_NOT_CONFIGURED`, `404 GENERATION_NOT_FOUND`, `400 INVALID_GENERATION_ID`, `409 RESULT_ALREADY_SAVED`.
Generations are tied to the logged-in user; other users get `404`. The optional form field `template_name` (all generate endpoints and `POST /api/generations`) is the display name saved with a generation.

## 4. Verified against the official documentation

| Item | Documented | Used here |
|---|---|---|
| Submit | `POST https://www.ailabapi.com/api/image/effects/ai-photography` | same |
| Auth | header `ailabapi-api-key` | same (from `AILAB_API_KEY`) |
| Body | `multipart/form-data`: `image`, `style_title`, `style_desc`, optional `image_size` | same names |
| Submit response | `request_id`, `log_id`, `error_detail{code,code_message,message}`, `task_type: "async"`, `task_id` | `task_id` used for polling |
| Poll | `GET https://www.ailabapi.com/api/common/query-async-task-result?task_id=` | same; every 5 s |
| `task_status` | `0` queued, `1` processing, `2` completed; result in `data` | same |
| Validity | async results valid 24 h | reported as `expiresInHours: 24` |
| Success rule | HTTP 200 (else `error_detail`) | same |

A real request through this backend has been run end to end against AILabTools: the task was accepted, polled (about 30 s in the queue) and completed. A completed
task's `data` is `{ "cost_time": <seconds>, "result_urls": ["https://..."] }`; the backend lists those URLs in `images` (and, with Spaces configured, saves the first one).

## 5. Security and temp files

- Only JPG/JPEG/PNG/WebP, verified by decoding the file (not just the declared MIME type); 10 MB cap; exactly one file.
- Uploads go to a private OS temp folder with random names and are **deleted in a `finally` block** whether the request succeeds or fails
  (also right after validation, before the slow API call). A sweeper removes crash leftovers older than 1 hour. Nothing is stored permanently.
- `helmet` headers, CORS limited to `CORS_ORIGIN`, per-IP rate limit on the generate endpoint, JSON body limit, no stack traces in responses.
- AILabTools says uploaded files are not stored; result files are stored for 24 hours.

## 6. Testing with Postman

1. Start the server (`npm run dev`) with a real `AILAB_API_KEY` and AILabTools credits.
2. Import `backend/postman/AI-Photo-Generator.postman_collection.json`. Collection variable `baseUrl` = `http://localhost:5001`.
3. **Health**: `GET {{baseUrl}}/api/health` -> `"status": "ok"`, `"apiKeyConfigured": true`.
4. **Generate**: `POST {{baseUrl}}/api/photos/generate`, Body -> **form-data**:
   - `image` - hover the key, change its type to **File**, choose a portrait photo.
   - `style_title` (Text) e.g. `Golden hour film portrait`
   - `style_desc` (Text) e.g. `A cinematic golden hour portrait on a sunlit street, warm soft light, subtle film grain`
   - optional `image_size` (Text) e.g. `3:4` (enable the disabled row).

   Send. The request stays open while the backend polls (typically up to a minute or two). `200` -> open a URL from `images`.
   `202` -> the job is still running: the collection saves `taskId`; run **Task status** until it returns `200`.
5. **Generate (raw image)** with Postman's **Send and Download** saves the picture directly.

curl equivalent:
```bash
curl -X POST http://localhost:5001/api/photos/generate \
  -F "image=@portrait.jpg" -F "style_title=Golden hour film portrait" \
  -F "style_desc=A cinematic golden hour portrait, warm soft light, subtle film grain" -F "image_size=3:4"
```

## 7. Configuration (.env)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5001` | server port |
| `AILAB_API_KEY` | - | **required** AILabTools key |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:5174` | allowed frontend origins |
| `MAX_UPLOAD_MB` | `10` | upload cap (the API limit is 10 MB) |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | `10` / `60000` | generate requests per IP per window |
| `AILAB_REQUEST_TIMEOUT_MS`, `AILAB_POLL_INTERVAL_MS`, `AILAB_POLL_TIMEOUT_MS` | `90000`, `5000`, `120000` | timeouts / polling |
| `AILAB_BASE_URL` | `https://www.ailabapi.com` | override only for testing |
