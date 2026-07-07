# GrowEasy — AI-Powered CSV Lead Importer

Upload any lead export — Facebook Lead Ads, Google Ads, a real-estate CRM, or a
manually made spreadsheet — and have it mapped into GrowEasy's CRM format
automatically, using an LLM to understand arbitrary column names instead of
relying on fixed headers.

**Live demo:** _add your deployed frontend URL here_
**Backend API:** _add your deployed backend URL here_

---

## How it works

1. **Upload** — drag & drop or pick a `.csv` file (client-side, ≤5MB).
2. **Preview** — the file is parsed entirely in the browser (Papaparse). No AI
   call happens yet — you see your raw data exactly as uploaded, in a
   sticky-header, scrollable table.
3. **Confirm** — only after you click *Confirm Import* does anything get sent
   to the backend.
4. **AI mapping** — the backend batches the rows and sends each batch to an
   LLM with a prompt describing the GrowEasy CRM schema and its rules (allowed
   status/source enum values, date format, multi-email/mobile handling, the
   skip rule, etc). Progress streams back to the UI batch-by-batch.
5. **Results** — imported vs. skipped records, with skip reasons, and a
   **Retry Failed** button for any batch that failed AI extraction.

## Architecture

```
groweasy-csv-importer/
├── backend/                  Node.js + Express, stateless (no DB)
│   ├── src/
│   │   ├── index.js                    Express app entry
│   │   ├── routes/import.routes.js     POST /api/import, /api/import/retry
│   │   ├── controllers/import.controller.js   NDJSON streaming response
│   │   ├── services/
│   │   │   ├── csvParser.service.js    CSV buffer -> raw row objects
│   │   │   ├── aiExtractor.service.js  prompt + provider abstraction
│   │   │   ├── batchProcessor.js       chunking, retries, progress events
│   │   │   └── validator.service.js    enum/date rules, skip logic, CSV-safety
│   │   ├── config/crmSchema.js         single source of truth for CRM fields
│   │   └── middleware/upload.middleware.js   multer, CSV-only, 5MB limit
│   └── src/services/__tests__/         Jest unit tests
├── frontend/                  Next.js (App Router) + TypeScript + Tailwind
│   ├── app/{page.tsx, layout.tsx, globals.css}
│   ├── components/
│   │   ├── FileDropzone.tsx            drag & drop upload
│   │   ├── CsvPreviewTable.tsx         sticky headers, virtualized for >150 rows
│   │   ├── ResultsTable.tsx            imported/skipped tabs, retry button
│   │   ├── StepIndicator.tsx           4-step progress tracker
│   │   └── ThemeToggle.tsx             dark/light mode
│   └── lib/{types.ts, api.ts, csv.ts}
└── docker-compose.yml
```

**Why this split:** the preview step is 100% client-side, so "no AI processing
until confirm" is structurally guaranteed rather than just a UI convention.
The backend does exactly one job — batch, extract, validate — and is fully
stateless, so it can be redeployed, scaled horizontally, or swapped between AI
providers without any data migration concerns.

## Tech stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS v4, Papaparse, react-dropzone, react-window
- **Backend:** Node.js, Express, multer, csv-parse
- **AI:** provider-agnostic — Gemini (primary), NVIDIA NIM (fallback), also supports Anthropic/OpenAI, plus a zero-key `mock` mode for local dev/testing

## Local setup

**Requirements:** Node.js ≥ 18

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env
# edit .env — see "AI provider configuration" below
npm run dev          # http://localhost:4000

# 2. Frontend (in a second terminal)
cd frontend
npm install
cp .env.local.example .env.local
npm run dev           # http://localhost:3000
```

Open `http://localhost:3000`, drop in a CSV, and go.

### Test data

`backend/test-data/messy-leads.csv` is a small file with intentionally
mismatched headers (`Full Name`, `Email Address`, `Phone Number`, ...), a
row with two emails, and a row with neither email nor mobile (to exercise the
skip rule) — useful for a quick manual smoke test end-to-end.

## AI provider configuration

Set these in `backend/.env`:

```bash
AI_PROVIDER=gemini              # anthropic | openai | gemini | nvidia | mock
AI_PROVIDER_FALLBACK=nvidia     # optional — tried automatically if AI_PROVIDER fails

GEMINI_API_KEY=your_key_here    # https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-1.5-flash

NVIDIA_API_KEY=your_key_here    # https://build.nvidia.com
NVIDIA_MODEL=meta/llama-3.3-70b-instruct
```

If `AI_PROVIDER`'s call fails for a batch (bad key, quota, transient error),
the batch is automatically retried (`AI_BATCH_MAX_RETRIES`, with backoff), and
if it's still failing, it's retried once more on `AI_PROVIDER_FALLBACK`
before that batch's rows are finally marked skipped. All of this happens
inside `aiExtractor.service.js` — swapping providers, or adding a new one, is
a self-contained change there; no other file needs to know which provider is
active.

`AI_PROVIDER=mock` requires no API key at all — it does heuristic
header-alias matching (e.g. "Full Name" → `name`, "Phone Number" →
`mobile_without_country_code`) so the whole pipeline can be built and tested
without spending on API calls.

## Running tests

```bash
cd backend
npm test
```

28 unit tests cover the parts that matter most for correctness: enum
enforcement, date validation, multi-email/mobile merging into `crm_note`, the
skip-if-no-contact rule, CSV-safe line-break escaping, CSV parsing edge cases
(BOM, ragged rows, arbitrary headers), and batch chunking/progress reporting.

## Docker

```bash
docker compose up --build
```

Runs both services (frontend on `:3000`, backend on `:4000`). Set AI provider
keys via a `.env` file at the repo root, or export them before running —
`docker-compose.yml` reads `AI_PROVIDER`, `GEMINI_API_KEY`, `NVIDIA_API_KEY`,
etc. from the environment with sensible defaults (`mock` if nothing is set).

## Deployment

- **Frontend → Vercel:** import the `frontend/` directory as the project
  root, set `NEXT_PUBLIC_API_URL` to your deployed backend URL.
  `frontend/vercel.json` is included.
- **Backend → Render/Railway:** deploy `backend/` as a Node web service
  (`npm install` / `node src/index.js`). `backend/render.yaml` is included as
  a starting point. Set `FRONTEND_ORIGIN` to your deployed frontend's URL (for
  CORS) and your AI provider keys.

## Bonus features implemented

- Drag & drop upload
- Real progress indicator (streamed NDJSON, batch-by-batch, not a fake spinner)
- Streaming/incremental response (backend streams progress as it processes instead of waiting for the entire file)
- Retry mechanism — automatic (per-batch, with backoff) and manual ("Retry Failed" button in the UI)
- Dark/Light mode
- Unit tests (28 tests, Jest)
- Docker setup (both services + Docker Compose)
- Deployment configuration (Vercel + Render)
- Comprehensive README

## Known limitations / honest notes

- The AI extractor asks the model to return one output record per input row
  in order; if a model ever returns a mismatched array length, that whole
  batch is treated as failed and its rows land in "Skipped" (retryable),
  rather than risking silent misalignment between input and output rows.
- `mock` mode is intentionally simple (alias-based header matching) — it's a
  development/testing aid, not a substitute for the real AI providers'
  extraction quality.
- No database, by design (per the assignment's stateless requirement) — a
  page refresh mid-import means starting over.