# jack — Student Note-Taking App

Store typed notes **and** photos of handwritten notes in one searchable place.
Snap a photo of your lecture notes, tag it by subject, and find it again in a
couple of clicks from any device. No login required — open the app and go.

Built with **React (Vite)** + **Node.js (Express)** + **SQLite** — and it deploys
**entirely on Vercel** using **Turso** (`@libsql/client`) for the shared database
and **Vercel Blob** for image storage. A single codebase runs locally with a
plain SQLite file and on Vercel with Turso + Blob — no code changes.

---

## Features

- **No authentication** — open the app and start adding notes immediately
- Create notes with a title, subject, tags, and description
- Prominent image section for uploading photos of handwritten notes
  (multi-image, drag-and-drop, JPG/PNG/WebP/GIF, ≤10 MB each)
- Searchable dashboard — filter by **keyword** (title/subject/tags/description),
  **subject**, and sort by recency
- Full edit + delete for notes and individual images
- Lightbox viewer for browsing note photos
- Responsive design for desktop, tablet, and phone

## Project structure

```
note-app/
├── server/                 # Express API
│   ├── src/
│   │   ├── index.js        # entry point
│   │   ├── app.js          # express app (CORS, /api/config, static client)
│   │   ├── db.js           # libSQL client (SQLite file locally / Turso on Vercel)
│   │   ├── schema.sql      # database schema
│   │   ├── lib/
│   │   │   └── storage.js  # local-disk, S3, or Vercel Blob image storage
│   │   ├── middleware/
│   │   │   └── upload.js   # multer config (image-only, 10 MB)
│   │   └── routes/
│   │       └── notes.js    # CRUD notes + image upload, streaming & blob tokens
│   ├── test/api.test.js    # end-to-end API smoke tests
│   └── .env.example
├── client/                 # React SPA (Vite)
│   └── src/
│       ├── App.jsx         # routing
│       ├── api.js          # fetch wrapper + direct-to-Blob image upload
│       ├── pages/          # Dashboard, NewNote, NoteView, EditNote
│       ├── components/     # Navbar, NoteCard, NoteForm, ImagesSection,
│       │                   # ImageUploader, Lightbox
│       └── styles.css      # global responsive styles
├── api/
│   └── index.js            # Vercel serverless function (the Express app)
├── vercel.json             # Vercel build/routing config
├── Dockerfile
├── package.json            # root scripts (dev / build / start / test)
└── .gitignore
```

## Database schema

| Table     | Columns                                                                  |
| --------- | ------------------------------------------------------------------------ |
| `notes`   | id, title, subject, description, tags, created_at, updated_at            |
| `images`  | id, note_id (FK → notes, cascade), storage_key, mime, url, created_at    |

- Tags are stored as `,tag1,tag2,` for fast `LIKE` search.
- Locally the DB is a **SQLite** file (`server/data/notes.db`); on Vercel the
  same schema runs on **Turso** (`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`),
  so dev and production stay byte-for-byte identical.
- `images.url` holds the public Vercel Blob URL when deployed on Vercel
  (empty for local disk, where files are streamed through the API).

## Quick start (development)

Requires **Node.js ≥ 22**.

```bash
cd note-app
npm run install:all     # installs root, server, and client dependencies
npm run dev             # runs API (port 5000) + Vite (port 5173) together
```

Open **http://localhost:5173** and start adding notes.

> The Vite dev server proxies `/api` to `http://localhost:5000`, so no CORS
> setup is needed locally.

### Run tests

```bash
npm test                # API smoke tests (create → upload → search → update → delete)
```

### Production build (single instance)

```bash
npm run build           # compiles the React app into client/dist
npm start               # Express serves the API AND the built client
# → http://localhost:5000
```

Set `NODE_ENV=production` in production so the built client is served from
`client/dist`.

## Environment variables

Copy `server/.env.example` to `server/.env` and adjust. All variables are
optional except where noted.

| Variable             | Default       | Purpose                                                          |
| -------------------- | ------------- | ---------------------------------------------------------------- |
| `PORT`               | `5000`        | API/static server port                                           |
| `NODE_ENV`           | `development` | `production` serves the built client from `client/dist`          |
| `DB_PATH`            | `server/data/notes.db` | SQLite file location (local only)                     |
| `STORAGE_DRIVER`     | `local`       | `local`, `s3`, or `vercel-blob`                                  |
| `UPLOAD_DIR`         | `server/uploads` | Local upload folder                                         |
| `CORS_ORIGIN`        | *(empty)*     | Comma-separated allowed origins when the client is hosted separately |
| `TURSO_DATABASE_URL` | *(empty)*     | Turso database URL (set on Vercel for the shared DB)            |
| `TURSO_AUTH_TOKEN`   | *(empty)*     | Turso auth token (set on Vercel)                                |
| `BLOB_READ_WRITE_TOKEN` | *(injected)* | Vercel Blob token — auto-injected when a Blob store is attached |
| `S3_BUCKET`          | —             | Required when `STORAGE_DRIVER=s3`                                |
| `S3_REGION`          | `us-east-1`   | S3 region                                                         |
| `S3_ENDPOINT`        | *(empty)*     | Custom endpoint (MinIO, R2, local emulator)                      |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | — | S3 credentials; falls back to AWS credential chain   |

### Using Turso instead of a local SQLite file

On Vercel (or any serverless host) each function is stateless, so a local file
database won't work. The app uses **Turso** — libSQL, a SQLite-compatible
database — so the SQL stays identical:

1. Create a free database at [turso.tech](https://turso.tech) (e.g. `studynotes`).
2. Copy the `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` values.
3. Set them in your host's environment. The schema is created automatically on
   first run.

> Locally nothing changes: `db.js` uses a `file:` libSQL URL (plain SQLite)
> unless `TURSO_DATABASE_URL` is set.

### Using S3 (or S3-compatible) for image storage

Set in `server/.env`:

```
STORAGE_DRIVER=s3
S3_BUCKET=your-bucket
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

The app uses the official AWS SDK v3. Any S3-compatible store works — for
MinIO or a local emulator add `S3_ENDPOINT=http://localhost:9000`. Images are
stored under `notes/<uuid>.<ext>` and streamed back through the API.

### Using Vercel Blob for image storage

Set `STORAGE_DRIVER=vercel-blob` and attach a **Blob store** to the Vercel
project (Storage tab). Vercel injects `BLOB_READ_WRITE_TOKEN` automatically.
Uploads go **directly from the browser to Blob** (no 4.5 MB request-body limit),
and the API only records the resulting URL.

## Deployment

### Option A — Fully on Vercel (recommended)

One project, one domain: Vercel serves the React app, runs the Express API as a
serverless function, stores images in **Vercel Blob**, and the data in **Turso**.

1. **Push the repo** to GitHub and create a new project on
   [vercel.com](https://vercel.com) by importing it. No settings are needed —
   `vercel.json` wires everything up (Vite build + `api/index.js` function).
2. **Create a Turso database** at [turso.tech](https://turso.tech) (free tier).
   In the Vercel project → **Settings → Environment Variables**, add:
   - `TURSO_DATABASE_URL` — e.g. `libsql://studynotes-xxxx.turso.io`
   - `TURSO_AUTH_TOKEN` — your Turso token
3. **Attach a Blob store**: Vercel → project → **Storage → Create → Blob**.
   Vercel injects `BLOB_READ_WRITE_TOKEN` and sets `STORAGE_DRIVER` for you —
   actually set `STORAGE_DRIVER=vercel-blob` manually in Environment Variables
   (the app uses it to switch upload mode).
4. Redeploy (Vercel builds automatically). Open your
   `https://your-app.vercel.app` and start adding notes.

How it works:

- `vercel.json` runs `npm run install:all` + `npm run build`, outputs the Vite
  app to `client/dist`, and routes `/api/*` to the Express function
  (`api/index.js`).
- The Express function reads `STORAGE_DRIVER=vercel-blob`, so the browser
  uploads images directly to Blob (no body-size limits) and the API records the
  URLs; `GET .../images/:id/file` 302-redirects to the Blob URL.
- All functions share the Turso database, so notes survive restarts and cold
  starts.

### Option B — One instance (Render / Railway / Fly / AWS EC2)

The Express server serves both the API and the built frontend.

1. **Render**
   - New **Web Service** → connect repo.
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Add env vars from the table above; set `NODE_ENV=production`.
   - Render auto-injects `PORT` and gives you an HTTPS URL.
2. **Railway / Fly.io** — same build/start commands; both auto-provide `PORT`
   and TLS.
3. **AWS EC2** — deploy the Docker image:

```bash
docker build -t studynotes .
docker run -d -p 5000:5000 \
  -e NODE_ENV=production \
  -v studynotes-data:/app/server/data \
  -v studynotes-uploads:/app/server/uploads \
  studynotes
```


### Option C — Frontend on Vercel, API elsewhere

1. Deploy `server/` on Render/Railway as above.
2. Create `client/.env.production` with `VITE_API_BASE=https://your-api.onrender.com`.
3. On Vercel: framework **Vite**, root `client/`, build `npm run build`, output
   `dist`.
4. Set the API's `CORS_ORIGIN` to your Vercel domain.

### Docker

The included `Dockerfile` builds the client, installs production server deps,
and runs the API + static site on `PORT`. Mount volumes for `server/data` and
`server/uploads` to persist data across restarts.

## How students use the app

1. **Open the app** — no account needed. The dashboard lists your most recently
   updated notes.
2. **Add a note** — click **+ New note**. Type a title, pick a subject, add
   tags (e.g. `exam, chapter 4`), write a short description.
3. **Add images** — in the highlighted **Add images** section, drag photos of
   your handwritten notes into the drop zone or click **Choose images**. Add as
   many as you like; remove any with the × button.
4. **Find notes fast** — use the search box (searches title, subject,
   description, and tags), filter by subject, or sort by title.
5. **Review** — click any card to open the note. Click a photo to view it full
   size; use arrow keys to flip through pages.
6. **Edit / delete** — on a note page, **Edit** to change text, add images, or
   remove individual images; **Delete** removes the note and its images.

> This build has **no authentication** — everyone using the device sees the
> same shared notebook. Perfect for a personal device or a classroom station.

## Security notes

- Uploads are filtered by MIME type and capped at 10 MB per file.
- SQL is parameterized throughout.
- There is no user data or credentials stored anywhere.

## License

MIT — use it, fork it, ship it.
