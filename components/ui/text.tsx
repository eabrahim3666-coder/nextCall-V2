import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const textVariants = cva("", {
  variants: {
    variant: {
      hero: "text-ds-hero",
      "section-heading": "text-ds-section-heading",
      "large-heading": "text-ds-large-heading",
      "card-title": "text-ds-card-title",
      body: "text-ds-body text-ds-text-primary",
      "small-body": "text-ds-small-body text-ds-text-secondary",
      caption: "text-ds-caption text-ds-text-muted",
      button: "text-ds-button",
      label: "text-ds-label",
      overline: "text-ds-overline uppercase tracking-[0.08em]",
    },
    color: {
      primary: "text-ds-text-primary",
      secondary: "text-ds-text-secondary",
      muted: "text-ds-text-muted",
      inverse: "text-ds-text-inverse",
      accent: "text-ds-accent-primary",
      success: "text-ds-state-success",
      warning: "text-ds-state-warning",
      danger: "text-ds-state-danger",
    },
  },
  defaultVariants: {
    variant: "body",
  },
})

type AllowedElements = "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "label"

function Text({
  className,
  variant = "body",
  color,
  as,
  ...props
}: React.ComponentPropsWithoutRef<"p"> &
  VariantProps<typeof textVariants> & {
    as?: AllowedElements
  }) {
  const Comp = as ?? "p"

  return (
    <Comp
      data-slot="text"
      data-variant={variant}
      className={cn(textVariants({ variant, color }), className)}
      {...(props as any)}
    />
  )
}

export { Text, textVariants }
