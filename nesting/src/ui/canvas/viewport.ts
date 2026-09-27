/**
 * Canvas görünüm dönüşümü (saf fonksiyonlar).
 * Dünya: mm, y yukarı. Ekran: CSS piksel, y aşağı.
 *   ekran.x =  x·s + ox
 *   ekran.y = −y·s + oy
 */
import type { BBox, Vec2 } from '../../core/geometry/types';

export interface Viewport {
  s: number;
  ox: number;
  oy: number;
}

export const MIN_SCALE = 1e-4;
export const MAX_SCALE = 500;

export const toScreen = (v: Viewport, p: Vec2): Vec2 => ({ x: p.x * v.s + v.ox, y: -p.y * v.s + v.oy });
export const toWorld = (v: Viewport, p: Vec2): Vec2 => ({ x: (p.x - v.ox) / v.s, y: -(p.y - v.oy) / v.s });

/** bbox'ı w×h alanına kenar boşluklu sığdırır. */
export function fit(b: BBox, w: number, h: number, padding = 24): Viewport {
  const bw = Math.max(b.maxX - b.minX, 1e-6);
  const bh = Math.max(b.maxY - b.minY, 1e-6);
  const s = clampScale(Math.min((w - 2 * padding) / bw, (h - 2 * padding) / bh));
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  return { s, ox: w / 2 - cx * s, oy: h / 2 + cy * s };
}

export const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

/** Ekrandaki `at` noktası sabit kalacak şekilde ölçeği `factor` ile çarpar. */
export function zoomAt(v: Viewport, at: Vec2, factor: number): Viewport {
  const s = clampScale(v.s * factor);
  const k = s / v.s;
  return { s, ox: at.x - (at.x - v.ox) * k, oy: at.y - (at.y - v.oy) * k };
}

export const pan = (v: Viewport, dx: number, dy: number): Viewport => ({ ...v, ox: v.ox + dx, oy: v.oy + dy });
