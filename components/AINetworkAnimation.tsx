'use client';

import { useEffect, useRef } from 'react';

/**
 * AINetworkAnimation — v2 (complete redesign, bulletproof edition)
 *
 * SINGLE-LAYER ARCHITECTURE: the entire animation is painted on ONE <canvas>.
 * No SVG. No presentation attributes. No CSS-dependent colors.
 * Every color lives in the COLORS object below and is painted by JavaScript,
 * which means no stylesheet, framework class, or cascade rule can ever
 * change a single color. The only way a color changes is by editing COLORS.
 *
 * Transparent background — sits on any hero color. Keeps a 20:8.2 aspect ratio
 * (drop-in replacement for v1).
 */

const W = 2000;
const H = 820;
const BOX = 88;
const BOX_R = 22;
const CORE = { x: 1000, y: 350, size: 175, r: 34 };

type IconKind =
  | 'call' | 'booking' | 'message' | 'facebook'
  | 'analytics' | 'instagram' | 'zap' | 'star';

const NODES: { x: number; y: number; icon: IconKind }[] = [
  { x: 205, y: 145, icon: 'call' },
  { x: 105, y: 326, icon: 'booking' },
  { x: 205, y: 485, icon: 'message' },
  { x: 105, y: 615, icon: 'facebook' },
  { x: 1795, y: 145, icon: 'analytics' },
  { x: 1895, y: 326, icon: 'instagram' },
  { x: 1795, y: 485, icon: 'zap' },
  { x: 1895, y: 615, icon: 'star' },
];

/* ------------------------------------------------------------------ */
/*  THE ONLY PLACE COLORS EXIST. Change colors here and only here.    */
/* ------------------------------------------------------------------ */
const COLORS = {
  boxFill: '#000000',
  boxStroke: '#1a1a22',
  boxAccent: '#22222c',

  icon: '#596170',

  lineWide: '#101016',
  lineCore: '#14141b',
  lineThin: '#23232d',

  pulse: '#ff6a00',
  pulseBright: '#ff9a4d',
  pulseRGB: '255,106,0',

  coreFill: '#000000',
  coreStroke: '#20202a',
  coreInner: '#15151c',
  corePin: '#262630',

  text: '#0d0d0e',
  sheenRGB: '67,70,76', // #43464c

  particleRGB: '89,97,112', // #596170
};

type Pt = { x: number; y: number };

type Wire = { pts: Pt[]; lens: number[]; total: number };

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* EXACT original wire shapes from the v1 project (chip pin -> box socket):
   horizontal run + 45-degree diagonal + horizontal arrival. One-way chip -> box. */
const WIRE_PTS: Pt[][] = [
  // left column (chip left edge x=912)
  [
    { x: 912, y: 280 }, { x: 640, y: 280 }, { x: 505, y: 145 }, { x: 253, y: 145 },
  ],
  [{ x: 912, y: 326 }, { x: 153, y: 326 }],
  [
    { x: 912, y: 368 }, { x: 665, y: 368 }, { x: 548, y: 485 }, { x: 253, y: 485 },
  ],
  [
    { x: 912, y: 418 }, { x: 685, y: 418 }, { x: 488, y: 615 }, { x: 153, y: 615 },
  ],
  // right column (chip right edge x=1088)
  [
    { x: 1088, y: 280 }, { x: 1360, y: 280 }, { x: 1495, y: 145 }, { x: 1747, y: 145 },
  ],
  [{ x: 1088, y: 326 }, { x: 1847, y: 326 }],
  [
    { x: 1088, y: 368 }, { x: 1335, y: 368 }, { x: 1452, y: 485 }, { x: 1747, y: 485 },
  ],
  [
    { x: 1088, y: 418 }, { x: 1315, y: 418 }, { x: 1512, y: 615 }, { x: 1847, y: 615 },
  ],
];

/* Original four vertical traces from the chip bottom down — now cut to 1/3 length */
/* Original four vertical traces from the chip bottom down (y 438 -> 800) */
const BOTTOM_PTS: Pt[][] = [
  [{ x: 948, y: 438 }, { x: 948, y: 800 }],
  [{ x: 983, y: 438 }, { x: 983, y: 800 }],
  [{ x: 1017, y: 438 }, { x: 1017, y: 800 }],
  [{ x: 1052, y: 438 }, { x: 1052, y: 800 }],
];

type WireSignal = { pos: number; speed: number };

export default function AINetworkAnimation() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* ---------------- icon geometry (Path2D is browser-only) ---------------- */
    const phonePath = new Path2D(
      'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'
    );
    const bubblePath = new Path2D('M7.9 20A9 9 0 1 0 4 16.1L2 22Z');
    const zapPath = new Path2D('M13 2 3 14h9l-1 8 10-12h-9l1-8z');
    const starPath = new Path2D(
      'M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z'
    );

    const drawIcon = (kind: IconKind, x: number, y: number, glow = 0) => {
      // icon color blends slate -> bright orange as the box lights up
      const base: [number, number, number] = [0x59, 0x61, 0x70]; // #596170
      const lit: [number, number, number] = [0xff, 0x9a, 0x4d]; // #ff9a4d
      const t = Math.min(1, Math.max(0, glow));
      const iconColor = `rgb(${Math.round(base[0] + (lit[0] - base[0]) * t)},${Math.round(
        base[1] + (lit[1] - base[1]) * t
      )},${Math.round(base[2] + (lit[2] - base[2]) * t)})`;
      ctx.save();
      ctx.translate(x, y);
      if (t > 0.02) {
        ctx.shadowColor = `rgba(${COLORS.pulseRGB},${0.65 * t})`;
        ctx.shadowBlur = 16 * t;
      }
      ctx.strokeStyle = iconColor;
      ctx.fillStyle = iconColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (kind === 'call') {
        ctx.scale(1.9, 1.9);
        ctx.translate(-12, -12);
        ctx.fill(phonePath);
      } else if (kind === 'booking') {
        ctx.scale(1.9, 1.9);
        ctx.translate(-12, -12);
        ctx.lineWidth = 1.9;
        rr(ctx, 3, 4, 18, 18, 2.5);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, 2); ctx.lineTo(8, 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(16, 2); ctx.lineTo(16, 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3, 10); ctx.lineTo(21, 10); ctx.stroke();
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        ctx.moveTo(9, 15.5);
        ctx.lineTo(11, 17.5);
        ctx.lineTo(15, 13.5);
        ctx.stroke();
      } else if (kind === 'message') {
        ctx.scale(1.9, 1.9);
        ctx.translate(-12, -12);
        ctx.lineWidth = 1.9;
        ctx.stroke(bubblePath);
      } else if (kind === 'facebook') {
        ctx.font = '800 38px system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('f', 0, 2);
      } else if (kind === 'analytics') {
        const bars = [
          { x: -15, y: 2, h: 11 },
          { x: -4, y: -4, h: 17 },
          { x: 7, y: -12, h: 25 },
        ];
        bars.forEach((b) => {
          rr(ctx, b.x, b.y, 8, b.h, 2);
          ctx.fill();
        });
      } else if (kind === 'instagram') {
        ctx.lineWidth = 2.6;
        rr(ctx, -14, -14, 28, 28, 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(8.5, -8.5, 1.9, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 'zap') {
        ctx.scale(1.9, 1.9);
        ctx.translate(-12, -12);
        ctx.fill(zapPath);
      } else if (kind === 'star') {
        ctx.scale(1.9, 1.9);
        ctx.translate(-12, -12);
        ctx.fill(starPath);
      }
      ctx.restore();
    };

    /* ---------------- connection wires (angular PCB traces) ---------------- */
    const makeWire = (pts: Pt[]): Wire => {
      const lens: number[] = [0];
      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        lens.push(total);
      }
      return { pts, lens, total };
    };

    const pointAt = (w: Wire, d: number): Pt => {
      if (d <= 0) return w.pts[0];
      if (d >= w.total) return w.pts[w.pts.length - 1];
      for (let i = 1; i < w.pts.length; i++) {
        if (d <= w.lens[i]) {
          const t = (d - w.lens[i - 1]) / (w.lens[i] - w.lens[i - 1]);
          return {
            x: w.pts[i - 1].x + (w.pts[i].x - w.pts[i - 1].x) * t,
            y: w.pts[i - 1].y + (w.pts[i].y - w.pts[i - 1].y) * t,
          };
        }
      }
      return w.pts[w.pts.length - 1];
    };

    const wires = WIRE_PTS.map(makeWire);
    const bottomWires = BOTTOM_PTS.map(makeWire);
    const allWires = [...wires, ...bottomWires]; // 0-7 box wires, 8-11 bottom wires

    /* ---------------- animation state ---------------- */
    /* PER-WIRE SEQUENCER: each of the 12 wires carries at most ONE signal
       at a time. A signal travels chip -> box, vanishes, then that wire
       rests a random beat before dispatching its next signal. Many wires
       can be active simultaneously — but never two signals on one wire. */
    type WireSignal = { pos: number; speed: number; rest: number; live: boolean };
    const wireSignals: WireSignal[] = allWires.map((_, i) => ({
      pos: 0,
      speed: 80 + Math.random() * 30,
      // each wire starts on its own random clock (staggered + jitter)
      rest: i * 0.4 + Math.random() * 1.8,
      live: false,
    }));

    const nodeGlow: number[] = new Array(NODES.length).fill(0);
    /* glow holds at full brightness for HOLD_MS, then fades out */
    const HOLD_MS = 550;
    const nodeHoldUntil: number[] = new Array(NODES.length).fill(0);

    const parts = Array.from({ length: 24 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      r: 0.8 + Math.random() * 1.5,
      a: 0.05 + Math.random() * 0.13,
    }));

    /* ---------------- pulse rendering (chip -> box, one way) ---------------- */
    const drawPulseTrail = (w: Wire, pos: number) => {
      const STEPS = 12;
      const TRAIL = Math.min(w.total * 0.28, 140);
      const headD = pos * w.total;
      const spawnFade = Math.min(1, pos / 0.05); // fade in when leaving the chip
      const arriveFade = pos > 0.93 ? Math.max(0, (1 - pos) / 0.07) : 1; // fade out as it enters the box
      const fade = Math.min(spawnFade, arriveFade);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.shadowColor = `rgba(${COLORS.pulseRGB},0.55)`;
      ctx.shadowBlur = 9;
      for (let j = STEPS; j >= 1; j--) {
        const dA = headD - (TRAIL * (j - 1)) / STEPS;
        const dB = headD - (TRAIL * j) / STEPS;
        if (dA < -2 || dB > w.total + 2) continue;
        const a = pointAt(w, Math.max(0, Math.min(w.total, dA)));
        const b = pointAt(w, Math.max(0, Math.min(w.total, dB)));
        const k = 1 - j / STEPS; // 0 at tail, 1 near head
        ctx.strokeStyle = `rgba(${COLORS.pulseRGB},${(0.28 + 0.6 * k) * fade})`;
        ctx.lineWidth = 1.2 + k * 4.2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      const h = pointAt(w, headD);
      ctx.shadowBlur = 14;
      ctx.fillStyle = `rgba(${COLORS.pulseRGB},${0.4 * fade})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.pulse;
      ctx.globalAlpha = fade;
      ctx.beginPath(); ctx.arc(h.x, h.y, 3.6, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.pulseBright;
      ctx.beginPath(); ctx.arc(h.x, h.y, 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    /* ---------------- render loop ---------------- */
    let last = performance.now();
    let raf = 0;

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, W, H);

      /* ambient particles */
      parts.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -4) p.x = W + 4;
        if (p.x > W + 4) p.x = -4;
        if (p.y < -4) p.y = H + 4;
        if (p.y > H + 4) p.y = -4;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${COLORS.particleRGB},${p.a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      /* connection wires — 3-layer angular traces + bottom verticals */
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const strokeWire = (pts: Pt[]) => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = COLORS.lineWide;
        ctx.lineWidth = 5.5;
        ctx.stroke();
        ctx.strokeStyle = COLORS.lineCore;
        ctx.lineWidth = 3.2;
        ctx.stroke();
        ctx.strokeStyle = COLORS.lineThin;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      };
      wires.forEach((w) => strokeWire(w.pts));
      BOTTOM_PTS.forEach(strokeWire);

      /* per-wire signals — one per wire, chip -> box */
      wireSignals.forEach((s, wi) => {
        if (!s.live) {
          s.rest -= dt;
          if (s.rest <= 0) {
            s.live = true;
            s.pos = 0;
            s.speed = 80 + Math.random() * 30;
          }
          return;
        }
        const w = allWires[wi];
        s.pos += (s.speed * dt) / w.total;
        if (s.pos >= 1) {
          if (wi < wires.length) {
            nodeGlow[wi] = 1; // signal hit the box — light it up
            nodeHoldUntil[wi] = now + HOLD_MS;
          }
          s.live = false;
          // box wires flow steadily; bottom wires fire rarer (they're visual twins —
          // firing together looks like a bundle pulse)
          s.rest = wi < wires.length
            ? 0.5 + Math.random() * 3.5
            : 2.5 + Math.random() * 5.0;
        } else {
          drawPulseTrail(w, s.pos);
        }
      });

      /* node boxes */
      NODES.forEach((n, i) => {
        const x = n.x - BOX / 2;
        const y = n.y - BOX / 2;
        if (now < nodeHoldUntil[i]) {
          nodeGlow[i] = 1; // holding at full brightness
        } else if (nodeGlow[i] > 0.005) {
          nodeGlow[i] *= Math.exp(-dt * 3.2); // then fade out
        } else {
          nodeGlow[i] = 0;
        }
        if (nodeGlow[i] > 0.01) {
          const g = nodeGlow[i];
          ctx.save();
          ctx.shadowColor = `rgba(${COLORS.pulseRGB},${0.55 * g})`;
          ctx.shadowBlur = 18 * g;
          ctx.strokeStyle = `rgba(${COLORS.pulseRGB},${0.75 * g})`;
          ctx.lineWidth = 2.4;
          rr(ctx, x - 3, y - 3, BOX + 6, BOX + 6, BOX_R + 3);
          ctx.stroke();
          ctx.restore();
        }
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 5;
        ctx.fillStyle = COLORS.boxFill;
        rr(ctx, x, y, BOX, BOX, BOX_R);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = COLORS.boxStroke;
        ctx.lineWidth = 1.5;
        rr(ctx, x, y, BOX, BOX, BOX_R);
        ctx.stroke();
        ctx.strokeStyle = COLORS.boxAccent;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 6.5);
        ctx.lineTo(x + BOX - 20, y + 6.5);
        ctx.stroke();
        ctx.globalAlpha = 1;
        drawIcon(n.icon, n.x, n.y, nodeGlow[i]);
      });

      /* core */
      const cx = CORE.x;
      const cy = CORE.y;
      const s = CORE.size;
      const r = CORE.r;
      const hx = cx - s / 2;
      const hy = cy - s / 2;
      const breathe = 0.5 + 0.5 * Math.sin(now / 1500);

      const back = ctx.createRadialGradient(cx, cy, 20, cx, cy, 250);
      back.addColorStop(0, 'rgba(0,0,0,0)');
      back.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = back;
      ctx.beginPath();
      ctx.arc(cx, cy, 250, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.corePin;
      [-70, -24, 18, 68].forEach((off) => {
        rr(ctx, hx - 11, cy + off - 4, 11, 8, 2.5);
        ctx.fill();
        rr(ctx, hx + s, cy + off - 4, 11, 8, 2.5);
        ctx.fill();
      });
      [-52, -17, 17, 52].forEach((off) => {
        rr(ctx, cx + off - 4, hy + s, 8, 11, 2.5);
        ctx.fill();
      });

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 7;
      ctx.fillStyle = COLORS.coreFill;
      rr(ctx, hx, hy, s, s, r);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = COLORS.coreStroke;
      ctx.lineWidth = 1.8;
      rr(ctx, hx, hy, s, s, r);
      ctx.stroke();
      ctx.strokeStyle = COLORS.coreInner;
      ctx.lineWidth = 1.3;
      rr(ctx, hx + 9, hy + 9, s - 18, s - 18, r - 8);
      ctx.stroke();
      ctx.strokeStyle = COLORS.boxAccent;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(hx + 30, hy + 8);
      ctx.lineTo(hx + s - 30, hy + 8);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = `rgba(${COLORS.sheenRGB},${0.1 + 0.07 * breathe})`;
      ctx.lineWidth = 1;
      rr(ctx, hx - 13, hy - 13, s + 26, s + 26, r + 10);
      ctx.stroke();

      /* AI text + slow sheen sweep */
      ctx.font = '900 80px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = COLORS.text;
      ctx.fillText('AI', cx, cy + 4);

      const cycle = 6000;
      const ct = (now % cycle) / cycle;
      const sweep = 0.42;
      if (ct < sweep) {
        const p = ct / sweep;
        const gx = cx - 190 + p * 380;
        const sg = ctx.createLinearGradient(gx - 90, 0, gx + 90, 0);
        sg.addColorStop(0, `rgba(${COLORS.sheenRGB},0)`);
        sg.addColorStop(0.5, `rgba(${COLORS.sheenRGB},0.95)`);
        sg.addColorStop(1, `rgba(${COLORS.sheenRGB},0)`);
        ctx.fillStyle = sg;
        ctx.fillText('AI', cx, cy + 4);
      }

      raf = requestAnimationFrame(render);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(render);
    };
    const stop = () => cancelAnimationFrame(raf);

    // Only run the heavy canvas loop while the animation is on-screen.
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) start();
          else stop();
        },
        { rootMargin: '300px 0px' }
      );
      observer.observe(canvas);
    } else {
      start();
    }

    return () => {
      stop();
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '20 / 8.2',
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      <canvas
        ref={ref}
        width={W}
        height={H}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
