import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-xl border bg-ds-bg-card transition-all duration-250",
  {
    variants: {
      variant: {
        default: "border-ds-border-primary shadow-ds-sm",
        elevated: "border-ds-border-primary shadow-ds-md",
        glass: "border-ds-border-primary bg-ds-bg-card/80 backdrop-blur-xl shadow-ds-sm",
        outline: "border-ds-border-primary bg-transparent",
        ghost: "border-transparent bg-transparent",
        interactive:
          "border-ds-border-primary shadow-ds-sm hover:shadow-ds-md hover:border-ds-border-hover cursor-pointer",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Card({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-ds-2 px-ds-6 pt-ds-6", className)}
      {...props}
    />
  )
}

function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-body"
      className={cn("px-ds-6 py-ds-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-ds-4 px-ds-6 pb-ds-6 pt-ds-0",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        "text-ds-card-title text-ds-text-primary",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn(
        "text-ds-small-body text-ds-text-secondary",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardTitle,
  CardDescription,
  cardVariants,
}
