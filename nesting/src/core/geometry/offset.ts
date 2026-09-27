/**
 * Parça ve sac offset'leri.
 *
 * Kural (spesifikasyon): her parça dışa  d = kerf/2 + boşluk/2  kadar şişirilir,
 * delikler aynı miktarda daralır; sac kenar payı kadar içe daralır. İki şişirilmiş
 * parça birbirine değdiğinde gerçek kesim kenarları arasında tam kerf + boşluk
 * kalır.
 *
 * Güvenlik payları (yerleşimde çakışma OLMAMASI için, hep şişirme yönünde):
 *  - Kiriş toleransı c: eğriler kirişlerle yaklaşıldığından poligon gerçek
 *    eğriden en fazla c içeride kalabilir.
 *  - Sadeleştirme toleransı s: Douglas–Peucker kirişleri de en fazla s içeri
 *    kesebilir (bkz. simplify.ts).
 * Bu yüzden: gerçek_parça ⊆ sade_poligon ⊕ (c + s) ve uygulanan offset
 *   D = d + c + s.
 * Sonuç her zaman "gerçek parça ⊕ d"yi kapsar; en fazla c + s (varsayılan
 * 0,15 mm) fazladan boşluk bırakır.
 */
import type { Ring } from './types';
import { type ExPolygon, exToClipper, normalizePaths, offsetPaths, pathsToExPolygons } from './clipper';
import { simplifyRing } from './simplify';
import { area, signedArea } from './polygon';

export interface OffsetOptions {
  /** d = kerf/2 + boşluk/2 (mm). */
  distance: number;
  /** Kiriş (ayrıklaştırma) toleransı c (mm). */
  chordTolerance: number;
  /** Douglas–Peucker toleransı s (mm). 0 = sadeleştirme yok. */
  simplifyTolerance: number;
}

export const totalOffset = (o: OffsetOptions): number => o.distance + o.chordTolerance + o.simplifyTolerance;

/**
 * Parçanın nesting'de kullanılacak (şişirilmiş, sadeleştirilmiş) bölgesi.
 * Birden fazla dış halka çıkarsa (olmamalı; şişirme birleştirir) en büyüğü
 * alınır.
 */
export function inflatePart(outer: Ring, holes: Ring[], o: OffsetOptions): ExPolygon {
  const s = o.simplifyTolerance;
  const rings = [outer, ...holes].map((r) => (s > 0 ? simplifyRing(r, s) : r));
  const paths = normalizePaths(exToClipper({ outer: rings[0], holes: rings.slice(1) }));
  const inflated = pathsToExPolygons(offsetPaths(paths, totalOffset(o)));
  if (!inflated.length) return orientEx({ outer, holes: [] });
  inflated.sort((a, b) => area(b.outer) - area(a.outer));
  return orientEx(inflated[0]);
}

/** Dış halka CCW, delikler CW. */
export function orientEx(ex: ExPolygon): ExPolygon {
  const outer = signedArea(ex.outer) < 0 ? [...ex.outer].reverse() : ex.outer;
  const holes = ex.holes.map((h) => (signedArea(h) > 0 ? [...h].reverse() : h));
  return { outer, holes };
}
