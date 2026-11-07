"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ViewerPhoto = { src: string; alt: string; caption?: string };

type Transform = { scale: number; x: number; y: number };
const NONE: Transform = { scale: 1, x: 0, y: 0 };
const MAX_SCALE = 4;

/**
 * Full-screen photo viewer. Pinch or double-tap to zoom, drag to look around while zoomed,
 * swipe left/right for the next photo, swipe down (or Esc) to close. Arrow keys work on computers.
 */
export function PhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: ViewerPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const [t, setT] = useState<Transform>(NONE);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [moving, setMoving] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef({ t: NONE, dist: 0, mid: { x: 0, y: 0 }, point: { x: 0, y: 0 }, pinched: false });
  const lastTap = useRef({ time: 0, x: 0, y: 0 });

  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const go = useCallback(
    (step: number) => {
      const next = index + step;
      if (next < 0 || next >= photos.length) return;
      setT(NONE);
      onIndexChange(next);
    },
    [index, photos.length, onIndexChange],
  );

  // Keyboard, and stop the page behind from scrolling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [go, onClose]);

  /** Keeps a zoomed photo from being dragged off screen. */
  function clamp(next: Transform): Transform {
    const box = area.current?.getBoundingClientRect();
    if (!box || next.scale <= 1.01) return NONE;
    const maxX = ((next.scale - 1) * box.width) / 2;
    const maxY = ((next.scale - 1) * box.height) / 2;
    return {
      scale: next.scale,
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  }

  const positions = () => [...pointers.current.values()];

  function onPointerDown(e: React.PointerEvent) {
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // Not every pointer can be captured; the gesture still works without it.
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = positions();
    setMoving(true);
    if (p.length === 2) {
      start.current = {
        ...start.current,
        t,
        dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y),
        mid: { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 },
        pinched: true,
      };
      setDrag({ x: 0, y: 0 });
    } else if (p.length === 1) {
      start.current = { ...start.current, t, point: { x: e.clientX, y: e.clientY }, pinched: false };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = positions();
    const s = start.current;
    if (p.length === 2) {
      const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      const mid = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
      const scale = Math.max(1, Math.min(MAX_SCALE, (s.t.scale * dist) / (s.dist || 1)));
      setT(clamp({ scale, x: s.t.x + (mid.x - s.mid.x), y: s.t.y + (mid.y - s.mid.y) }));
    } else if (p.length === 1 && !s.pinched) {
      const dx = e.clientX - s.point.x;
      const dy = e.clientY - s.point.y;
      if (s.t.scale > 1) setT(clamp({ scale: s.t.scale, x: s.t.x + dx, y: s.t.y + dy }));
      else setDrag(Math.abs(dx) > Math.abs(dy) ? { x: dx, y: 0 } : { x: 0, y: Math.max(0, dy) });
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) {
      // One finger left after a pinch: carry on from here as a drag.
      const [rest] = positions();
      start.current = { ...start.current, t, point: rest };
      return;
    }
    setMoving(false);
    const s = start.current;
    const dx = e.clientX - s.point.x;
    const dy = e.clientY - s.point.y;

    if (!s.pinched && s.t.scale <= 1) {
      if (drag.x < -60 && hasNext) go(1);
      else if (drag.x > 60 && hasPrev) go(-1);
      else if (drag.y > 100) onClose();
    }
    setDrag({ x: 0, y: 0 });

    // Double-tap: zoom in where you tapped, or back out.
    if (!s.pinched && Math.hypot(dx, dy) < 10) {
      const now = Date.now();
      const last = lastTap.current;
      if (now - last.time < 300 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30) {
        const box = area.current?.getBoundingClientRect();
        if (t.scale > 1 || !box) setT(NONE);
        else {
          const scale = 2.5;
          const cx = box.left + box.width / 2;
          const cy = box.top + box.height / 2;
          setT(clamp({ scale, x: (cx - e.clientX) * (scale - 1), y: (cy - e.clientY) * (scale - 1) }));
        }
        lastTap.current = { time: 0, x: 0, y: 0 };
      } else {
        lastTap.current = { time: now, x: e.clientX, y: e.clientY };
      }
    }
  }

  if (!photo) return null;
  const fade = drag.y > 0 ? Math.max(0.4, 1 - drag.y / 400) : 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black text-white"
      style={{ backgroundColor: `rgba(0,0,0,${fade})` }}
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
    >
      <div className="flex items-center justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="text-sm font-semibold text-white/80">
          {photos.length > 1 ? `${index + 1} / ${photos.length}` : ""}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 hover:bg-white/20"
          aria-label="Close photo"
        >
          <X className="h-6 w-6" aria-hidden />
        </button>
      </div>

      <div
        ref={area}
        className="relative flex flex-1 touch-none select-none items-center justify-center overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.src}
          src={photo.src}
          alt={photo.alt}
          draggable={false}
          className="max-h-full max-w-full object-contain"
          style={{
            transform: `translate(${t.x + drag.x}px, ${t.y + drag.y}px) scale(${t.scale})`,
            transition: moving ? "none" : "transform 200ms ease-out",
          }}
        />
        {hasPrev && (
          <button
            type="button"
            onClick={() => go(-1)}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute left-3 hidden rounded-full bg-white/10 p-2 hover:bg-white/20 md:block"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-7 w-7" aria-hidden />
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={() => go(1)}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute right-3 hidden rounded-full bg-white/10 p-2 hover:bg-white/20 md:block"
            aria-label="Next photo"
          >
            <ChevronRight className="h-7 w-7" aria-hidden />
          </button>
        )}
      </div>

      {photo.caption && (
        <p className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center font-semibold">{photo.caption}</p>
      )}
    </div>,
    document.body,
  );
}

/** A photo that opens full screen when tapped (for pages showing a single photo). */
export function ZoomablePhoto({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full cursor-zoom-in" aria-label={`View ${alt} full screen`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={`object-cover ${className}`} />
      </button>
      {open && <PhotoViewer photos={[{ src, alt, caption: alt }]} index={0} onIndexChange={() => {}} onClose={() => setOpen(false)} />}
    </>
  );
}
