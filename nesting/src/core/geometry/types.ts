/**
 * Temel geometri tipleri. Tüm koordinatlar milimetredir (iç birim).
 *
 * Eksen kuralı: CAD ile aynı — x sağa, y yukarı. Açılar radyan, saat yönü
 * tersi (CCW) pozitif. Ekrana çizim sırasında y ekseni ters çevrilir.
 */

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Kapalı poligon halkası. Son nokta ilk noktayı TEKRARLAMAZ; kapanış örtüktür.
 * Yön kuralı (normalize edildikten sonra): dış kontur CCW (pozitif alan),
 * delik CW (negatif alan).
 */
export type Ring = Vec2[];

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * 2B afin dönüşüm:  x' = a·x + c·y + e,  y' = b·x + d·y + f
 * (SVG/Canvas matrix sırasıyla aynı: [a b c d e f]).
 */
export interface Affine {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}
