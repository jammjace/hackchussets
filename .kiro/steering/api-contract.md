---
inclusion: always
---

# API contract (summary; full version in KIRO_HANDOFF.md sections 5 and 6)

| Method and path | Purpose |
|---|---|
| `GET /api/health` | `{"status":"ok"}` |
| `GET /api/pantry` / `PUT /api/pantry` / `POST /api/pantry/reset` | Read, save whole pantry, restore defaults |
| `POST /api/sessions` (multipart field `video`) | `{"session_id"}`; waits for Module A |
| `POST /api/sessions/demo` | Mock session with no video |
| `GET /api/sessions/{id}/results` | Joined timeline (below) |
| `GET /api/sessions/{id}/evidence/{event_id}.jpg` | Evidence JPEG |
| `GET /api/sessions/{id}/video` | Original video, seekable |

```ts
type TimelineRow = {
  event_id: string;
  timestamp: number;          // seconds; use for seeking
  timestamp_start: number;
  timestamp_end: number;
  ingredient: string;
  quantity: number | null;      // null = confirmed addition, full amount unknown
  unit: string;
  estimate_complete: boolean;
  known_estimated_subtotal_tbsp: number | null;
  evidence_url: string | null;   // relative
  sodium_mg: number | null;      // null = not counted, never show 0
  status: "ok" | "unrecognised_ingredient" | "unsupported_unit" | "not_confirmed" | "incomplete_quantity";
  product_name: string | null;
  cumulative_mg: number;
};

type Results = {
  session_id: string;
  video_url: string | null;      // relative
  timeline: TimelineRow[];       // sorted by timestamp
  total_sodium_mg: number;       // whole dish
  daily_limit_mg: number;        // 2300
  percent_of_daily_limit: number;
  is_incomplete: boolean;
  warnings: string[];
};
```

Mock demo session totals 5163.3 mg (224.5%), with oyster sauce flagged as not in the pantry.

For `incomplete_quantity`, never coerce the quantity to zero. If
`known_estimated_subtotal_tbsp` is present, the backend may include that known
subtotal in sodium calculations and marks the result as a lower bound.
