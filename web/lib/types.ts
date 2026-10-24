// TypeScript mirrors of KIRO_HANDOFF.md sections 6.2 and 6.3.
// Keep these in sync with the backend response shapes.

// --- Section 6.2: Results (GET /api/sessions/{id}/results) ---

export type TimelineStatus =
  | "ok"
  | "unrecognised_ingredient"
  | "unsupported_unit"
  | "not_confirmed";

export type TimelineRow = {
  event_id: string;
  timestamp: number; // seconds; use for seeking and marker position
  timestamp_start: number;
  timestamp_end: number;
  ingredient: string;
  quantity: number;
  unit: string;
  evidence_url: string | null; // relative; prefix with API base. null => placeholder tile
  sodium_mg: number | null; // null => "Not counted", never show 0
  status: TimelineStatus;
  product_name: string | null; // null => show detected `ingredient`
  cumulative_mg: number; // running total after this row
};

export type Results = {
  session_id: string;
  video_url: string | null; // relative; null for demo sessions
  timeline: TimelineRow[]; // never null, may be empty; sorted by timestamp
  total_sodium_mg: number; // whole dish
  daily_limit_mg: number; // 2300
  percent_of_daily_limit: number;
  is_incomplete: boolean;
  warnings: string[];
};

// --- Section 6.3: Pantry (GET/PUT /api/pantry) ---

export type PantryCategory = {
  category_id: string;
  display_name: string;
  aliases: string[];
  default_product_id: string;
};

export type PantryProduct = {
  product_id: string;
  category_id: string;
  brand: string;
  name: string;
  sodium_mg_per_unit: Record<string, number>;
  source: string;
};

export type Pantry = {
  version: number;
  unit_aliases: Record<string, string>;
  volume_ml: Record<string, number>;
  categories: PantryCategory[];
  products: PantryProduct[];
};

// --- Shared API response shapes (section 5) ---

export type HealthResponse = {
  status: string;
};

export type SessionResponse = {
  session_id: string;
};
