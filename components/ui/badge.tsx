import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1",
    "overflow-hidden rounded-full border px-2 py-0.5",
    "text-ds-caption font-medium whitespace-nowrap",
    "transition-all duration-150",
    "focus-visible:ring-2 focus-visible:ring-ds-accent-primary focus-visible:ring-offset-2",
    "has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
    "aria-invalid:border-ds-state-danger",
    "[&>svg]:pointer-events-none [&>svg]:size-3!",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-ds-accent-primary text-ds-text-inverse border-ds-accent-primary",
        secondary:
          "bg-ds-bg-muted text-ds-text-secondary border-ds-border-primary",
        success:
          "bg-ds-state-success/10 text-ds-state-success border-ds-state-success/20",
        warning:
          "bg-ds-state-warning/10 text-ds-state-warning border-ds-state-warning/20",
        danger:
          "bg-ds-state-danger/10 text-ds-state-danger border-ds-state-danger/20",
        outline:
          "bg-transparent text-ds-text-primary border-ds-border-primary",
        ghost:
          "bg-transparent text-ds-text-secondary border-transparent hover:bg-ds-bg-muted",
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
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
