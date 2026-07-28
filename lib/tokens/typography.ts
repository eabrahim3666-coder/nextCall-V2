export const typography = {
  fontFamily: {
    sans: "'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  fontSize: {
    hero: ["3.5rem", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "700" }] as const,
    "section-heading": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }] as const,
    "large-heading": ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }] as const,
    "card-title": ["1.125rem", { lineHeight: "1.4", letterSpacing: "-0.01em", fontWeight: "600" }] as const,
    body: ["1rem", { lineHeight: "1.6", letterSpacing: "0em", fontWeight: "400" }] as const,
    "small-body": ["0.875rem", { lineHeight: "1.5", letterSpacing: "0em", fontWeight: "400" }] as const,
    caption: ["0.75rem", { lineHeight: "1.5", letterSpacing: "0.01em", fontWeight: "400" }] as const,
    button: ["0.875rem", { lineHeight: "1", letterSpacing: "0.01em", fontWeight: "500" }] as const,
    label: ["0.8125rem", { lineHeight: "1", letterSpacing: "0.02em", fontWeight: "500" }] as const,
    overline: ["0.625rem", { lineHeight: "1", letterSpacing: "0.08em", fontWeight: "500" }] as const,
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;

export type TypographyToken = typeof typography;
