import type { TimelineStatus } from "@/lib/types";

/**
 * Badge text per status (KIRO_HANDOFF.md section 6.2). `ok` shows no badge.
 */
export function statusBadge(status: TimelineStatus): string | null {
  switch (status) {
    case "ok":
      return null;
    case "unrecognised_ingredient":
      return "Not in your pantry";
    case "unsupported_unit":
      return "Can't convert this unit";
    case "not_confirmed":
      return "Unconfirmed";
    default:
      return null;
  }
}

/** A flagged row is any non-ok row: it uses a hollow marker and a badge. */
export function isFlagged(status: TimelineStatus): boolean {
  return status !== "ok";
}
