import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center",
    "rounded-lg border border-transparent",
    "text-ds-button font-medium whitespace-nowrap",
    "transition-all duration-150 outline-none select-none",
    "focus-visible:ring-2 focus-visible:ring-ds-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg-primary",
    "active:not-aria-[haspopup]:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-ds-accent-primary text-ds-text-inverse hover:bg-ds-accent-primary-hover shadow-ds-sm",
        secondary:
          "bg-ds-bg-muted text-ds-text-primary border-ds-border-primary hover:bg-ds-bg-secondary",
        outline:
          "bg-transparent text-ds-text-primary border-ds-border-primary hover:border-ds-border-hover hover:text-ds-accent-primary",
        ghost:
          "bg-transparent text-ds-text-secondary border-transparent hover:bg-ds-bg-muted hover:text-ds-text-primary",
        gradient:
          "text-ds-text-inverse border-none bg-linear-to-r from-ds-accent-primary via-ds-accent-secondary to-ds-accent-highlight shadow-ds-sm hover:shadow-ds-md hover:brightness-110",
        destructive:
          "bg-ds-state-danger/10 text-ds-state-danger border-ds-state-danger/20 hover:bg-ds-state-danger/20 hover:border-ds-state-danger/30",
        link:
          "bg-transparent text-ds-accent-primary border-transparent underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-9 gap-2 px-4",
        sm: "h-8 gap-1.5 px-3 text-xs",
        lg: "h-10 gap-2.5 px-6",
        xl: "h-12 gap-3 px-8 text-base",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
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
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
