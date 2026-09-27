/**
 * Kontur segment modeli.
 *
 * DXF entity'leri bu dört segment tipine indirgenir. Yaylar/elipsler analitik
 * olarak SAKLANIR (çıktıda yay olarak yazılabilmeleri için); poligon yaklaşımı
 * yalnızca geometri hesapları için `discretize` ile türetilir.
 */
import type { Affine, BBox, Vec2 } from '../geometry/types';
import { applyPoint, applyVector, determinant, uniformScale } from '../geometry/transform';
import { bboxOf, dist } from '../geometry';

interface SegBase {
  /** Kaynak entity kimliği. Aynı polyline'dan gelen segmentler aynı id'yi taşır. */
  source: number;
  layer: string;
}

export interface LineSeg extends SegBase {
  kind: 'line';
  a: Vec2;
  b: Vec2;
}

/** Dairesel yay. `sweep` işaretlidir: + CCW, − CW. |sweep| ≤ 2π (2π = tam daire). */
export interface ArcSeg extends SegBase {
  kind: 'arc';
  center: Vec2;
  radius: number;
  start: number;
  sweep: number;
}

/**
 * Elips yayı, eşlenik yarı çaplarla:  p(t) = c + u·cos t + v·sin t,
 * t ∈ [start, start+sweep]. Bu gösterim afin dönüşümler altında kapalıdır
 * (u, v sadece doğrusal kısımla çarpılır) — bu yüzden düzgün olmayan
 * ölçekli INSERT'lerde daireler de bu tipe dönüşür. u ⟂ v olması gerekmez.
 */
export interface EllipseSeg extends SegBase {
  kind: 'ellipse';
  center: Vec2;
  u: Vec2;
  v: Vec2;
  start: number;
  sweep: number;
}

/**
 * Zaten ayrıklaştırılmış eğri (SPLINE'lar). Noktalar kiriş toleransına
 * uygun üretilmiştir. R12 çıktısında SPLINE entity'si olmadığından bu
 * zaten nihai temsildir.
 */
export interface PolySeg extends SegBase {
  kind: 'poly';
  points: Vec2[];
}

export type Segment = LineSeg | ArcSeg | EllipseSeg | PolySeg;

const TAU = Math.PI * 2;

const arcPoint = (s: ArcSeg, t: number): Vec2 => ({
  x: s.center.x + s.radius * Math.cos(t),
  y: s.center.y + s.radius * Math.sin(t),
});

const ellipsePoint = (s: EllipseSeg, t: number): Vec2 => {
  const c = Math.cos(t);
  const n = Math.sin(t);
  return { x: s.center.x + s.u.x * c + s.v.x * n, y: s.center.y + s.u.y * c + s.v.y * n };
};

export function segStart(s: Segment): Vec2 {
  switch (s.kind) {
    case 'line':
      return s.a;
    case 'arc':
      return arcPoint(s, s.start);
    case 'ellipse':
      return ellipsePoint(s, s.start);
    case 'poly':
      return s.points[0];
  }
}

export function segEnd(s: Segment): Vec2 {
  switch (s.kind) {
    case 'line':
      return s.b;
    case 'arc':
      return arcPoint(s, s.start + s.sweep);
    case 'ellipse':
      return ellipsePoint(s, s.start + s.sweep);
    case 'poly':
      return s.points[s.points.length - 1];
  }
}

/** Geometrik orta nokta (yön değişse de aynı kalır — kopya tespiti için). */
export function segMid(s: Segment): Vec2 {
  switch (s.kind) {
    case 'line':
      return { x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2 };
    case 'arc':
      return arcPoint(s, s.start + s.sweep / 2);
    case 'ellipse':
      return ellipsePoint(s, s.start + s.sweep / 2);
    case 'poly': {
      // Yay uzunluğunun yarısındaki nokta.
      const pts = s.points;
      let total = 0;
      for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i]);
      let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const l = dist(pts[i - 1], pts[i]);
        if (acc + l >= total / 2 && l > 0) {
          const t = (total / 2 - acc) / l;
          return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
        }
        acc += l;
      }
      return pts[0];
    }
  }
}

export function reverseSeg(s: Segment): Segment {
  switch (s.kind) {
    case 'line':
      return { ...s, a: s.b, b: s.a };
    case 'arc':
      return { ...s, start: s.start + s.sweep, sweep: -s.sweep };
    case 'ellipse':
      return { ...s, start: s.start + s.sweep, sweep: -s.sweep };
    case 'poly':
      return { ...s, points: [...s.points].reverse() };
  }
}

/**
 * Segmente afin dönüşüm uygular.
 * - Yay + benzerlik dönüşümü → yay (ayna varsa sweep işareti döner).
 * - Yay + düzgün olmayan ölçek → elips (tam doğru; yaklaşım yok).
 */
export function transformSeg(s: Segment, m: Affine): Segment {
  switch (s.kind) {
    case 'line':
      return { ...s, a: applyPoint(m, s.a), b: applyPoint(m, s.b) };
    case 'poly':
      return { ...s, points: s.points.map((p) => applyPoint(m, p)) };
    case 'ellipse':
      return {
        ...s,
        center: applyPoint(m, s.center),
        u: applyVector(m, s.u),
        v: applyVector(m, s.v),
      };
    case 'arc': {
      const k = uniformScale(m);
      if (k !== null) {
        const c = applyPoint(m, s.center);
        const p0 = applyPoint(m, arcPoint(s, s.start));
        const sign = determinant(m) < 0 ? -1 : 1;
        return {
          ...s,
          center: c,
          radius: s.radius * k,
          start: Math.atan2(p0.y - c.y, p0.x - c.x),
          sweep: s.sweep * sign,
        };
      }
      return {
        kind: 'ellipse',
        source: s.source,
        layer: s.layer,
        center: applyPoint(m, s.center),
        u: applyVector(m, { x: s.radius, y: 0 }),
        v: applyVector(m, { x: 0, y: s.radius }),
        start: s.start,
        sweep: s.sweep,
      };
    }
  }
}

/**
 * Kiriş sapması (sagitta) ≤ tol olacak şekilde, r yarıçaplı yay için en büyük
 * açı adımı:  s = r·(1 − cos(θ/2)) ≤ tol  ⇒  θ ≤ 2·acos(1 − tol/r).
 * Çok küçük yarıçaplarda da kaba görünmemesi için adım en fazla π/4 (tam
 * dairede en az 8 segment).
 */
export function maxAngleStep(radius: number, tol: number): number {
  if (radius <= tol) return Math.PI / 4;
  return Math.min(Math.PI / 4, 2 * Math.acos(1 - tol / radius));
}

export function stepsFor(sweep: number, radius: number, tol: number): number {
  return Math.max(1, Math.ceil(Math.abs(sweep) / maxAngleStep(radius, tol) - 1e-9));
}

/**
 * Segmenti nokta dizisine çevirir (başlangıç ve bitiş dahil).
 * Noktalar gerçek eğri üzerindedir → poligon kirişleri eğrinin İÇ tarafında
 * kalır (dışbükey kısımlarda). Sapma ≤ tol. Nesting güvenliği için M2'de
 * offset'e bu tolerans eklenecek (README → Bilinen Kısıtlar).
 */
export function discretize(s: Segment, tol: number): Vec2[] {
  switch (s.kind) {
    case 'line':
      return [s.a, s.b];
    case 'poly':
      return s.points.slice();
    case 'arc': {
      const n = stepsFor(s.sweep, s.radius, tol);
      const out: Vec2[] = [];
      for (let i = 0; i <= n; i++) out.push(arcPoint(s, s.start + (s.sweep * i) / n));
      return out;
    }
    case 'ellipse': {
      // p''(t) = −(u cos t + v sin t) ⇒ |p''| ≤ √(|u|²+|v|²) = R.
      // Parametre adımı h için kiriş sapması ≤ R·h²/8 ≈ R(1−cos(h/2)),
      // yani R yarıçaplı daire formülü güvenli (üst sınır) bir adım verir.
      const R = Math.sqrt(s.u.x ** 2 + s.u.y ** 2 + s.v.x ** 2 + s.v.y ** 2);
      const n = stepsFor(s.sweep, R, tol);
      const out: Vec2[] = [];
      for (let i = 0; i <= n; i++) out.push(ellipsePoint(s, s.start + (s.sweep * i) / n));
      return out;
    }
  }
}

export function segBBox(s: Segment, tol: number): BBox {
  return bboxOf(discretize(s, tol));
}

/** DXF açı aralığını (CCW, start→end) işaretli sweep'e çevirir; eşitse tam tur. */
export function ccwSweep(start: number, end: number): number {
  let sw = (end - start) % TAU;
  if (sw < 0) sw += TAU;
  if (sw < 1e-12) sw = TAU;
  return sw;
}
