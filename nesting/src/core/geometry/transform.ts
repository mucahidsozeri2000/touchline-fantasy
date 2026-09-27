import type { Affine, Vec2 } from './types';

export const IDENTITY: Affine = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** Önce `second`'ı sonra `first`'ü değil — matematiksel sıra: sonuç(p) = m1(m2(p)). */
export function compose(m1: Affine, m2: Affine): Affine {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

export const translation = (x: number, y: number): Affine => ({ a: 1, b: 0, c: 0, d: 1, e: x, f: y });
export const scaling = (sx: number, sy: number): Affine => ({ a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 });
export function rotation(rad: number): Affine {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { a: c, b: s, c: -s, d: c, e: 0, f: 0 };
}

export const applyPoint = (m: Affine, p: Vec2): Vec2 => ({
  x: m.a * p.x + m.c * p.y + m.e,
  y: m.b * p.x + m.d * p.y + m.f,
});

/** Yalnız doğrusal kısım (öteleme yok) — yön vektörleri için. */
export const applyVector = (m: Affine, v: Vec2): Vec2 => ({
  x: m.a * v.x + m.c * v.y,
  y: m.b * v.x + m.d * v.y,
});

export const determinant = (m: Affine): number => m.a * m.d - m.b * m.c;

/**
 * Dönüşüm benzerlik dönüşümü mü (düzgün ölçek + dönüş + opsiyonel ayna)?
 * Benzerlik dönüşümünde daire/yay yine daire/yay kalır; aksi halde elipse döner.
 * Döndürür: düzgün ölçek katsayısı, değilse null.
 */
export function uniformScale(m: Affine, relTol = 1e-9): number | null {
  const sx = Math.hypot(m.a, m.b);
  const sy = Math.hypot(m.c, m.d);
  const orth = m.a * m.c + m.b * m.d;
  const s = Math.max(sx, sy);
  if (s === 0) return null;
  if (Math.abs(sx - sy) > relTol * s || Math.abs(orth) > relTol * s * s) return null;
  return sx;
}
