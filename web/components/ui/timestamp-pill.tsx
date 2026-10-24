import * as React from "react"
import { cn } from "cn"

/**
 * Timestamp Pill (Na(h) style guide §09 / §03).
 * JetBrains Mono 500 / 13px, stone fill, pill radius. Used for video times;
 * click to seek. Render as a <button> by passing `asButton` when it is
 * interactive so it stays keyboard accessible.
 *
 * Presentational only — no data fetching or logic.
 */
function TimestampPill({
  className,
  children,
  icon,
  ...props
}: React.ComponentProps<"span"> & { icon?: React.ReactNode }) {
  return (
    <span
      data-slot="timestamp-pill"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill bg-stone px-2.5 py-1.5 font-timestamp text-[13px] leading-none font-medium tabular-nums text-ink",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  )
}

export { TimestampPill }
