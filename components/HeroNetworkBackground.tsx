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
}

const COLORS = [
  { dot: "99, 102, 241", glow: "99, 102, 241" },
  { dot: "168, 85, 247", glow: "168, 85, 247" },
  { dot: "236, 72, 153", glow: "236, 72, 153" },
  { dot: "56, 189, 248", glow: "56, 189, 248" },
  { dot: "139, 92, 246", glow: "139, 92, 246" },
];

export function HeroNetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const cvs = canvasRef.current as HTMLCanvasElement;
    const ctx = cvs.getContext("2d") as CanvasRenderingContext2D;

    let animationId: number;
    let nodes: Node[] = [];
    const connectionDist = 180;
    let mouseX = -9999;
    let mouseY = -9999;

    function resize() {
      cvs.width = window.innerWidth;
      cvs.height = window.innerHeight;
    }

    function init() {
      resize();
      const count = Math.min(55, Math.floor((window.innerWidth * window.innerHeight) / 20000));
      nodes = [];
      for (let i = 0; i < count; i++) {
        const colorSet = COLORS[i % COLORS.length];
        const layer = i < count * 0.3 ? 0 : 1;
        nodes.push({
          x: Math.random() * cvs.width,
          y: Math.random() * cvs.height,
          vx: (Math.random() - 0.5) * (layer === 0 ? 0.12 : 0.28),
          vy: (Math.random() - 0.5) * (layer === 0 ? 0.12 : 0.28),
          radius: layer === 0 ? Math.random() * 2 + 1.5 : Math.random() * 1.5 + 0.5,
          baseOpacity: layer === 0 ? Math.random() * 0.3 + 0.1 : Math.random() * 0.5 + 0.25,
          color: colorSet.dot,
          glowColor: colorSet.glow,
          pulseSpeed: Math.random() * 0.02 + 0.008,
          pulseOffset: Math.random() * Math.PI * 2,
          layer,
        });
      }
    }

    function draw(time: number) {
      ctx.clearRect(0, 0, cvs.width, cvs.height);

      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        const mDx = mouseX - node.x;
        const mDy = mouseY - node.y;
        const mDist = Math.sqrt(mDx * mDx + mDy * mDy);
        if (mDist < 300) {
          const force = (1 - mDist / 300) * 0.02;
          node.x -= mDx * force;
          node.y -= mDy * force;
        }
        if (node.x < -50) node.x = cvs.width + 50;
        if (node.x > cvs.width + 50) node.x = -50;
        if (node.y < -50) node.y = cvs.height + 50;
        if (node.y > cvs.height + 50) node.y = -50;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const ni = nodes[i];
          const nj = nodes[j];
          const dx = ni.x - nj.x;
          const dy = ni.y - nj.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectionDist) {
            const alpha = (1 - dist / connectionDist) * 0.08;
            const lineColor = i % 2 === 0 ? ni.glowColor : nj.glowColor;
            ctx.beginPath();
            ctx.moveTo(ni.x, ni.y);
            ctx.lineTo(nj.x, nj.y);
            ctx.strokeStyle = `rgba(${lineColor}, ${alpha})`;
            ctx.lineWidth = ni.layer === 0 && nj.layer === 0 ? 0.4 : 0.6;
            ctx.stroke();
          }
        }
      }

      for (const node of nodes) {
        const pulse = Math.sin(time * node.pulseSpeed + node.pulseOffset) * 0.3 + 0.7;
        const opacity = node.baseOpacity * pulse;
        const glowRadius = node.layer === 0 ? 30 : 18;

        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, glowRadius
        );
        gradient.addColorStop(0, `rgba(${node.glowColor}, ${opacity * 0.15})`);
        gradient.addColorStop(1, `rgba(${node.glowColor}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${node.color}, ${opacity})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    }

    function onMouseMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }
    function onMouseLeave() {
      mouseX = -9999;
      mouseY = -9999;
    }

    init();
    animationId = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
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
