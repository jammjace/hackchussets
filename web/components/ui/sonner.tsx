"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          // Na(h) Toast (§09): paper fill, 2px ink border, pill radius, float shadow.
          "--normal-bg": "var(--paper)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--ink)",
          "--border-radius": "999px",
          "--border": "2px",
          "--success-bg": "var(--paper)",
          "--success-text": "var(--ink)",
          "--success-border": "var(--ink)",
        } as React.CSSProperties
      }
      toastOptions={{
        style: {
          border: "2px solid var(--ink)",
          boxShadow: "var(--shadow-float)",
          fontFamily: "var(--font-ui)",
        },
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
