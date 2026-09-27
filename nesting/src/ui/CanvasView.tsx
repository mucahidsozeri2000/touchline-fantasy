import { useCallback, useEffect, useRef, useState } from 'react';
import type { BBox, Ring, Vec2 } from '../core/geometry/types';
import { pointInRing } from '../core/geometry/polygon';
import { distToSegment } from '../core/geometry/vec';
import { tr } from '../i18n/tr';
import type { GalleryItem } from './canvas/gallery';
import { type Viewport, fit, pan, toWorld, zoomAt } from './canvas/viewport';
import { ERROR_COLOR, partFill, partStroke } from './colors';

interface Props {
  items: GalleryItem[];
  bounds: BBox;
  hoveredPartId: string | null;
  onHoverPart(id: string | null): void;
}

interface Hover {
  x: number;
  y: number;
  label: string;
}

function ringPath(path: Path2D, ring: Ring, off: Vec2, v: Viewport) {
  ring.forEach((p, i) => {
    const x = (p.x + off.x) * v.s + v.ox;
    const y = -(p.y + off.y) * v.s + v.oy;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  });
  path.closePath();
}

/** Öğe altında (dünya koordinatında) nokta var mı? */
function hitTest(items: GalleryItem[], w: Vec2, tolWorld: number): GalleryItem | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    const b = it.box;
    if (w.x < b.minX - tolWorld || w.x > b.maxX + tolWorld || w.y < b.minY - tolWorld || w.y > b.maxY + tolWorld) continue;
    const p = { x: w.x - it.offset.x, y: w.y - it.offset.y };
    if (it.kind === 'part') {
      if (pointInRing(p, it.part.outer.ring) !== 1) continue;
      if (it.part.holes.some((h) => pointInRing(p, h.ring) === 1)) continue;
      return it;
    }
    for (const c of it.contours) {
      for (let k = 1; k < c.points.length; k++) {
        if (distToSegment(p, c.points[k - 1], c.points[k]) <= tolWorld) return it;
      }
    }
  }
  return null;
}

export function CanvasView({ items, bounds, hoveredPartId, onHoverPart }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<Viewport>({ s: 1, ox: 0, oy: 0 });
  const sizeRef = useRef({ w: 0, h: 0 });
  const rafRef = useRef(0);
  const [hover, setHover] = useState<Hover | null>(null);
  const hoveredRef = useRef<string | null>(hoveredPartId);
  hoveredRef.current = hoveredPartId;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = sizeRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const v = viewRef.current;

    for (const it of items) {
      if (it.kind === 'part') {
        const path = new Path2D();
        ringPath(path, it.part.outer.ring, it.offset, v);
        for (const hole of it.part.holes) ringPath(path, hole.ring, it.offset, v);
        const hot = hoveredRef.current === it.part.id;
        ctx.fillStyle = partFill(it.colorIndex, hot ? 0.6 : 0.3);
        ctx.fill(path, 'evenodd');
        ctx.lineWidth = hot ? 2 : 1.25;
        ctx.strokeStyle = partStroke(it.colorIndex);
        ctx.stroke(path);
      } else {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = ERROR_COLOR;
        ctx.fillStyle = ERROR_COLOR;
        for (const c of it.contours) {
          const path = new Path2D();
          c.points.forEach((p, i) => {
            const x = (p.x + it.offset.x) * v.s + v.ox;
            const y = -(p.y + it.offset.y) * v.s + v.oy;
            if (i === 0) path.moveTo(x, y);
            else path.lineTo(x, y);
          });
          ctx.stroke(path);
          // Açık uçları belirgin işaretle.
          for (const e of [c.start, c.end]) {
            ctx.beginPath();
            ctx.arc((e.x + it.offset.x) * v.s + v.ox, -(e.y + it.offset.y) * v.s + v.oy, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }, [items]);

  const requestDraw = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  const fitView = useCallback(() => {
    const { w, h } = sizeRef.current;
    if (w > 0 && h > 0) viewRef.current = fit(bounds, w, h);
    requestDraw();
  }, [bounds, requestDraw]);

  // Boyut değişimi → canvas çözünürlüğünü güncelle.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    let first = true;
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { w: r.width, h: r.height };
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      if (first) {
        first = false;
        fitView();
      } else requestDraw();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [fitView, requestDraw]);

  // İçerik değişince sığdır.
  useEffect(() => {
    fitView();
  }, [fitView]);

  useEffect(() => {
    requestDraw();
  }, [hoveredPartId, requestDraw]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // --- Etkileşim: fare tekerleği, sürükleme, pinch --------------------------
  const pointers = useRef(new Map<number, Vec2>());
  const pinchRef = useRef<{ dist: number; mid: Vec2 } | null>(null);

  const localPoint = (e: { clientX: number; clientY: number }): Vec2 => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  // React'in onWheel'i pasif kaydedilir (preventDefault çalışmaz) → elle ekle.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const at = { x: e.clientX - r.left, y: e.clientY - r.top };
      // deltaMode 1 = satır; yaklaşık piksel karşılığına çevir.
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      viewRef.current = zoomAt(viewRef.current, at, Math.exp(-dy * 0.0015));
      requestDraw();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [requestDraw]);

  const updateHover = (p: Vec2) => {
    const w = toWorld(viewRef.current, p);
    const it = hitTest(items, w, 6 / viewRef.current.s);
    if (!it) {
      if (hover) setHover(null);
      if (hoveredRef.current) onHoverPart(null);
      return;
    }
    if (it.kind === 'part') {
      if (hoveredRef.current !== it.part.id) onHoverPart(it.part.id);
      setHover({ x: p.x, y: p.y, label: it.part.name });
    } else {
      if (hoveredRef.current) onHoverPart(null);
      setHover({ x: p.x, y: p.y, label: `${tr.canvas.openContour} — ${it.fileName}` });
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    canvasRef.current!.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, localPoint(e));
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = localPoint(e);
    const prev = pointers.current.get(e.pointerId);
    if (!prev) {
      if (e.pointerType === 'mouse') updateHover(p);
      return;
    }
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      let v = pan(viewRef.current, mid.x - pinchRef.current.mid.x, mid.y - pinchRef.current.mid.y);
      if (pinchRef.current.dist > 0) v = zoomAt(v, mid, d / pinchRef.current.dist);
      viewRef.current = v;
      pinchRef.current = { dist: d, mid };
    } else if (pointers.current.size === 1) {
      viewRef.current = pan(viewRef.current, p.x - prev.x, p.y - prev.y);
      if (hover) setHover(null);
    }
    requestDraw();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchRef.current = null;
  };

  const onPointerLeave = () => {
    setHover(null);
    if (hoveredRef.current) onHoverPart(null);
  };

  // Dokunmatikte çift dokunma → sığdır (dblclick mobilde güvenilir değil).
  const lastTap = useRef(0);
  const onTouchEnd = () => {
    const now = performance.now();
    if (now - lastTap.current < 300) fitView();
    lastTap.current = now;
  };

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden bg-slate-50">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        onDoubleClick={fitView}
        onTouchEnd={onTouchEnd}
      />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded bg-slate-900/90 px-2 py-1 text-xs text-white shadow"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          {hover.label}
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 left-2 hidden rounded bg-white/80 px-2 py-1 text-xs text-slate-500 sm:block">
        {tr.canvas.hint}
      </div>
      <button
        type="button"
        onClick={fitView}
        className="absolute right-2 top-2 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm hover:bg-slate-100"
      >
        {tr.canvas.fit}
      </button>
    </div>
  );
}
