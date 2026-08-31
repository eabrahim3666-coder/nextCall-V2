'use client';

import { motion, type Variants } from 'framer-motion';
import { Plug, BrainCircuit, Rocket } from 'lucide-react';

type Step = {
  num: string;
  icon: typeof Plug;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    num: '01',
    icon: Plug,
    title: 'Connect Your Business',
    body: 'Link your phone number, social accounts, and business details. The AI instantly knows your services, hours, and brand voice.',
  },
  {
    num: '02',
    icon: BrainCircuit,
    title: 'Train Your AI Receptionist',
    body: 'Upload FAQs, set booking rules, and customize responses. Your AI learns your business inside and out — no coding needed.',
  },
  {
    num: '03',
    icon: Rocket,
    title: 'Go Live',
    body: 'Your AI receptionist starts answering calls, booking appointments, and replying to customers 24/7. Leads roll in immediately.',
  },
];

/* ------------------------------------------------------------------ */
/*  Cinematic animation orchestration                                  */
/* ------------------------------------------------------------------ */
/*  Sequence (when section scrolls into view):                         */
/*    0.10s — header label fades + slides up                          */
/*    0.30s — heading fades + slides up                               */
/*    0.50s — subheading fades + slides up                            */
/*    0.60s — glow path begins drawing left → right (1.5s duration)   */
/*    0.70s — main wave path begins drawing (1.5s duration)           */
/*    0.75s — step 1 endpoint dot pops in (wave just reached step 1) */
/*            step 1 number fades in from top                        */
/*    0.85s — step 1 icon pops in (scale 0.5 → 1 with overshoot)      */
/*    0.95s — step 1 title slides up                                 */
/*    1.05s — step 1 body slides up                                  */
/*    1.50s — step 2 endpoint dot pops in (wave reaches step 2)       */
/*            step 2 number fades in from top                        */
/*    1.60s — step 2 icon pops in                                    */
/*    1.70s — step 2 title slides up                                 */
/*    1.80s — step 2 body slides up                                  */
/*    2.20s — step 3 endpoint dot pops in (wave reaches step 3)      */
/*            step 3 number fades in from top                        */
/*    2.30s — step 3 icon pops in                                    */
/*    2.40s — step 3 title slides up                                 */
/*    2.50s — step 3 body slides up                                  */
/*                                                                    */
/*  Mobile (no wave): cards reveal sequentially                       */
/*    step i (i=0,1,2): number at 0.4+i*0.7, icon +0.1, title +0.2,  */
/*    body +0.3                                                       */
/* ------------------------------------------------------------------ */

// Cinematic easing curves
const EASE = [0.16, 1, 0.3, 1] as const;        // expo-out: smooth deceleration
const POP_EASE = [0.34, 1.56, 0.64, 1] as const; // back-out: subtle overshoot for pop-in

// Variant factories — each returns a Variants object with the delay baked into
// the "visible" transition. Parent motion.section toggles "hidden" → "visible"
// via whileInView, which propagates to all variant children.
const fadeUp = (delay: number): Variants => ({
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE, delay },
  },
});

// Centered fade-up: keeps element horizontally centered (x: -50%) while
// sliding up. Use for absolute-positioned children that need centering.
const fadeUpCentered = (delay: number): Variants => ({
  hidden: { opacity: 0, x: '-50%', y: 30 },
  visible: {
    opacity: 1,
    x: '-50%',
    y: 0,
    transition: { duration: 0.8, ease: EASE, delay },
  },
});

// Number fades in from above (slides DOWN into place, opposite of title/body)
const fadeInFromTopCentered = (delay: number): Variants => ({
  hidden: { opacity: 0, x: '-50%', y: -20 },
  visible: {
    opacity: 1,
    x: '-50%',
    y: 0,
    transition: { duration: 0.7, ease: EASE, delay },
  },
});

// Icon pop-in: scale 0.5 → 1 with back-out overshoot
const popInCentered = (delay: number): Variants => ({
  hidden: { opacity: 0, x: '-50%', scale: 0.5 },
  visible: {
    opacity: 1,
    x: '-50%',
    scale: 1,
    transition: { duration: 0.7, ease: POP_EASE, delay },
  },
});

// Per-step base delay (desktop): wave reaches step 1 at 0.7s, step 2 at 1.5s, step 3 at 2.2s
const desktopStepDelays = [0.7, 1.5, 2.2];

export function HowItWorks() {
  return (
    <motion.section
      id="how-it-works"
      className="relative overflow-hidden py-20 sm:py-28"
      style={{ backgroundColor: "#ffffff" }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {/* soft radial wash for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, #FFFFFF 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Header — staggered fade-up */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            variants={fadeUp(0.1)}
            className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#64748B]"
          >
            <span aria-hidden className="h-px w-8 bg-[#CBD5E1]" />
            How It Works
            <span aria-hidden className="h-px w-8 bg-[#CBD5E1]" />
          </motion.div>
          <motion.h2
            variants={fadeUp(0.3)}
            className="mt-5 text-4xl font-semibold tracking-tight text-[#0F172A] sm:text-5xl md:text-6xl"
          >
            Live in 5 minutes<span className="text-[#ff4b00]">.</span>
          </motion.h2>
          <motion.p
            variants={fadeUp(0.5)}
            className="mt-4 max-w-xl text-base leading-7 text-[#475569] sm:text-lg"
          >
            Three steps. Zero technical skills required. Seriously.
          </motion.p>
        </div>

        {/* Steps with sine wave */}
        <div className="relative mt-16 sm:mt-24">
          {/* Mobile: vertical stack (no wave). gap-20 gives the 60px-tall step
              number room to sit fully above the icon without overlapping the
              previous card. Each card's elements reveal in staggered sequence. */}
          <div className="flex flex-col gap-20 md:hidden">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              // Card i (i=0,1,2) starts revealing at 0.4 + i*0.7 → 0.4s, 1.1s, 1.8s
              const baseDelay = 0.4 + i * 0.7;
              return (
                <div
                  key={step.num}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Step number — fades in from above the icon */}
                  <motion.span
                    aria-hidden
                    className="absolute left-1/2 -translate-x-1/2 text-6xl font-bold leading-none select-none whitespace-nowrap"
                    style={{
                      top: '-64px',
                      backgroundImage:
                        'linear-gradient(to bottom, #E2E8F0 0%, #EBEBEB 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: '#E2E8F0',
                      WebkitTextFillColor: 'transparent',
                    }}
                    variants={fadeInFromTopCentered(baseDelay)}
                  >
                    {step.num}
                  </motion.span>

                  {/* Icon — pop-in with overshoot; hover scale on inner div */}
                  <motion.div
                    className="relative z-10"
                    variants={popInCentered(baseDelay + 0.1)}
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-[0_10px_40px_rgba(255,75,0,0.2)] ring-1 ring-black/5 transition-transform duration-300 hover:scale-105">
                      <Icon className="h-9 w-9 text-[#ff4b00]" strokeWidth={1.8} />
                    </div>
                  </motion.div>

                  <motion.h3
                    className="mt-5 text-xl font-semibold text-[#0F172A]"
                    variants={fadeUp(baseDelay + 0.2)}
                  >
                    {step.title}
                  </motion.h3>
                  <motion.p
                    className="mt-2 max-w-xs text-sm leading-6 text-[#475569]"
                    variants={fadeUp(baseDelay + 0.3)}
                  >
                    {step.body}
                  </motion.p>
                </div>
              );
            })}
          </div>

          {/* Desktop: pixel-perfect wave traced from EPS reference file via
              Catmull-Rom spline. Wave draws itself left → right via
              stroke-dashoffset (Framer Motion's pathLength), with step
              content revealing as the wave reaches each step's x position. */}
          <div className="relative hidden md:block" style={{ height: '540px' }}>
            <svg
              className="absolute left-0 top-0 w-full"
              style={{ height: '540px', overflow: 'visible' }}
              viewBox="0 0 1000 540"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden
            >
              {/* Soft glow / ghost shadow line — draws in slightly delayed */}
              <motion.path
                transform="translate(0, 8)"
                d="M 85.10 305.00 C 87.33 305.59, 94.01 307.31, 98.47 308.84 C 102.92 310.36, 107.38 312.30, 111.84 313.93 C 116.29 315.55, 120.75 317.04, 125.20 318.45 C 129.66 319.86, 134.12 321.17, 138.57 322.42 C 143.03 323.67, 147.48 324.78, 151.94 325.86 C 156.40 326.95, 160.85 327.91, 165.31 328.80 C 169.76 329.69, 174.22 330.57, 178.68 331.36 C 183.13 332.16, 187.59 332.98, 192.04 333.61 C 196.50 334.25, 200.96 334.73, 205.41 335.21 C 209.87 335.69, 214.32 336.22, 218.78 336.49 C 223.24 336.75, 227.69 336.75, 232.15 336.81 C 236.60 336.87, 241.06 336.92, 245.52 336.81 C 249.97 336.70, 254.43 336.53, 258.88 336.16 C 263.34 335.78, 267.80 335.21, 272.25 334.57 C 276.71 333.93, 281.17 333.24, 285.62 332.32 C 290.08 331.40, 294.53 330.34, 298.99 329.13 C 303.45 327.91, 307.90 326.75, 312.36 325.01 C 316.81 323.27, 321.27 320.95, 325.73 318.66 C 330.18 316.37, 334.64 314.04, 339.09 311.33 C 343.55 308.62, 348.01 305.62, 352.46 302.41 C 356.92 299.20, 361.37 295.86, 365.83 292.18 C 370.29 288.50, 374.74 284.56, 379.20 280.36 C 383.65 276.16, 388.11 272.24, 392.57 266.99 C 397.02 261.74, 401.48 255.24, 405.93 248.81 C 410.39 242.38, 414.85 234.50, 419.30 228.32 C 423.76 222.13, 428.21 216.74, 432.67 211.67 C 437.13 206.59, 441.58 202.06, 446.04 197.90 C 450.49 193.73, 454.95 190.05, 459.41 186.68 C 463.86 183.31, 468.32 180.29, 472.77 177.72 C 477.23 175.15, 481.69 173.18, 486.14 171.31 C 490.60 169.44, 495.05 167.74, 499.51 166.51 C 503.97 165.27, 508.42 164.46, 512.88 163.93 C 517.34 163.40, 521.79 163.19, 526.25 163.29 C 530.70 163.40, 535.16 163.83, 539.62 164.57 C 544.07 165.31, 548.53 166.43, 552.98 167.78 C 557.44 169.12, 561.90 170.63, 566.35 172.60 C 570.81 174.58, 575.26 177.10, 579.72 179.66 C 584.18 182.22, 588.63 184.83, 593.09 187.97 C 597.54 191.12, 602.00 194.64, 606.46 198.54 C 610.91 202.44, 615.37 206.50, 619.82 211.34 C 624.28 216.17, 628.74 221.99, 633.19 227.63 C 637.65 233.27, 642.10 239.16, 646.56 245.25 C 651.02 251.34, 655.47 258.91, 659.93 263.94 C 664.38 268.97, 668.84 272.08, 673.30 275.18 C 677.75 278.28, 682.21 280.61, 686.66 282.59 C 691.12 284.56, 695.58 286.07, 700.03 287.09 C 704.49 288.10, 708.94 288.59, 713.40 288.69 C 717.86 288.80, 722.31 288.47, 726.77 287.72 C 731.22 286.97, 735.68 285.85, 740.14 284.18 C 744.59 282.51, 749.05 280.31, 753.51 277.74 C 757.96 275.18, 762.42 272.30, 766.87 268.78 C 771.33 265.25, 775.79 261.04, 780.24 256.61 C 784.70 252.18, 789.15 246.78, 793.61 242.18 C 798.07 237.58, 802.52 233.05, 806.98 229.04 C 811.43 225.03, 815.89 221.40, 820.35 218.15 C 824.80 214.91, 829.26 211.93, 833.71 209.53 C 838.17 207.14, 842.63 205.16, 847.08 203.78 C 851.54 202.40, 855.99 201.49, 860.45 201.23 C 864.91 200.97, 869.36 201.28, 873.82 202.19 C 878.27 203.10, 884.96 205.94, 887.19 206.69"
                stroke="#ff4b00"
                strokeWidth={6}
                strokeLinecap="round"
                style={{ filter: 'blur(6px)' }}
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.4 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  pathLength: { duration: 1.5, ease: 'easeInOut', delay: 0.6 },
                  opacity: { duration: 0.4, delay: 0.6 },
                }}
              />
              {/* Main blue wave — 60-segment Catmull-Rom spline traced from EPS */}
              <motion.path
                d="M 85.10 305.00 C 87.33 305.59, 94.01 307.31, 98.47 308.84 C 102.92 310.36, 107.38 312.30, 111.84 313.93 C 116.29 315.55, 120.75 317.04, 125.20 318.45 C 129.66 319.86, 134.12 321.17, 138.57 322.42 C 143.03 323.67, 147.48 324.78, 151.94 325.86 C 156.40 326.95, 160.85 327.91, 165.31 328.80 C 169.76 329.69, 174.22 330.57, 178.68 331.36 C 183.13 332.16, 187.59 332.98, 192.04 333.61 C 196.50 334.25, 200.96 334.73, 205.41 335.21 C 209.87 335.69, 214.32 336.22, 218.78 336.49 C 223.24 336.75, 227.69 336.75, 232.15 336.81 C 236.60 336.87, 241.06 336.92, 245.52 336.81 C 249.97 336.70, 254.43 336.53, 258.88 336.16 C 263.34 335.78, 267.80 335.21, 272.25 334.57 C 276.71 333.93, 281.17 333.24, 285.62 332.32 C 290.08 331.40, 294.53 330.34, 298.99 329.13 C 303.45 327.91, 307.90 326.75, 312.36 325.01 C 316.81 323.27, 321.27 320.95, 325.73 318.66 C 330.18 316.37, 334.64 314.04, 339.09 311.33 C 343.55 308.62, 348.01 305.62, 352.46 302.41 C 356.92 299.20, 361.37 295.86, 365.83 292.18 C 370.29 288.50, 374.74 284.56, 379.20 280.36 C 383.65 276.16, 388.11 272.24, 392.57 266.99 C 397.02 261.74, 401.48 255.24, 405.93 248.81 C 410.39 242.38, 414.85 234.50, 419.30 228.32 C 423.76 222.13, 428.21 216.74, 432.67 211.67 C 437.13 206.59, 441.58 202.06, 446.04 197.90 C 450.49 193.73, 454.95 190.05, 459.41 186.68 C 463.86 183.31, 468.32 180.29, 472.77 177.72 C 477.23 175.15, 481.69 173.18, 486.14 171.31 C 490.60 169.44, 495.05 167.74, 499.51 166.51 C 503.97 165.27, 508.42 164.46, 512.88 163.93 C 517.34 163.40, 521.79 163.19, 526.25 163.29 C 530.70 163.40, 535.16 163.83, 539.62 164.57 C 544.07 165.31, 548.53 166.43, 552.98 167.78 C 557.44 169.12, 561.90 170.63, 566.35 172.60 C 570.81 174.58, 575.26 177.10, 579.72 179.66 C 584.18 182.22, 588.63 184.83, 593.09 187.97 C 597.54 191.12, 602.00 194.64, 606.46 198.54 C 610.91 202.44, 615.37 206.50, 619.82 211.34 C 624.28 216.17, 628.74 221.99, 633.19 227.63 C 637.65 233.27, 642.10 239.16, 646.56 245.25 C 651.02 251.34, 655.47 258.91, 659.93 263.94 C 664.38 268.97, 668.84 272.08, 673.30 275.18 C 677.75 278.28, 682.21 280.61, 686.66 282.59 C 691.12 284.56, 695.58 286.07, 700.03 287.09 C 704.49 288.10, 708.94 288.59, 713.40 288.69 C 717.86 288.80, 722.31 288.47, 726.77 287.72 C 731.22 286.97, 735.68 285.85, 740.14 284.18 C 744.59 282.51, 749.05 280.31, 753.51 277.74 C 757.96 275.18, 762.42 272.30, 766.87 268.78 C 771.33 265.25, 775.79 261.04, 780.24 256.61 C 784.70 252.18, 789.15 246.78, 793.61 242.18 C 798.07 237.58, 802.52 233.05, 806.98 229.04 C 811.43 225.03, 815.89 221.40, 820.35 218.15 C 824.80 214.91, 829.26 211.93, 833.71 209.53 C 838.17 207.14, 842.63 205.16, 847.08 203.78 C 851.54 202.40, 855.99 201.49, 860.45 201.23 C 864.91 200.97, 869.36 201.28, 873.82 202.19 C 878.27 203.10, 884.96 205.94, 887.19 206.69"
                stroke="#ff4b00"
                strokeWidth={3}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  pathLength: { duration: 1.5, ease: 'easeInOut', delay: 0.7 },
                  opacity: { duration: 0.4, delay: 0.7 },
                }}
              />
              {/* Endpoint dots at each step node — pop in as wave reaches each step */}
              <motion.circle
                cx={85}
                cy={305}
                r={4.5}
                fill="#ff4b00"
                style={{ transformOrigin: '85px 305px' }}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, ease: POP_EASE, delay: 0.75 }}
              />
              <motion.circle
                cx={526}
                cy={163}
                r={4.5}
                fill="#ff4b00"
                style={{ transformOrigin: '526px 163px' }}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, ease: POP_EASE, delay: 1.5 }}
              />
              <motion.circle
                cx={887}
                cy={207}
                r={4.5}
                fill="#ff4b00"
                style={{ transformOrigin: '887px 207px' }}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, ease: POP_EASE, delay: 2.2 }}
              />
            </svg>

            {/* Step columns — icons ride the wave; titles & body share ONE
                baseline (all 3 texts at step 01's anchor level). Each step's
                content reveals in staggered sequence as the wave reaches it. */}
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              // Wave node y values from SVG circles: step 1 = 305, step 2 = 163, step 3 = 207
              // Icon is 80px (h-20) → icon top = wave_y - 40
              const positions = [
                { left: '8.5%', iconTop: 265 }, // step 1: wave y=305 → icon top=265
                { left: '52.6%', iconTop: 123 }, // step 2: wave y=163 → icon top=123
                { left: '88.7%', iconTop: 167 }, // step 3: wave y=207 → icon top=167
              ];
              const pos = positions[i];
              const baseDelay = desktopStepDelays[i]; // 0.7, 1.5, 2.2

              return (
                <div
                  key={step.num}
                  className="absolute top-0 h-full"
                  style={{
                    left: pos.left,
                    width: '320px',
                    transform: 'translateX(-50%)',
                  }}
                >
                  {/* Step number — fades in from top as wave reaches this step.
                      Number is 110px tall, positioned so its bottom edge meets
                      the icon's top edge (top = iconTop - 110). */}
                  <motion.span
                    aria-hidden
                    className="absolute text-[110px] font-thin leading-none select-none whitespace-nowrap"
                    style={{
                      top: `${pos.iconTop - 110}px`,
                      left: '50%',
                      backgroundImage:
                        'linear-gradient(to bottom, #E2E8F0 0%, #EBEBEB 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: '#E2E8F0',
                      WebkitTextFillColor: 'transparent',
                    }}
                    variants={fadeInFromTopCentered(baseDelay)}
                  >
                    {step.num}
                  </motion.span>

                  {/* Icon circle — pops in (scale 0.5 → 1 with overshoot) as
                      wave reaches this step. Hover scale lives on inner div so
                      it doesn't conflict with Framer Motion's transform. */}
                  <motion.div
                    className="absolute z-10"
                    style={{ top: `${pos.iconTop}px`, left: '50%' }}
                    variants={popInCentered(baseDelay + 0.1)}
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-[0_10px_40px_rgba(255,75,0,0.2)] ring-1 ring-black/5 transition-transform duration-300 hover:scale-105">
                      <Icon className="h-9 w-9 text-[#ff4b00]" strokeWidth={1.8} />
                    </div>
                  </motion.div>

                  {/* Title — slides up + fades in, anchored at fixed y */}
                  <motion.h3
                    className="absolute text-center text-xl font-semibold text-[#0F172A] whitespace-nowrap"
                    style={{ top: '370px', left: '50%', width: 'auto' }}
                    variants={fadeUpCentered(baseDelay + 0.2)}
                  >
                    {step.title}
                  </motion.h3>

                  {/* Body — slides up + fades in, anchored at fixed y */}
                  <motion.p
                    className="absolute text-center text-sm leading-6 text-[#475569]"
                    style={{ top: '408px', left: '50%', width: '280px' }}
                    variants={fadeUpCentered(baseDelay + 0.3)}
                  >
                    {step.body}
                  </motion.p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
