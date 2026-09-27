import type { BBox, Ring, Vec2 } from './types';
import { distToSegment } from './vec';

/** İşaretli alan (shoelace). CCW pozitif. */
export function signedArea(ring: Ring): number {
  let s = 0;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    s += (ring[j].x + ring[i].x) * (ring[j].y - ring[i].y);
  }
  return -s / 2;
}

export const area = (ring: Ring): number => Math.abs(signedArea(ring));

export function emptyBBox(): BBox {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

export function extendBBox(b: BBox, p: Vec2): void {
  if (p.x < b.minX) b.minX = p.x;
  if (p.y < b.minY) b.minY = p.y;
  if (p.x > b.maxX) b.maxX = p.x;
  if (p.y > b.maxY) b.maxY = p.y;
}

export function bboxOf(points: Iterable<Vec2>): BBox {
  const b = emptyBBox();
  for (const p of points) extendBBox(b, p);
  return b;
}

export function unionBBox(a: BBox, b: BBox): BBox {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export const bboxWidth = (b: BBox): number => b.maxX - b.minX;
export const bboxHeight = (b: BBox): number => b.maxY - b.minY;

export function bboxContains(outer: BBox, inner: BBox, tol = 0): boolean {
  return (
    inner.minX >= outer.minX - tol &&
    inner.minY >= outer.minY - tol &&
    inner.maxX <= outer.maxX + tol &&
    inner.maxY <= outer.maxY + tol
  );
}

/**
 * Nokta-poligon testi (ışın atma, çift-tek kuralı).
 * Sınıra `tol`'dan yakın noktalar için 0 döner — hiyerarşi kurarken
 * birbirine değen konturlarda yanlış karar vermemek için bu ayrım gerekli.
 * @returns 1 = içeride, -1 = dışarıda, 0 = sınırda
 */
export function pointInRing(p: Vec2, ring: Ring, tol = 0): 1 | 0 | -1 {
  const n = ring.length;
  if (tol > 0) {
    for (let i = 0, j = n - 1; i < n; j = i++) {
      if (distToSegment(p, ring[j], ring[i]) <= tol) return 0;
    }
  }
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.y > p.y !== b.y > p.y) {
      const xCross = ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
      if (p.x < xCross) inside = !inside;
    }
  }
  return inside ? 1 : -1;
}

export function translateRing(ring: Ring, dx: number, dy: number): Ring {
  return ring.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

/**
 * Ardışık, `tol`'dan yakın noktaları birleştirir; kapanış noktası ilk noktayla
 * çakışıyorsa onu da atar (Ring kuralı: kapanış örtüktür).
 */
export function dedupeRing(ring: Ring, tol: number): Ring {
  const out: Ring = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > tol) out.push(p);
  }
  while (out.length > 1) {
    const f = out[0];
    const l = out[out.length - 1];
    if (Math.hypot(f.x - l.x, f.y - l.y) <= tol) out.pop();
    else break;
  }
  return out;
}
