"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#f2c14e", "#2f80c0", "#4c9a2a", "#b5651d", "#e76f51", "#1b9aaa"];

/** A short burst of confetti over the page (skipped for people who prefer reduced motion). */
export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();

    // Two bursts, from the lower left and lower right corners, aimed up and inward.
    const pieces = Array.from({ length: 140 }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.9;
      const speed = (9 + Math.random() * 9) * dpr;
      return {
        x: (fromLeft ? 0.1 : 0.9) * canvas.width,
        y: canvas.height * 0.85,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (5 + Math.random() * 6) * dpr,
        color: COLORS[i % COLORS.length],
        spin: Math.random() * Math.PI,
        spinSpeed: (Math.random() - 0.5) * 0.3,
      };
    });

    let frame = 0;
    let raf = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const fade = Math.max(0, 1 - Math.max(0, frame - 90) / 60);
      for (const p of pieces) {
        p.vy += 0.28 * dpr; // gravity
        p.vx *= 0.985; // air resistance
        p.x += p.vx;
        p.y += p.vy;
        p.spin += p.spinSpeed;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (fade > 0) raf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50 h-full w-full" aria-hidden />;
}
