"use client";

import { useEffect, useRef } from "react";

/**
 * Confeti en canvas, sin dependencias externas. Cada cambio de `runKey`
 * dispara una ráfaga nueva. Respeta `prefers-reduced-motion`.
 */

const COLORS = ["#2563eb", "#f59e0b", "#ec4899", "#10b981", "#8b5cf6", "#ef4444"];
const PARTICLES_PER_BURST = 140;
const GRAVITY = 0.32;
const DRAG = 0.992;
const FADE_START = 0.65;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  /** Achatamiento que simula el giro del papelito. */
  wobble: number;
}

function createParticles(width: number, height: number): Particle[] {
  const particles: Particle[] = [];
  // Dos cañones, uno en cada esquina inferior, apuntando hacia el centro.
  const cannons = [
    { x: width * 0.08, y: height * 0.95, angle: -Math.PI / 3 },
    { x: width * 0.92, y: height * 0.95, angle: (-Math.PI * 2) / 3 },
  ];

  for (const cannon of cannons) {
    for (let i = 0; i < PARTICLES_PER_BURST / 2; i++) {
      const spread = (Math.random() - 0.5) * 0.9;
      const speed = 11 + Math.random() * 11;
      const angle = cannon.angle + spread;
      particles.push({
        x: cannon.x,
        y: cannon.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.3,
        wobble: Math.random() * Math.PI * 2,
      });
    }
  }

  return particles;
}

export function ConfettiBurst({ runKey }: { runKey: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (runKey === 0) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const particles = createParticles(width, height);
    const start = performance.now();
    const duration = 4000;

    function draw(now: number) {
      const elapsed = now - start;
      const progress = elapsed / duration;

      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      if (progress >= 1) {
        frameRef.current = null;
        return;
      }

      const alpha =
        progress < FADE_START ? 1 : 1 - (progress - FADE_START) / (1 - FADE_START);

      for (const p of particles) {
        p.vx *= DRAG;
        p.vy = p.vy * DRAG + GRAVITY;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        p.wobble += 0.1;

        if (p.y > height + 20) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        // El ancho oscila para dar la sensación de que el papel gira.
        ctx.fillRect(
          -p.size / 2,
          -p.size / 2,
          p.size * Math.abs(Math.cos(p.wobble)),
          p.size * 0.6
        );
        ctx.restore();
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      ctx.clearRect(0, 0, width, height);
    };
  }, [runKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100]"
    />
  );
}
