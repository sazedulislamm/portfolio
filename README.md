# Sazedul Islam — Portfolio (Next.js)

A personal portfolio site built with **Next.js**, React, Tailwind CSS, Framer Motion transitions, Radix UI (shadcn-style components), and Swiper.




## Seeding the database

A small idempotent seeder is included to populate the `services` catalog into Cloudflare D1.

How it works
- The script reads the catalog from `src/helpers/servicesData.js`.
- It runs `CREATE TABLE IF NOT EXISTS services (...)` so the table is created when missing.
- For each service the script checks by `title` and will `UPDATE` if found or `INSERT` if not — this keeps the seed idempotent.

Run the seeder
1. Make sure your `.env` at the repo root contains `CF_ACCOUNT_ID`, `CF_API_TOKEN`, and `D1_DATABASE_ID`.
2. Install dev dependencies (to ensure `dotenv` is available):
```bash
npm install
```
3. Run the seeder:
```bash
npm run seed:d1
```

Behavior
- First run: creates the `services` table (if missing) and inserts seed rows.
- Re-running: updates existing rows (matching on `title`) and inserts new ones; no duplicates are created.

Quick verification
- Local API (after `npm run dev`):
```bash
curl http://localhost:3000/api/services
```
- Direct D1 query (uses env vars):
```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/d1/database/$D1_DATABASE_ID/query" \
	-H "Authorization: Bearer $CF_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '{"sql":"SELECT id,title,tier,price,turnaround,status,sort_order FROM services ORDER BY sort_order"}'
```

Options you can add
- `--prune`: remove DB rows not present in the seed (sync mode).
- Use a stable `slug` field instead of `title` for matching/upserts (recommended for production).



## Pages / Routes

Routes are defined in the Next.js app router under [src/app/](src/app/):

- `/` → Home (composed page: Home + Services + Resume + Projects + Contact)
- `/services` → Services
- `/resume` → Resume (tabs + scroll-driven tab switching)
- `/projects` → Work/Projects slider
- `/contact` → Contact form + contact info

## Tech Stack

- **Frontend + Backend:** Next.js App Router
- **UI:** Tailwind CSS, shadcn/Radix UI components (see [src/components/ui/](src/components/ui/))
- **Animation:** Framer Motion
- **Slider:** Swiper
- **Data:** Cloudflare D1 for structured records
- **Files:** imgBB for project image uploads and hosted media URLs
- **HTTP:** `fetch` + Next.js Route Handlers

## Scripts

From [package.json](package.json):

- Install deps: `npm install`
- Dev server: `npm run dev` (also `npm run start:dev`)
- Production build: `npm run build`
- Start production server: `npm start`
- Lint: `npm run lint`

## Environment Variables

Copy [.env.example](.env.example) to `.env.local` (recommended) and fill in values.

### GitHub Stats (optional)

Used by [src/components/Stats.jsx](src/components/Stats.jsx) through [src/app/api/github-stats/route.js](src/app/api/github-stats/route.js).

- `GITHUB_USERNAME` — your GitHub username
- `GITHUB_TOKEN` — optional GitHub token to enable commit contributions

Notes:

- Commit count shown is **GitHub “total commit contributions (last year)”** from the GraphQL API.
- Results are cached in `localStorage` for ~6 hours to reduce API calls.

### Contact Form (optional)

Used by [src/Page/Contact/Contact.jsx](src/Page/Contact/Contact.jsx).

- `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` — enables sending via Web3Forms (`https://api.web3forms.com/submit`).
- If the key is missing, the form falls back to `mailto:` so it still works locally.

### Cloudflare bindings for the free stack

The planned admin backend uses Cloudflare bindings instead of a separate premium backend.

- `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `D1_DATABASE_ID` — required for the Next.js route handlers to query D1 directly during local/server-side development
- `IMGBB_API_KEY` — required for uploading project images to imgBB from the admin dashboard
- `ADMIN_SESSION_SECRET` — server-only secret for auth/session signing
- `ADMIN_PASSWORD` — temporary password for the initial simple login flow

Cloudflare deployment bindings already live in [wrangler.toml](wrangler.toml):

- `DB` for D1

### Security warning (important)

Only `NEXT_PUBLIC_*` variables are bundled into the browser. Keep secrets like `GITHUB_TOKEN`, `ADMIN_SESSION_SECRET`, and `ADMIN_PASSWORD` server-only.

## Content Editing

- Projects data: [src/components/Projects.jsx](src/components/Projects.jsx)
	- Supports mixed item shapes (new backend entries use `name / techStack / responsibilities / liveDemo`, older entries use `title / stack / live`).
- Services list (single source of truth): [src/helpers/servicesData.js](src/helpers/servicesData.js)
	- Used by both Services page and Contact “Select a service”.
- Resume content (About/Experience/Education/Skills): [src/Page/Resume/Resume.jsx](src/Page/Resume/Resume.jsx)

## Free Backend Plan

This portfolio is designed to stay on the free Cloudflare path:

- **App:** Next.js hosted on Cloudflare
- **Database:** D1 for projects, services, messages, settings, and admin records
- **Storage:** imgBB for project images, D1 for structured data
- **Admin:** Next.js Route Handlers inside the same repo

Current implementation status:

- D1-backed admin overview, projects, services, stats, and settings routes are wired.
- Projects and services support create, edit, and delete from the admin dashboard.
- Project images are uploaded to imgBB from the admin dashboard and the returned URL is stored in D1.

Implementation notes are documented in [docs/free-stack-plan.md](docs/free-stack-plan.md).

## Build & Deployment

- Build: `npm run build`
- Start production server: `npm start`

For the free deployment path, use Cloudflare with the OpenNext adapter, then bind D1 in `wrangler` and set `IMGBB_API_KEY` for project uploads.

See [docs/free-stack-plan.md](docs/free-stack-plan.md) for the rollout plan.