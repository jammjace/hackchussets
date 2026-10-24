---
inclusion: always
---

# Tech

- Frontend: Next.js App Router, TypeScript, Tailwind, shadcn/ui, shadcn chart (Recharts), in `web/`.
- Backend: FastAPI in `backend/` on `http://localhost:8000`. Already built and tested. Run `cd backend && uvicorn app:app --reload --port 8000`.
- Everything runs locally on one laptop. Do not deploy the backend to Vercel.
- Frontend reads the API base from `NEXT_PUBLIC_API_BASE`. All backend calls go through `web/lib/api.ts`.
- API URLs in responses are relative; prefix with the API base.

# Hard rules

- Do not edit `src/`, `tests/` or `examples/` (Module A, owned by Jace).
- Do not change backend response shapes without updating KIRO_HANDOFF.md sections 5 and 6 and keeping `pytest` green in `backend/`.
- Never display `sodium_mg: null` as 0. Never hide flagged timeline rows.
- Seek and position markers with `timestamp`, not `timestamp_start`.
- Only `POST /api/sessions` receives video.
- No new dependencies without asking.
- Never delete or weaken a failing test; fix the code.
