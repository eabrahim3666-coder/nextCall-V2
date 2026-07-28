export const shadows = {
  sm: "0 1px 2px rgba(15,23,42,0.04)",
  md: "0 4px 12px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
  lg: "0 8px 24px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04)",
  xl: "0 16px 48px rgba(15,23,42,0.10), 0 4px 8px rgba(15,23,42,0.04)",
  glow: {
    primary: "0 0 20px -5px rgba(79,70,229,0.3)",
    secondary: "0 0 20px -5px rgba(124,58,237,0.3)",
  },
} as const;

export type ShadowToken = typeof shadows;
