/**
 * Ön işlem: her parça tipi için şişirilmiş bölge BİR KEZ hesaplanır, sonra
 * izin verilen her (dönüş, ayna) kombinasyonu için varyant üretilir.
 * Aynı tipin tüm kopyaları aynı varyantları paylaşır.
 *
 * Offset, dönüşten ÖNCE yapılır: offset dönüş/aynaya göre değişmez
 * (Minkowski toplamı disk ile — izometrilerle yer değiştirir), yani sonuç
 * aynıdır ama Clipper işlemi tip başına bir kez çalışır.
 */
import type { ExPolygon } from '../geometry/clipper';
import { inflatePart, orientEx, totalOffset } from '../geometry/offset';
import { bboxOf } from '../geometry/polygon';
import { type Affine, type Ring } from '../geometry/types';
import { applyPoint, compose, rotation, scaling, translation } from '../geometry/transform';
import type { NestPart, NestSettings, PartVariant, PreparedPart } from './types';

export { expandRotations, type RotationMode } from './rotations';

const mapRing = (m: Affine, r: Ring): Ring => r.map((p) => applyPoint(m, p));

function transformEx(m: Affine, ex: ExPolygon): ExPolygon {
  // Ayna yönleri tersine çevirir → yeniden yönlendir.
  return orientEx({ outer: mapRing(m, ex.outer), holes: ex.holes.map((h) => mapRing(m, h)) });
}

export function preparePart(part: NestPart, settings: NestSettings): PreparedPart {
  const opts = {
    distance: settings.kerf / 2 + settings.gap / 2,
    chordTolerance: settings.chordTolerance,
    simplifyTolerance: settings.simplifyTolerance,
  };
  const base = inflatePart(part.outer, part.holes, opts);
  const angles = part.rotations.length ? part.rotations : [0];
  const variants: PartVariant[] = [];
  for (const mirrored of part.allowMirror ? [false, true] : [false]) {
    for (const deg of angles) {
      // Önce ayna (x → −x), sonra dönüş, sonra bbox'ı orijine taşı.
      let m = compose(rotation((deg * Math.PI) / 180), mirrored ? scaling(-1, 1) : scaling(1, 1));
      const b = bboxOf(transformEx(m, base).outer);
      m = compose(translation(-b.minX, -b.minY), m);
      const shape = transformEx(m, base);
      variants.push({ rotation: deg, mirrored, shape, bbox: bboxOf(shape.outer), transform: m });
    }
  }
  return { part, variants, offset: totalOffset(opts) };
}
