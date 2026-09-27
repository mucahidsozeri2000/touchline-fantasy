/**
 * NURBS (rasyonel B-spline) değerlendirme ve uyarlamalı ayrıklaştırma.
 * Algoritma: de Boor, homojen koordinatlarda (ağırlıklar dahil).
 */
import type { Vec2 } from '../geometry/types';
import { distToSegment } from '../geometry/vec';

export interface NurbsCurve {
  degree: number;
  knots: number[];
  controlPoints: Vec2[];
  /** Boşsa tüm ağırlıklar 1 kabul edilir. */
  weights: number[];
}

/** Knot vektörünün tutarlı olup olmadığı: |knots| = |cp| + degree + 1. */
export function isValidNurbs(c: NurbsCurve): boolean {
  const n = c.controlPoints.length;
  if (c.degree < 1 || n < c.degree + 1) return false;
  if (c.knots.length !== n + c.degree + 1) return false;
  for (let i = 1; i < c.knots.length; i++) if (c.knots[i] < c.knots[i - 1]) return false;
  if (c.weights.length > 0 && c.weights.length !== n) return false;
  return true;
}

function findSpan(c: NurbsCurve, t: number): number {
  const p = c.degree;
  const n = c.controlPoints.length - 1;
  const U = c.knots;
  if (t >= U[n + 1]) return n;
  if (t <= U[p]) return p;
  let lo = p;
  let hi = n + 1;
  let mid = (lo + hi) >> 1;
  while (t < U[mid] || t >= U[mid + 1]) {
    if (t < U[mid]) hi = mid;
    else lo = mid;
    mid = (lo + hi) >> 1;
  }
  return mid;
}

export function evalNurbs(c: NurbsCurve, t: number): Vec2 {
  const p = c.degree;
  const U = c.knots;
  const k = findSpan(c, t);
  // d[j] = (w·x, w·y, w)
  const d: [number, number, number][] = [];
  for (let j = 0; j <= p; j++) {
    const cp = c.controlPoints[k - p + j];
    const w = c.weights.length ? c.weights[k - p + j] : 1;
    d.push([cp.x * w, cp.y * w, w]);
  }
  for (let r = 1; r <= p; r++) {
    for (let j = p; j >= r; j--) {
      const i = k - p + j;
      const denom = U[i + p - r + 1] - U[i];
      const a = denom === 0 ? 0 : (t - U[i]) / denom;
      d[j] = [
        (1 - a) * d[j - 1][0] + a * d[j][0],
        (1 - a) * d[j - 1][1] + a * d[j][1],
        (1 - a) * d[j - 1][2] + a * d[j][2],
      ];
    }
  }
  const [x, y, w] = d[p];
  return { x: x / w, y: y / w };
}

/**
 * Kiriş sapması ≤ tol olacak şekilde ayrıklaştırır.
 * Önce her knot aralığı sabit sayıda parçaya bölünür (düz görünen ama aslında
 * kıvrımlı bölümlerin orta nokta testinden kaçmasını önlemek için), sonra her
 * parça orta nokta sapmasına göre özyinelemeli bölünür.
 */
export function discretizeNurbs(c: NurbsCurve, tol: number): Vec2[] {
  const p = c.degree;
  const n = c.controlPoints.length - 1;
  const t0 = c.knots[p];
  const t1 = c.knots[n + 1];
  const perSpan = p === 1 ? 1 : 4;

  const params: number[] = [];
  for (let i = p; i <= n; i++) {
    const a = c.knots[i];
    const b = c.knots[i + 1];
    if (b <= a) continue;
    for (let j = 0; j < perSpan; j++) params.push(a + ((b - a) * j) / perSpan);
  }
  params.push(t1);
  if (params.length < 2) return [evalNurbs(c, t0), evalNurbs(c, t1)];

  const out: Vec2[] = [evalNurbs(c, params[0])];
  const refine = (ta: number, pa: Vec2, tb: number, pb: Vec2, depth: number) => {
    const tm = (ta + tb) / 2;
    const pm = evalNurbs(c, tm);
    // Çeyrek noktaları da kontrol et: S biçimli bölümlerde orta nokta kirişin
    // tam üzerine düşebilir.
    const q1 = evalNurbs(c, (ta + tm) / 2);
    const q3 = evalNurbs(c, (tm + tb) / 2);
    const dev = Math.max(distToSegment(pm, pa, pb), distToSegment(q1, pa, pb), distToSegment(q3, pa, pb));
    if (dev > tol && depth < 18) {
      refine(ta, pa, tm, pm, depth + 1);
      refine(tm, pm, tb, pb, depth + 1);
    } else {
      out.push(pb);
    }
  };
  for (let i = 1; i < params.length; i++) {
    refine(params[i - 1], out[out.length - 1], params[i], evalNurbs(c, params[i]), 0);
  }
  return out;
}
