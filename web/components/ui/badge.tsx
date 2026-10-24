import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Na(h) badges (style guide §09): pill radius, Figtree 13/600, always an
// icon + label (colour is never the only signal). Named status variants match
// the guide: Detected (forest), Not counted (saffron), Over limit (chilli
// outline — the one over-limit colour), Estimate (stone). The generic shadcn
// variants are kept so existing screens keep working.
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-pill border-2 border-transparent px-3 py-1 font-ui text-[13px] font-semibold whitespace-nowrap transition-all [transition-duration:var(--duration-hover)] focus-visible:ring-2 focus-visible:ring-ink has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        // Default / Detected — forest fill, canvas text.
        default: "bg-forest text-canvas",
        detected: "bg-forest text-canvas",
        // Not counted — saffron fill, ink text. Never shown as 0 mg.
        notCounted: "bg-saffron text-ink",
        // Over limit — chilli outline only (the single over-limit colour).
        overLimit: "border-chilli bg-transparent text-chilli",
        // Estimate — neutral stone fill, ink text.
        estimate: "bg-stone text-ink",
        // Generic neutral chip (used for "Default", demo labels, etc.).
        secondary: "bg-stone text-ink",
        outline: "border-ink bg-paper text-ink",
        destructive: "border-chilli bg-transparent text-chilli",
        ghost: "hover:bg-stone",
        link: "text-ink underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
