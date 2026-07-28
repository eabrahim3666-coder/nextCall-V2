"use client"

/**
 * Product Stage
 *
 * Placeholder for the frame-sequence animation.
 * This component reserves the exact area where the 194-frame image sequence
 * will render in a future module. Currently shows a subtle placeholder.
 *
 * Props:
 *   className - for external positioning/layout control
 */

function ProductStage({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="Product animation"
      className={
        className
          ? className
          : "relative mx-auto aspect-[16/9] w-full max-w-5xl overflow-hidden rounded-2xl bg-ds-bg-muted/50"
      }
    >
      {/* Subtle inner glow so the area reads as intentional */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-ds-border-primary/50" />
    </div>
  )
}

export { ProductStage }
