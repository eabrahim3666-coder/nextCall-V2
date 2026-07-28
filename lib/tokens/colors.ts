export const colors = {
  bg: {
    primary: "#FFFFFF",
    secondary: "#FAFBFD",
    card: "#FFFFFF",
    muted: "#F8FAFC",
    overlay: "rgba(15, 23, 42, 0.5)",
    tooltip: "#1E293B",
  },
  text: {
    primary: "#111827",
    secondary: "#64748B",
    muted: "#94A3B8",
    inverse: "#FFFFFF",
  },
  border: {
    primary: "rgba(15,23,42,.08)",
    hover: "rgba(79,70,229,.25)",
    accent: "rgba(79,70,229,.3)",
  },
  accent: {
    primary: "#4F46E5",
    "primary-hover": "#4338CA",
    "primary-pressed": "#3730A3",
    secondary: "#7C3AED",
    highlight: "#06B6D4",
  },
  state: {
    success: "#10B981",
    "success-bg": "rgba(16,185,129,0.1)",
    warning: "#F59E0B",
    "warning-bg": "rgba(245,158,11,0.1)",
    danger: "#EF4444",
    "danger-bg": "rgba(239,68,68,0.1)",
    info: "#3B82F6",
    "info-bg": "rgba(59,130,246,0.1)",
  },
  gradient: {
    start: "#4F46E5",
    mid: "#7C3AED",
    end: "#06B6D4",
  },
} as const;

export type ColorToken = typeof colors;
