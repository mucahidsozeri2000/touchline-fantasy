/**
 * clipper-lib sarmalayıcısı.
 *
 * Clipper tamsayı koordinatlarla çalışır: 1 mm = CLIPPER_SCALE birim
 * (1000 → 1 µm çözünürlük). Tüm dönüşümler bu modülden geçer; başka yerde
 * ölçek sabiti kullanılmaz.
 */
import ClipperLib from 'clipper-lib';
import type { Ring } from './types';

export const CLIPPER_SCALE = 1000;

export type CPath = ClipperLib.Path;
export type CPaths = ClipperLib.Paths;

/** Delikli poligon: dış halka CCW, delikler CW. */
export interface ExPolygon {
  outer: Ring;
  holes: Ring[];
}

export const toClipper = (ring: Ring): CPath =>
  ring.map((p) => ({ X: Math.round(p.x * CLIPPER_SCALE), Y: Math.round(p.y * CLIPPER_SCALE) }));

export const fromClipper = (path: CPath): Ring => path.map((p) => ({ x: p.X / CLIPPER_SCALE, y: p.Y / CLIPPER_SCALE }));

export const exToClipper = (ex: ExPolygon): CPaths => [toClipper(ex.outer), ...ex.holes.map(toClipper)];

/** Alan (mm², işaretli; Clipper kuralı: dış halka pozitif). */
export const clipperArea = (path: CPath): number => ClipperLib.Clipper.Area(path) / (CLIPPER_SCALE * CLIPPER_SCALE);

/**
 * Kendini kesen / yönü karışık halkaları geçerli bir bölgeye çevirir
 * (çift-tek kuralı: dış + delikler doğru yorumlanır).
 */
export function normalizePaths(paths: CPaths): CPaths {
  return ClipperLib.Clipper.SimplifyPolygons(paths, ClipperLib.PolyFillType.pftEvenOdd);
}

/**
 * Bölgeyi `delta` mm kadar şişirir (negatifse daraltır). Dış sınır büyürken
 * delikler aynı miktarda küçülür — tek bir Minkowski işlemi.
 *
 * Birleşim tipi miter (limit 2): dışbükey köşelerde sonuç gerçek (yuvarlak)
 * offset'i İÇERİR, yani her zaman güvenli taraftadır, ve yuvarlak birleşimin
 * ürettiği onlarca ek köşeyi üretmez (NFP maliyeti köşe sayısıyla büyür).
 * Limit aşılan sivri köşeler delta uzaklığında kare kesilir; bu kesit
 * gerçek offset dairesine teğettir → yine güvenli.
 */
export function offsetPaths(paths: CPaths, delta: number): CPaths {
  if (delta === 0) return paths;
  const co = new ClipperLib.ClipperOffset(2);
  co.AddPaths(paths, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
  const out: CPaths = [];
  co.Execute(out, delta * CLIPPER_SCALE);
  return out;
}

/** Sonuç yollarını dış halkalar + delikler olarak gruplar. */
export function pathsToExPolygons(paths: CPaths): ExPolygon[] {
  const outers: { ring: Ring; path: CPath; holes: Ring[] }[] = [];
  const holes: CPath[] = [];
  for (const p of paths) {
    if (p.length < 3) continue;
    if (ClipperLib.Clipper.Orientation(p)) outers.push({ ring: fromClipper(p), path: p, holes: [] });
    else holes.push(p);
  }
  // Her deliği, onu içeren en küçük dış halkaya ata.
  outers.sort((a, b) => clipperArea(a.path) - clipperArea(b.path));
  for (const h of holes) {
    const probe = h[0];
    const owner = outers.find((o) => pointInPath(probe, o.path));
    (owner ?? outers[outers.length - 1])?.holes.push(fromClipper(h));
  }
  return outers.map((o) => ({ outer: o.ring, holes: o.holes }));
}

function pointInPath(pt: ClipperLib.IntPoint, path: CPath): boolean {
  let inside = false;
  for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
    const a = path[i];
    const b = path[j];
    if (a.Y > pt.Y !== b.Y > pt.Y && pt.X < ((b.X - a.X) * (pt.Y - a.Y)) / (b.Y - a.Y) + a.X) inside = !inside;
  }
  return inside;
}

/** İki bölgenin kesişim alanı (mm²). Çakışma doğrulaması için. */
export function intersectionArea(a: CPaths, b: CPaths): number {
  const c = new ClipperLib.Clipper();
  c.AddPaths(a, ClipperLib.PolyType.ptSubject, true);
  c.AddPaths(b, ClipperLib.PolyType.ptClip, true);
  const out: CPaths = [];
  c.Execute(ClipperLib.ClipType.ctIntersection, out, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return out.reduce((s, p) => s + clipperArea(p), 0);
}

/** a − b bölgesinin alanı (mm²). Sac dışına taşma kontrolü için. */
export function differenceArea(a: CPaths, b: CPaths): number {
  const c = new ClipperLib.Clipper();
  c.AddPaths(a, ClipperLib.PolyType.ptSubject, true);
  c.AddPaths(b, ClipperLib.PolyType.ptClip, true);
  const out: CPaths = [];
  c.Execute(ClipperLib.ClipType.ctDifference, out, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return out.reduce((s, p) => s + clipperArea(p), 0);
}
