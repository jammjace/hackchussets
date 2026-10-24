# Na(h) — frontend (`web/`)

The web app for Na(h), a sodium tracker for home cooks managing high blood
pressure. You cook on camera, upload the clip, and Na(h) shows an interactive
cooking journey: every seasoning added, when, how much, its sodium, and the
dish total against the 2,300 mg daily limit.

Owner: Vansh (Module C frontend). This is the frontend only; the FastAPI
backend lives in `../backend`. Full product spec and the API contract are in
`../KIRO_HANDOFF.md`.

Hackathon demo. Estimates only, not medical advice. English UI, British
spelling.

## Stack

- Next.js (App Router) + TypeScript, Turbopack
- Tailwind CSS v4 + shadcn/ui (Base UI primitives), shadcn chart (Recharts)
- Fonts via `next/font/google`: Instrument Serif (display), Figtree (UI/body),
  JetBrains Mono (timestamps)
- `lucide-react` for icons, `sonner` for toasts

No database, no auth. All state the UI needs is either fetched per page or kept
in the URL (`/results/[sessionId]`).

## Running it

You need both the backend and the frontend up.

**Backend** (from `../backend`, serves `http://localhost:8000`):

```bash
cd ../backend
uvicorn app:app --reload --port 8000
# Windows, using the committed venv:
#   .\.venv\Scripts\uvicorn.exe app:app --reload --port 8000
```

Check it: `http://localhost:8000/api/health` → `{"status":"ok"}`.

**Frontend** (from `web/`):

```bash
npm install
npm run dev     # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

### Environment

`web/.env.local`:

```
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

The API returns relative URLs; `lib/api.ts` prefixes them with this base.

## Screens

| Route | What it does |
|---|---|
| `/` | Landing: Nav Pill, hero (headline + hero art slot + CTAs), how it works, who it's for, disclaimer. "Try a demo" starts a mock session. |
| `/how-to-record` | Recording instructions as a Step List, plus a "What counts" card. |
| `/pantry` | View, edit, add pantry items; set default; reset to defaults. |
| `/pantry/receipt` | Mocked receipt scan that adds products to the pantry. |
| `/upload` | Drop zone / file picker for the cooking video. |
| `/processing` | Posts the video to `POST /api/sessions`, shows the step ticker, then redirects to results. |
| `/results/[sessionId]` | The core screen — see below. |

### Results page

Fetches `GET /api/sessions/{id}/results` and renders, in order:

1. **Video player** (seekable; a placeholder when the session has no video).
2. **Cooking journey** (`CookingJourney`) — a vertical spine with a playhead
   that travels down as the cook plays, popping each addition left/right with
   its evidence photo, amount and sodium. The playhead follows the video's
   `currentTime` when a video exists, or self-drives for demo sessions. Click a
   card to seek the video to that moment.
3. **Total card** (`TotalCard`) — the dish total as a serif number that counts
   up, with the Sodium Meter against 2,300 mg.
4. **Incomplete notice** when additions couldn't be counted.
5. **Cumulative chart** of sodium over time, with a daily-limit reference line.
6. **Suggestions** — biggest contributor and one easy swap, both computed from
   the `ok` timeline rows (never hard-coded).

The intro plays as a sequence: journey → total count-up → the rest fades in.
All of it respects `prefers-reduced-motion` (final state shown at once).

## Project structure

```
web/
  app/
    layout.tsx                 # fonts, Toaster, video-file provider
    globals.css                # Na(h) design tokens + Tailwind v4 @theme
    page.tsx                   # landing
    how-to-record/  pantry/  pantry/receipt/  upload/  processing/
    results/[sessionId]/       # results page + ResultsView
  components/
    brand/NahWordmark.tsx      # the Na(h) element-tile logo
    landing/                   # NavPill, HeroArt, HowItWorks, WhoItsFor, footer
    results/                   # CookingJourney, TotalCard, CumulativeChart,
                               #   Suggestions, IncompleteNotice, SessionVideo,
                               #   Reveal, status helpers
    pantry/  upload/           # feature components
    ui/                        # shadcn components, restyled to Na(h)
  lib/
    api.ts                     # every backend call (typed, one per endpoint)
    types.ts                   # mirrors of the API contract (handoff §6)
    format.ts                  # m:ss, mg with separators, percent
    use-reveal.ts              # reveal/journey/count-up/reduced-motion hooks
  data/receipt.mock.json       # mocked receipt rows
```

## Design system

The Na(h) kitchen-editorial system from `../design/style-guide` is implemented
in `app/globals.css`: the tokens (`tokens/*.css`) are exposed as CSS variables
and mapped into Tailwind v4 via `@theme` (colours `canvas/paper/stone/ink/
lavender/forest/sage/saffron/chilli`, radii, fonts, motion durations and
easings). The shadcn semantic variables are remapped onto this palette so the
`ui/` components inherit the look.

Rules baked into the UI:

- **Chilli is only for a dish total at or above 2,300 mg.** A single addition
  stays ink. The over-limit meter rescales and hatches the excess.
- **Null sodium is never shown as 0** — it reads "Not counted" (saffron badge).
- **Flagged rows are never hidden.**
- Seeking and the journey playhead use each event's `timestamp`.
- Instrument Serif display text is never bold (weight 400).

## Conventions

- All backend calls go through `lib/api.ts`; no hardcoded `localhost` elsewhere.
- Video is only ever sent to `POST /api/sessions`.
- Don't change backend response shapes without updating `../KIRO_HANDOFF.md`
  (§5, §6) and keeping `pytest` green in `../backend`.
- No new dependencies without discussion.
