import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Na(h) buttons (style guide §09): 48px tall, 12px radius, 16/600, 2px ink
// border on interactive variants. Hover lifts 2px and darkens; focus shows a
// 2px ink ring offset from the control. Motion honours reduced-motion via the
// token-driven duration in globals.css.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-control border-2 bg-clip-padding font-ui text-base font-semibold whitespace-nowrap transition-all outline-none select-none [transition-duration:var(--duration-hover)] focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:border-stone disabled:bg-canvas disabled:text-ink-soft disabled:opacity-70 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        // Primary action — lavender fill, ink border.
        default:
          "border-ink bg-lavender text-ink hover:-translate-y-0.5 hover:bg-lavender-hover",
        // Secondary — paper fill, ink border.
        outline:
          "border-ink bg-paper text-ink hover:-translate-y-0.5 hover:bg-canvas aria-expanded:bg-canvas",
        secondary:
          "border-ink bg-paper text-ink hover:-translate-y-0.5 hover:bg-canvas aria-expanded:bg-canvas",
        // Ghost — borderless, stone wash on hover.
        ghost:
          "border-transparent text-ink hover:bg-stone aria-expanded:bg-stone",
        // Destructive — chilli outline, used for over-limit / delete.
        destructive:
          "border-chilli bg-paper text-chilli hover:-translate-y-0.5 hover:bg-chilli/10 focus-visible:ring-chilli",
        // Ghost link — underline on hover, no border or fill.
        link: "h-auto rounded-none border-transparent px-0 py-1 text-ink underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6",
        xs: "h-8 gap-1 rounded-[10px] px-3 text-sm [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-10 gap-1.5 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-14 px-8 text-lg",
        icon: "size-12 px-0",
        "icon-xs": "size-8 rounded-[10px] px-0 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-10 px-0",
        "icon-lg": "size-14 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  render,
  nativeButton,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  // When a custom element is rendered (e.g. a Next.js <Link> that outputs an
  // <a>), tell Base UI it is not a native <button> so it keeps the right
  // semantics and doesn't warn. Explicit nativeButton always wins.
  const resolvedNativeButton =
    nativeButton ?? (render === undefined ? undefined : false)

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      render={render}
      nativeButton={resolvedNativeButton}
      {...props}
    />
  )
}

export { Button, buttonVariants }
