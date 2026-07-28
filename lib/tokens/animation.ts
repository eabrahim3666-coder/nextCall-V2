export const animation = {
  duration: {
    fast: "150ms",
    normal: "250ms",
    slow: "400ms",
    xslow: "600ms",
  },
  easing: {
    smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    linear: "linear",
  },
  keyframes: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    fadeUp: {
      from: { opacity: 0, transform: "translateY(12px)" },
      to: { opacity: 1, transform: "translateY(0)" },
    },
    scaleIn: {
      from: { opacity: 0, transform: "scale(0.95)" },
      to: { opacity: 1, transform: "scale(1)" },
    },
    slideUp: {
      from: { transform: "translateY(100%)" },
      to: { transform: "translateY(0)" },
    },
  },
} as const;

export type AnimationToken = typeof animation;
