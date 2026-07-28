import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        [
          "h-9 w-full min-w-0 rounded-lg",
          "border border-ds-border-primary bg-transparent",
          "px-3 py-1.5 text-ds-small-body text-ds-text-primary",
          "transition-all duration-150 outline-none",
          "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ds-text-primary",
          "placeholder:text-ds-text-muted",
          "focus-visible:border-ds-accent-primary focus-visible:ring-2 focus-visible:ring-ds-accent-primary/20",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-ds-bg-muted disabled:opacity-50",
          "aria-invalid:border-ds-state-danger aria-invalid:ring-2 aria-invalid:ring-ds-state-danger/20",
        ].join(" "),
        className
      )}
      {...props}
    />
  )
}

export { Input }
