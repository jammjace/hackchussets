export function clampSeekTime(timestamp: number, duration: number): number {
  if (!Number.isFinite(timestamp)) return 0;
  const safeTimestamp = Math.max(0, timestamp);
  if (!Number.isFinite(duration) || duration <= 0) return safeTimestamp;
  return Math.min(safeTimestamp, duration);
}

export function formatQuantity(
  quantity: number | null,
  unit: string | null,
  knownSubtotalTbsp: number | null,
): string {
  if (quantity !== null) {
    return unit ? `${quantity} ${unit}` : `${quantity}`;
  }
  if (knownSubtotalTbsp !== null) {
    return `At least ${knownSubtotalTbsp} tablespoon${knownSubtotalTbsp === 1 ? "" : "s"}`;
  }
  return unit ? `Unknown ${unit} quantity` : "Unknown quantity";
}
