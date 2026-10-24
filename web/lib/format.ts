// Formatting helpers for the sodium tracker UI. British spelling.

/**
 * Format a number of seconds as m:ss (e.g. 9.5 => "0:09", 104 => "1:44").
 * Negative or non-finite input is treated as 0.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    seconds = 0;
  }
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format a sodium value in milligrams with thousands separators (e.g. 5163.3 => "5,163 mg").
 * Rounds to the nearest whole milligram. Returns "Not counted" for null/undefined,
 * never "0 mg" for a null value (see KIRO_HANDOFF.md section 6.2).
 */
export function formatMg(mg: number | null | undefined): string {
  if (mg === null || mg === undefined || !Number.isFinite(mg)) {
    return "Not counted";
  }
  return `${formatNumber(Math.round(mg))} mg`;
}

/**
 * Format an integer-ish number with thousands separators using British grouping
 * (e.g. 5163 => "5,163"). Rounds to the nearest whole number.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return Math.round(value).toLocaleString("en-GB");
}

/**
 * Format a percentage for display (e.g. 224.5 => "224%" or "225%").
 * Rounds to the nearest whole percent.
 */
export function formatPercent(percent: number): string {
  if (!Number.isFinite(percent)) {
    return "0%";
  }
  return `${Math.round(percent)}%`;
}
