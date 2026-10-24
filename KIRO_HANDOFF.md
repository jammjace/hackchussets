# Kiro Handoff: Sodium Tracker Web App (Modules B and C)

Owner: Vansh. Module A (video and computer vision) owner: Jace.
Read this whole file before writing code. The team README (`README.md`) is the source of truth for the shared contract; this file explains how Modules B and C implement it.

---

## 1. What we are building

A web app for home cooks managing high blood pressure, especially Latino and Vietnamese American households. The cook records themselves cooking with a head-mounted camera, uploads the video, and gets an **interactive cooking timeline**: every seasoning added, when it was added, how much, how much sodium it contributed, a photo of the moment, and the total sodium in the dish compared with the 2,300 mg daily limit.

Clicking a timeline item jumps the video to that moment.

**This is a hackathon demo.** It gives estimates, not medical advice.

---

## 2. Who owns what

| Module | Owner | Status |
|---|---|---|
| A: Ingredient detection (video → frames → GPT-4.1 mini → `events.json` + evidence JPEGs) | Jace | Scaffolded. Does not yet output `session_id`, `timestamp` or `evidence_frame` |
| B: Sodium engine (events → sodium per event + total) | Vansh | **Done** in `backend/sodium_engine/` |
| C backend: API, sessions, file serving, joining A and B | Vansh | **Done** in `backend/app.py`, running on mock data |
| C frontend: all screens | Vansh | **To build with Kiro**, in `web/` |

The frontend is the remaining work.

---

## 3. Architecture

Everything runs on **one laptop** for the demo. Jace's pipeline writes files to disk, so the backend must share that disk. Do not deploy the backend to Vercel (no persistent disk, 4.5 MB upload limit).

```
Head-mounted camera ──(transfer file)──> laptop
                                           │
Browser: Next.js web app  http://localhost:3000
   │  upload video, pantry edits, read results
   ▼
FastAPI backend  http://localhost:8000   (backend/app.py)
   │  saves video, creates session_id
   ├──> module_a_bridge.py ──> Jace's pipeline (or mock)
   │        writes storage/sessions/<session_id>/events.json + evidence/*.jpg
   ├──> sodium_engine.calculate(events, pantry)
   └──> serves results JSON, evidence images, video
```

`localhost` counts as a secure origin, so camera access works if ever needed. The main input path is **file upload**, because a head-mounted camera records to its own storage.

### Storage layout (team README section 5)

```
backend/storage/
  pantry.json                       # only exists after the user edits the pantry
  recordings/cooking_001.mp4
  sessions/cooking_001/
    events.json
    evidence/event_001.jpg
```

---

## 4. Running the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
pytest        # 22 tests. The mock dish must total 5163.3 mg
```

| Env var | Default | Meaning |
|---|---|---|
| `MODULE_A_MODE` | `mock` | `mock`: fixture events and placeholder JPEGs. `real`: Jace's pipeline (not wired yet) |
| `STORAGE_DIR` | `backend/storage` | Recordings and sessions |
| `CORS_ORIGINS` | `http://localhost:3000` | Frontend origins, comma-separated |

Quick check:

```bash
curl -X POST localhost:8000/api/sessions/demo          # {"session_id":"cooking_001"}
curl localhost:8000/api/sessions/cooking_001/results   # the timeline JSON
```

---

## 5. API the frontend calls

Base URL from `NEXT_PUBLIC_API_BASE` (default `http://localhost:8000`). All URLs returned by the API are **relative**; prefix them with the base URL.

| Method and path | Purpose | Request | Response |
|---|---|---|---|
| `GET /api/health` | Backend is up | none | `{"status":"ok"}` |
| `GET /api/pantry` | Current pantry | none | Pantry (section 6.3) |
| `PUT /api/pantry` | Save the whole edited pantry | Pantry JSON | Pantry |
| `POST /api/pantry/reset` | Restore default pantry | none | Pantry |
| `POST /api/sessions` | Upload video, create session, run Module A | `multipart/form-data`, field `video` (`.mp4`, `.mov`, `.webm`, `.m4v`) | `{"session_id":"cooking_001"}`. 415 for other file types |
| `POST /api/sessions/demo` | Mock session with no video | none | `{"session_id":"cooking_002"}` |
| `GET /api/sessions/{id}/results` | Timeline joined with sodium | none | Results (section 6.2). 404 if not processed |
| `GET /api/sessions/{id}/evidence/{event_id}.jpg` | Evidence image | none | JPEG |
| `GET /api/sessions/{id}/video` | Original video, supports seeking | none | video |

`POST /api/sessions` waits until Module A finishes. In mock mode that is instant; with Jace's real pipeline it may take a minute or more, so the frontend must show a processing screen while the request is in flight.

---

## 6. Data contracts

### 6.1 Module A output: `events.json` (team README section 6, do not change)

```json
{
  "session_id": "cooking_001",
  "events": [
    {
      "event_id": "event_001",
      "timestamp_start": 8.0,
      "timestamp_end": 11.5,
      "timestamp": 9.5,
      "ingredient": "chicken bouillon",
      "quantity": 1,
      "unit": "cube",
      "addition_confirmed": true,
      "evidence_frame": "evidence/event_001.jpg"
    }
  ]
}
```

The frontend never reads this file directly. It reads the joined results below.

### 6.2 Results: `GET /api/sessions/{id}/results`

```json
{
  "session_id": "cooking_001",
  "video_url": "/api/sessions/cooking_001/video",
  "timeline": [
    {
      "event_id": "event_001",
      "timestamp": 9.5,
      "timestamp_start": 8.0,
      "timestamp_end": 11.5,
      "ingredient": "chicken bouillon",
      "quantity": 1,
      "unit": "cube",
      "evidence_url": "/api/sessions/cooking_001/evidence/event_001.jpg",
      "sodium_mg": 2080.0,
      "status": "ok",
      "product_name": "Knorr Chicken Flavor Bouillon Cube (24 ct, US)",
      "cumulative_mg": 2080.0
    }
  ],
  "total_sodium_mg": 5163.3,
  "daily_limit_mg": 2300,
  "percent_of_daily_limit": 224.5,
  "is_incomplete": true,
  "warnings": ["'oyster sauce' isn't in the pantry, so the real total is higher."]
}
```

Field rules:

| Field | Can be null | Frontend behaviour |
|---|---|---|
| `video_url` | Yes (demo sessions) | Show a placeholder instead of the player; disable seeking |
| `evidence_url` | Yes | Show a neutral placeholder tile with the ingredient name |
| `sodium_mg` | Yes | Show "Not counted", **never 0 mg** |
| `product_name` | Yes | Show the detected `ingredient` instead |
| `status` | No | `ok`, `unrecognised_ingredient`, `unsupported_unit`, `not_confirmed` |
| `timeline` | Never null, may be empty | Empty: "No measurable additions detected" |

Status badge text:

| `status` | Badge |
|---|---|
| `ok` | none |
| `unrecognised_ingredient` | "Not in your pantry" |
| `unsupported_unit` | "Can't convert this unit" |
| `not_confirmed` | "Unconfirmed" |

`timeline` is already sorted by `timestamp`. `cumulative_mg` is the running total after that row (rows with null sodium add 0 to the running total but stay visible).

The total is for the **whole dish**, not per person. Label it "in this dish".

### 6.3 Pantry: `GET/PUT /api/pantry`

```json
{
  "version": 1,
  "unit_aliases": { "tbsp": "tablespoon", "tsp": "teaspoon", "cubes": "cube" },
  "volume_ml": { "teaspoon": 4.929, "tablespoon": 14.787, "cup": 236.6, "ml": 1 },
  "categories": [
    {
      "category_id": "soy_sauce",
      "display_name": "Soy sauce",
      "aliases": ["soy sauce", "soya sauce", "shoyu", "nuoc tuong", "salsa de soya"],
      "default_product_id": "kikkoman_soy"
    }
  ],
  "products": [
    {
      "product_id": "kikkoman_soy",
      "category_id": "soy_sauce",
      "brand": "Kikkoman",
      "name": "Soy Sauce",
      "sodium_mg_per_unit": { "tablespoon": 960 },
      "source": "Kikkoman USA label: 960 mg per 1 Tbsp (15 mL)"
    }
  ]
}
```

How the engine uses it: Jace's `ingredient` string is matched to a category through `aliases` (case and accent insensitive, so "Nước mắm" matches "nuoc mam"). The category's `default_product_id` picks the product. The event's `unit` is normalised through `unit_aliases`, then sodium = quantity × `sodium_mg_per_unit[unit]`. Volume units convert through `volume_ml`, so a product listed per tablespoon also works for teaspoons and cups.

**Adding a product from the UI:** the user enters a label serving, for example "1/4 teaspoon = 170 mg". Store `sodium_mg_per_unit[unit] = mg / quantity`, so `{"teaspoon": 680}`. Always `PUT` the whole pantry.

### 6.4 Default pantry values

| Category | Product | Sodium | Source |
|---|---|---|---|
| Salt | Table salt | 2,325 mg per tsp | Approximate (about 6 g per tsp); check label |
| Soy sauce | Kikkoman Soy Sauce | 960 mg per Tbsp | Kikkoman USA label |
| Fish sauce | Red Boat 40°N | 1,430 mg per Tbsp | US retail label |
| Chicken bouillon | Knorr Chicken Flavor Cube (24 ct, US) | 2,080 mg per cube | Label: 1,040 mg per half cube |
| Sazón | Goya Coriander & Annatto | 850 mg per packet, 680 mg per tsp | Label: 170 mg per 1/4 tsp; packet value derived |

Label values vary between label versions and countries. Show `source` in the pantry UI.

### 6.5 Mock dish (what the demo session returns)

| Time | Ingredient | Quantity | Sodium | Status |
|---|---|---|---|---|
| 0:09 | chicken bouillon | 1 cube | 2,080 mg | ok |
| 0:25 | sazon | 1 packet | 850 mg | ok |
| 0:42 | soy sauce | 1 tablespoon | 960 mg | ok |
| 1:04 | fish sauce | 2 teaspoon | 953.3 mg | ok |
| 1:29 | soy sauce | 1 teaspoon | 320 mg | ok |
| 1:45 | oyster sauce | 1 tablespoon | not counted | not in pantry, no image |

Total 5,163.3 mg, 224.5% of 2,300 mg, incomplete.

---

## 7. Frontend stack

| Choice | Pick |
|---|---|
| Framework | Next.js (App Router), TypeScript, created with `create-next-app` in `web/` |
| Styling | Tailwind CSS |
| Components | shadcn/ui: button, card, input, label, select, dialog, table, badge, progress, tabs, sonner, chart, skeleton |
| Chart | shadcn `chart` (Recharts). Chart components must be client components (`"use client"`) |
| Data fetching | Plain `fetch` in client components, through one file `lib/api.ts` |
| State | Current `session_id` in the URL (`/results/[sessionId]`). No global store needed |
| Language | English UI, British spelling |

No database, no auth, no new backend endpoints without updating section 5.

### Frontend env

```
# web/.env.local
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

---

## 8. Frontend folder structure

```
web/
  app/
    page.tsx                         # landing
    how-to-record/page.tsx           # recording instructions
    pantry/page.tsx                  # view, edit, add pantry items
    pantry/receipt/page.tsx          # mocked receipt scan
    upload/page.tsx                  # upload video
    processing/page.tsx              # waits for POST /api/sessions
    results/[sessionId]/page.tsx     # timeline and totals
  components/
    landing/  pantry/  upload/  results/
    ui/                              # shadcn
  lib/
    api.ts                           # every backend call lives here
    types.ts                         # TypeScript mirrors of section 6
    format.ts                        # mm:ss, mg formatting
  public/
    demo/receipt.jpg                 # optional
  data/
    receipt.mock.json                # section 9.4
```

---

## 9. Screens

### 9.1 Landing `/`

- Hero: headline, one-line value proposition, primary button "Start cooking" → `/how-to-record`, secondary "Set up your pantry" → `/pantry`.
- How it works: 3 steps (Set up pantry → Record while you cook → See where the salt came from).
- Who it's for: home cooks managing blood pressure; dishes like phở, arroz con pollo, sopa.
- Footer disclaimer: "Estimates only, not medical advice."
- Small link "Try a demo" → calls `POST /api/sessions/demo` → `/results/{id}`.

### 9.2 How to record `/how-to-record`

Numbered steps with simple icons:
1. Mount the camera on your head (or overhead), pointing at the pot.
2. Make sure your seasonings and measuring spoons are in view.
3. Measure seasonings with spoons or add whole cubes and packets; unmeasured pours aren't counted.
4. Stop recording, move the video to this laptop.
5. Button "Upload my video" → `/upload`.

### 9.3 Pantry `/pantry`

- `GET /api/pantry` on load; skeleton while loading.
- Cards grouped by category: product brand and name, sodium per unit ("960 mg per tablespoon"), source in small text, "Default" badge on the category's default product.
- Actions per product: Edit, Set as default, Delete (not allowed for the current default).
- "Add item" dialog: category select (or new category with name and aliases), brand, name, serving quantity, serving unit (teaspoon, tablespoon, cup, ml, g, cube, packet, piece), sodium mg per serving. Validation: quantity > 0, mg > 0, brand and name required. Saves with `PUT /api/pantry`.
- Buttons: "Scan a receipt" → `/pantry/receipt`, "Reset to defaults" (`POST /api/pantry/reset`, confirm first), "Continue" → `/how-to-record`.
- Toast on save success and failure.

### 9.4 Receipt (mocked) `/pantry/receipt`

- File input `accept="image/*"` with preview.
- After choosing a photo: fake "Reading receipt..." progress for 1.5 seconds.
- Then a table from `data/receipt.mock.json` with checkboxes:

```json
{
  "store": "H Mart",
  "items": [
    { "item_code": "RB-40N-250", "item": "RED BOAT FISH SAUCE 250ML", "category_id": "fish_sauce", "product_id": "redboat_40n", "sodium_text": "1,430 mg per Tbsp" },
    { "item_code": "KIK-SOY-10", "item": "KIKKOMAN SOY SAUCE 10OZ", "category_id": "soy_sauce", "product_id": "kikkoman_soy", "sodium_text": "960 mg per Tbsp" },
    { "item_code": "KNR-CHK-24", "item": "KNORR CHKN BOUIL CUBE 24CT", "category_id": "chicken_bouillon", "product_id": "knorr_chicken_cube", "sodium_text": "2,080 mg per cube" },
    { "item_code": "GOYA-SAZ-08", "item": "GOYA SAZON CILANTRO ACHIOTE", "category_id": "sazon", "product_id": "goya_sazon_coriander_annatto", "sodium_text": "850 mg per packet" }
  ]
}
```

- "Add to pantry": for each ticked row, if `product_id` already exists, show "Already in pantry"; otherwise add it. Then back to `/pantry`.
- Label the screen "Demo: receipt scanning is simulated". The real version will use Grosplit's receipt reader later.

### 9.5 Upload `/upload`

- Drop zone and file picker, `accept="video/*"`. Show file name, size and a `<video>` preview from `URL.createObjectURL`.
- Reject non-video files before upload with a clear message.
- "Analyse" → navigate to `/processing` while uploading. Keep the `File` in memory (React context or a module-level variable) so the processing page can send it.
- Link "No video? Try the demo" → demo session.

### 9.6 Processing `/processing`

- Sends `POST /api/sessions` with `FormData` (`video` field).
- Shows 4 steps ticking through: Extracting frames → Detecting seasonings → Matching your pantry → Calculating sodium. Each step shows for at least 0.8 seconds, so the screen is readable even when the mock is instant.
- On success: `router.replace("/results/" + session_id)`.
- On failure: error message, "Try again" and "Back to upload" buttons. Never a blank screen.
- If the page is opened with no file in memory: redirect to `/upload`.

### 9.7 Results `/results/[sessionId]`

Fetch `GET /api/sessions/{id}/results`. Layout top to bottom:

1. **Total card:** big number "5,163 mg in this dish", "224% of the 2,300 mg daily limit", progress bar coloured green under 50%, amber 50 to 99%, red 100% and over (cap the bar at 100% width; show the real % in text).
2. **Incomplete notice** (when `is_incomplete`): list `warnings`. Copy: "Some additions couldn't be counted, so the real total is higher."
3. **Video player** (when `video_url` is not null): `<video controls src={API_BASE + video_url}>`, with a ref.
4. **Ingredient timeline** (the core feature):
    - A horizontal track from 0 to the video duration (from the video's `loadedmetadata`; with no video, use the last `timestamp` + 10 seconds) with a marker per event at `timestamp`. Marker size or colour by `sodium_mg`; flagged events use a hollow marker.
    - Below it, a list of event cards in time order: time (mm:ss), evidence image (`API_BASE + evidence_url`, placeholder when null), ingredient (and `product_name`), quantity and unit as detected, sodium mg or "Not counted", status badge.
    - Clicking a marker or a card: select it, highlight it, and set `video.currentTime = row.timestamp` then `video.play()`. Keyboard accessible (cards are buttons).
5. **Cumulative sodium chart:** step-style area chart of `cumulative_mg` against `timestamp`, dots at each event, a reference line at 2,300 mg labelled "Daily limit", tooltip with ingredient and mg.
6. **Biggest contributor and a swap** (stretch): group `ok` rows by ingredient, show the largest; one swap hint, e.g. half a bouillon cube instead of one, or Kikkoman Less Sodium (590 mg per Tbsp, 38% less).
7. Buttons: "Cook something else" → `/upload`, "Edit pantry" → `/pantry`.

Error states: 404 → "We couldn't find that session"; network error → retry button.

---

## 10. Build order (4 hours)

| Time | Build | Done when (commit at each) |
|---|---|---|
| 0:00 to 0:20 | Create `web/`, Tailwind, shadcn components, `lib/types.ts`, `lib/api.ts`, `.env.local`; start backend | Home page fetches `/api/health` and shows "Backend connected" |
| 0:20 to 1:20 | **Results page** against `POST /api/sessions/demo` | Demo session shows total, warning, timeline cards with images, chart |
| 1:20 to 1:50 | Upload, processing, results flow with a real video file | Uploading any short mp4 lands on results with a playing video; clicking a card seeks it |
| 1:50 to 2:30 | Pantry screen (list, edit, add, default, reset) | Change soy sauce to 590 mg/Tbsp, reopen results, total drops to about 4,670 mg |
| 2:30 to 2:50 | Mocked receipt screen | Ticked rows add to pantry |
| 2:50 to 3:20 | Landing (pick one of 3 generated variants) and how-to-record | Full path landing → results works |
| 3:20 to 3:40 | Stretch: biggest contributor and swap | Shows on results |
| 3:40 to 4:00 | Polish, rehearse the demo, record a backup screen video | Demo runs twice in a row with no errors |

The results page is built first on purpose: it is the demo, and the demo session makes it buildable without uploads.

**Cut first if behind:** landing variants (ship one), receipt screen (show pantry only), swap card, chart (keep timeline cards). **Never cut:** total versus 2,300 mg, the clickable timeline, the incomplete warning.

---

## 11. Kiro prompts (paste one at a time)

Prompt 1, setup:
> Read KIRO_HANDOFF.md. Create a Next.js App Router TypeScript app in `web/` with Tailwind. Initialise shadcn/ui and add: button, card, input, label, select, dialog, table, badge, progress, tabs, sonner, chart, skeleton. Create `lib/types.ts` mirroring section 6.2 and 6.3 exactly, `lib/api.ts` with one typed function per endpoint in section 5 using `NEXT_PUBLIC_API_BASE`, and `lib/format.ts` (seconds to m:ss, mg with thousands separators). Make `/` temporarily call `getHealth()` and show "Backend connected" or an error. Don't build other pages yet.

Prompt 2, results page:
> Build `/results/[sessionId]` exactly as section 9.7, items 1 to 5 and the error states, using `getResults()`. Components in `components/results/`: TotalCard, IncompleteNotice, SessionVideo (forwardRef to the video element), IngredientTimeline (track plus event cards), CumulativeChart (shadcn chart, Recharts step area, ReferenceLine at daily_limit_mg). Follow the null rules in section 6.2: never show null sodium as 0. Add a temporary button on `/` that calls `createDemoSession()` and navigates to the results. Mobile-friendly, works on a laptop projector.

Prompt 3, upload and processing:
> Build `/upload` (section 9.5) and `/processing` (section 9.6). Keep the selected File in a small React context provider in `app/layout.tsx`. Processing posts the file with `createSession(file)`, shows the 4 steps with a minimum 0.8 s each, then `router.replace` to the results. Handle errors with retry, and redirect to `/upload` if no file is held.

Prompt 4, pantry:
> Build `/pantry` as section 9.3 using `getPantry`, `putPantry`, `resetPantry`. Adding a product stores `sodium_mg_per_unit[unit] = mg / quantity` (section 6.3). Group by category, show the default badge and source text. Validate inputs, toast on save, confirm before reset. Always PUT the whole pantry object.

Prompt 5, receipt:
> Build `/pantry/receipt` as section 9.4 using `web/data/receipt.mock.json` (create it from the JSON in section 9.4). Image picker with preview, 1.5 s fake progress, table with checkboxes, add missing products to the pantry via PUT, then back to `/pantry`. Show a "Demo: receipt scanning is simulated" label.

Prompt 6, landing variants:
> Create three landing variants at `/landing/a`, `/landing/b`, `/landing/c` using shared components (Hero, HowItWorks, WhoItsFor, Footer) with a theme prop: (a) warm terracotta and cream, (b) clean clinical teal and white, (c) bold food-magazine with big type. Content from section 9.1. Then build `/how-to-record` from section 9.2 in the same style. Don't change any other page.

Prompt 7, after choosing a variant:
> Make `/` render landing variant [a/b/c], delete the other variants, and apply the same colours and fonts to every page through Tailwind theme tokens.

Prompt 8, stretch:
> Add item 6 of section 9.7: biggest contributor card and one swap suggestion, computed in the frontend from `timeline` rows with status ok.

---

## 12. Rules for Kiro

- Do not change anything in `src/`, `tests/` or `examples/` (Jace's Module A).
- Do not change `backend/` API shapes. If a new field is needed, add it to `backend/app.py`, update section 5 and 6 of this file, and keep `pytest` passing.
- Never send video to anything except `POST /api/sessions`.
- Never show `null` sodium as 0. Never hide flagged rows.
- All backend calls go through `lib/api.ts`. No hardcoded `localhost` elsewhere.
- Use `timestamp` (not `timestamp_start`) for seeking and marker position.
- No new dependencies beyond section 7 without asking.
- If a test fails, fix the code, never delete or weaken the test.

---

## 13. Integrating Jace's real pipeline

Only `backend/module_a_bridge.py` changes:

1. Jace's pipeline must write, for each session, `events.json` in the section 6.1 format and `evidence/<event_id>.jpg` into the `session_dir` it is given.
2. Implement `run_real(video_path, session_id, session_dir)` to call his pipeline.
3. Run with `MODULE_A_MODE=real`.

Agree with Jace today:

| Topic | Agreement |
|---|---|
| Ingredient names | Lowercase generic nouns: "soy sauce", "fish sauce", "chicken bouillon", "sazon", "salt". Not brands |
| Units | `teaspoon`, `tablespoon`, `cup`, `ml`, `g`, `cube`, `packet`, `piece` |
| Required fields | `session_id`, `event_id`, `timestamp_start`, `timestamp_end`, `timestamp`, `ingredient`, `quantity`, `unit`, `addition_confirmed`, `evidence_frame` |
| His Pydantic model | Currently lacks `session_id`, `timestamp`, `evidence_frame`; he must add them or they are dropped |
| Processing time | How long for a 2-minute video? If over about 60 s, the processing screen needs honest copy ("This can take a minute or two") |

Test the handover with one real `events.json` from Jace as soon as he has one: put it in a session folder by hand and open `/results/<id>`.

---

## 14. Demo plan

1. Start backend (`uvicorn`, mock or real) and frontend (`npm run dev`) on the demo laptop. Open `http://localhost:3000`.
2. Landing → Pantry (show Kikkoman and Knorr with sources) → How to record → Upload a pre-recorded 1 to 2 minute overhead or head-mounted clip.
3. Processing → Results: read out the total, click two timeline cards to show the video jumping and the evidence photo, point at the flagged oyster sauce ("we don't guess").
4. Edit soy sauce to Kikkoman Less Sodium in the pantry, reopen results, show the total drop.

Backups: the "Try a demo" session (no upload needed) and a screen recording of a full run.

---

## 15. Risks and fallbacks

| Risk | Fallback |
|---|---|
| Jace's pipeline not ready | `MODULE_A_MODE=mock`; demo is identical apart from placeholder images |
| Real processing is slow | Pre-process the demo video before presenting; open its results URL directly |
| CORS error in the browser | Check `CORS_ORIGINS` matches the frontend URL exactly |
| Video won't seek | Use `/api/sessions/{id}/video` (supports range requests); test seeking before the demo |
| Large video upload | Keep demo clips short (under 2 minutes); upload is local so size limits are not an issue |
| Wrong ingredient name from Jace | Add the name as an alias in the pantry category; no code change |
| Venue Wi-Fi down | Everything runs on localhost; only Jace's GPT call needs internet, so pre-process |

---

## 16. Open questions

- What is Grosplit's output format, and can it replace the mocked receipt step after the hackathon?
- Final app name and brand colours (decide from the landing variants).
- Does the team want per-serving numbers? Currently out of scope (team README).
