"use client";

import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseOpacity: number;
  color: string;
  glowColor: string;
  pulseSpeed: number;
  pulseOffset: number;
  layer: number;
  wanderPhase: number;
  wanderSpeed: number;
}

interface LayerConfig {
  count: number;
  minR: number;
  maxR: number;
  minS: number;
  maxS: number;
  minO: number;
  maxO: number;
  connDist: number;
  lineAlpha: number;
  glowSize: number;
}

const PALETTE = [
  { dot: "99, 102, 241", glow: "99, 102, 241" },
  { dot: "168, 85, 247", glow: "168, 85, 247" },
  { dot: "139, 92, 246", glow: "139, 92, 246" },
  { dot: "56, 189, 248", glow: "56, 189, 248" },
  { dot: "236, 72, 153", glow: "236, 72, 153" },
  { dot: "167, 139, 250", glow: "167, 139, 250" },
  { dot: "34, 211, 238", glow: "34, 211, 238" },
  { dot: "129, 140, 248", glow: "129, 140, 248" },
];

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

export function HeroNetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = canvasRef.current as HTMLCanvasElement;
    const ctx = cvs.getContext("2d") as CanvasRenderingContext2D;

    let animationId: number;
    let nodes: Node[] = [];
    let startTime = 0;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const LAYERS: LayerConfig[] = [
      { count: 75, minR: 0.4, maxR: 1.2, minS: 0.05, maxS: 0.12, minO: 0.06, maxO: 0.18, connDist: 300, lineAlpha: 0.035, glowSize: 12 },
      { count: 55, minR: 0.8, maxR: 2.2, minS: 0.1, maxS: 0.28, minO: 0.12, maxO: 0.35, connDist: 220, lineAlpha: 0.09, glowSize: 20 },
      { count: 28, minR: 1.5, maxR: 3.5, minS: 0.18, maxS: 0.4, minO: 0.25, maxO: 0.65, connDist: 180, lineAlpha: 0.16, glowSize: 32 },
    ];

    function init() {
      const w = cvs.width;
      const h = cvs.height;
      nodes = [];
      for (let l = 0; l < LAYERS.length; l++) {
        const cfg = LAYERS[l];
        for (let i = 0; i < cfg.count; i++) {
          const p = PALETTE[(nodes.length + i) % PALETTE.length];
          nodes.push({
            x: rand(0, w),
            y: rand(0, h),
            vx: rand(cfg.minS, cfg.maxS) * (Math.random() > 0.5 ? 1 : -1),
            vy: rand(cfg.minS, cfg.maxS) * (Math.random() > 0.5 ? 1 : -1),
            radius: rand(cfg.minR, cfg.maxR),
            baseOpacity: rand(cfg.minO, cfg.maxO),
            color: p.dot,
            glowColor: p.glow,
            pulseSpeed: rand(0.004, 0.022),
            pulseOffset: rand(0, Math.PI * 2),
            layer: l,
            wanderPhase: rand(0, Math.PI * 2),
            wanderSpeed: rand(0.0015, 0.007),
          });
        }
      }
    }

    function draw(ts: number) {
      if (!startTime) startTime = ts;
      const t = (ts - startTime) * 0.001;
      const w = cvs.width;
      const h = cvs.height;

      ctx.clearRect(0, 0, w, h);

      for (const node of nodes) {
        const wander = Math.sin(t * node.wanderSpeed + node.wanderPhase) * 0.12;
        node.x += node.vx + wander;
        node.y += node.vy + wander * 0.6;
        const pad = 120;
        if (node.x < -pad) node.x = w + pad;
        if (node.x > w + pad) node.x = -pad;
        if (node.y < -pad) node.y = h + pad;
        if (node.y > h + pad) node.y = -pad;
      }

      for (let l = 0; l < LAYERS.length; l++) {
        const cfg = LAYERS[l];
        const ln = nodes.filter((n) => n.layer === l);
        for (let i = 0; i < ln.length; i++) {
          for (let j = i + 1; j < ln.length; j++) {
            const ni = ln[i];
            const nj = ln[j];
            const dx = ni.x - nj.x;
            const dy = ni.y - nj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < cfg.connDist) {
              const alpha = (1 - dist / cfg.connDist) * cfg.lineAlpha;
              ctx.beginPath();
              ctx.moveTo(ni.x, ni.y);
              ctx.lineTo(nj.x, nj.y);
              ctx.strokeStyle = `rgba(${ni.glowColor},${alpha})`;
              ctx.lineWidth = l === 2 ? 0.7 : l === 1 ? 0.5 : 0.25;
              ctx.stroke();
            }
          }
        }
      }

      const midNodes = nodes.filter((n) => n.layer === 1);
      const foreNodes = nodes.filter((n) => n.layer === 2);
      for (const mn of midNodes) {
        for (const fn of foreNodes) {
          const dx = mn.x - fn.x;
          const dy = mn.y - fn.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            const alpha = (1 - dist / 200) * 0.05;
            ctx.beginPath();
            ctx.moveTo(mn.x, mn.y);
            ctx.lineTo(fn.x, fn.y);
            ctx.strokeStyle = `rgba(139,92,246,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      for (const node of nodes) {
        const pulse = Math.sin(t * node.pulseSpeed + node.pulseOffset) * 0.3 + 0.7;
        const opacity = node.baseOpacity * pulse;
        const cfg = LAYERS[node.layer];
        const gSize = cfg.glowSize * (node.radius / ((cfg.minR + cfg.maxR) / 2));

        const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, gSize);
        grad.addColorStop(0, `rgba(${node.glowColor},${opacity * 0.18})`);
        grad.addColorStop(0.5, `rgba(${node.glowColor},${opacity * 0.06})`);
        grad.addColorStop(1, `rgba(${node.glowColor},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, gSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255,255,255,${opacity * 0.85})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${node.color},${opacity * 0.45})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      const cx = w / 2;
      const cy = h * 0.38;

      const outerVignette = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.75);
      outerVignette.addColorStop(0, "rgba(5,5,5,0)");
      outerVignette.addColorStop(0.3, "rgba(5,5,5,0)");
      outerVignette.addColorStop(0.55, "rgba(5,5,5,0.3)");
      outerVignette.addColorStop(1, "rgba(5,5,5,0.8)");
      ctx.fillStyle = outerVignette;
      ctx.fillRect(0, 0, w, h);

      const centerDim = ctx.createRadialGradient(cx, cy * 0.85, 0, cx, cy * 0.85, Math.min(w, h) * 0.3);
      centerDim.addColorStop(0, "rgba(5,5,5,0.3)");
      centerDim.addColorStop(1, "rgba(5,5,5,0)");
      ctx.fillStyle = centerDim;
      ctx.fillRect(0, 0, w, h);

      if (!prefersReducedMotion) {
        animationId = requestAnimationFrame(draw);
      }
    }

    function resize() {
      cvs.width = window.innerWidth;
      cvs.height = window.innerHeight;
      init();
      if (prefersReducedMotion) {
        draw(0);
      }
    }

    resize();
    if (!prefersReducedMotion) {
      animationId = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}
