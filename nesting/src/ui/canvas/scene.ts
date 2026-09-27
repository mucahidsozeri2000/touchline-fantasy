/**
 * Canvas sahnesi: çizilecek her şey dünya koordinatlarında (mm) hazırlanır.
 * Path2D'ler bir kez kurulur; her karede yalnızca ctx dönüşümü değişir.
 */
import type { ImportedPart, OpenContour } from '../../core/dxf/types';
import type { ExPolygon } from '../../core/geometry/clipper';
import { bboxOf } from '../../core/geometry/polygon';
import { applyPoint } from '../../core/geometry/transform';
import type { Affine, BBox, Ring, Vec2 } from '../../core/geometry/types';
import type { NestResult, SheetSpec } from '../../core/placement/types';
import { layoutGallery } from './gallery';

export interface ShapeItem {
  kind: 'shape';
  key: string;
  /** Vurgulama için parça tipi kimliği. */
  partId: string;
  label: string;
  colorIndex: number;
  /** Dünya koordinatında: [dış, ...delikler]. */
  rings: Ring[];
  box: BBox;
  path: Path2D;
  offsetPath?: Path2D;
}

export interface OpenItem {
  kind: 'open';
  key: string;
  label: string;
  polylines: Vec2[][];
  ends: Vec2[];
  box: BBox;
  path: Path2D;
}

export interface SheetFrame {
  outer: BBox;
  inner: BBox;
}

export interface Scene {
  items: (ShapeItem | OpenItem)[];
  sheet?: SheetFrame;
  bounds: BBox;
}

function ringsPath(rings: Ring[]): Path2D {
  const p = new Path2D();
  for (const r of rings) {
    r.forEach((q, i) => (i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)));
    p.closePath();
  }
  return p;
}

const mapRing = (m: Affine, r: Ring): Ring => r.map((p) => applyPoint(m, p));
const shift = (r: Ring, o: Vec2): Ring => r.map((p) => ({ x: p.x + o.x, y: p.y + o.y }));

/** M1 önizleme: parçalar ve açık konturlar yan yana. */
export function galleryScene(
  parts: { part: ImportedPart; colorIndex: number }[],
  openGroups: { fileName: string; contours: OpenContour[] }[],
  openLabel: string,
): Scene {
  const { items, bounds } = layoutGallery({ parts, openGroups });
  const out: Scene['items'] = items.map((it) => {
    if (it.kind === 'part') {
      const rings = [it.part.outer.ring, ...it.part.holes.map((h) => h.ring)].map((r) => shift(r, it.offset));
      return {
        kind: 'shape',
        key: it.part.id,
        partId: it.part.id,
        label: it.part.name,
        colorIndex: it.colorIndex,
        rings,
        box: it.box,
        path: ringsPath(rings),
      };
    }
    const polylines = it.contours.map((c) => shift(c.points, it.offset));
    const path = new Path2D();
    for (const pl of polylines) pl.forEach((q, i) => (i ? path.lineTo(q.x, q.y) : path.moveTo(q.x, q.y)));
    return {
      kind: 'open',
      key: `open:${it.fileName}`,
      label: `${openLabel} — ${it.fileName}`,
      polylines,
      ends: it.contours.flatMap((c) => [c.start, c.end].map((e) => ({ x: e.x + it.offset.x, y: e.y + it.offset.y }))),
      box: it.box,
      path,
    };
  });
  return { items: out, bounds };
}

/** Tek bir sacın yerleşimi. */
export function sheetScene(
  result: NestResult,
  sheetIndex: number,
  sheet: SheetSpec,
  parts: Map<string, ImportedPart>,
  colorOf: Map<string, number>,
  names: Record<string, string>,
): Scene {
  const layout = result.sheets[sheetIndex];
  const outer = { minX: 0, minY: 0, maxX: sheet.sizeX, maxY: sheet.sizeY };
  const m = sheet.margin;
  const inner = { minX: m, minY: m, maxX: sheet.sizeX - m, maxY: sheet.sizeY - m };
  const items: ShapeItem[] = [];
  layout?.placements.forEach((pl, i) => {
    const part = parts.get(pl.partId);
    if (!part) return; // parça sonradan silinmiş
    const rings = [part.outer.ring, ...part.holes.map((h) => h.ring)].map((r) => mapRing(pl.transform, r));
    const shape: ExPolygon | undefined = result.variantShapes[pl.partId]?.[pl.variant];
    items.push({
      kind: 'shape',
      key: `${pl.partId}#${pl.copy}#${i}`,
      partId: pl.partId,
      label: `${names[pl.partId] ?? part.name} #${pl.copy}`,
      colorIndex: colorOf.get(pl.partId) ?? 0,
      rings,
      box: bboxOf(rings[0]),
      path: ringsPath(rings),
      offsetPath: shape ? ringsPath([shape.outer, ...shape.holes].map((r) => shift(r, pl))) : undefined,
    });
  });
  return { items, sheet: { outer, inner }, bounds: outer };
}
