/**
 * Yerleşim doğrulaması — HER nesting sonucunda çalışır.
 *  - Hiçbir iki parçanın şişirilmiş bölgesi (offset dahil) kesişmemeli.
 *  - Hiçbir şişirilmiş bölge sacın kenar payı içindeki alanın dışına taşmamalı.
 * Alan eşiği: koordinatlar 1 µm'ye yuvarlandığından, birbirine tam değen iki
 * parça arasında sayısal olarak ~µm genişliğinde şeritler oluşabilir; bunlar
 * çakışma sayılmaz.
 */
import { type CPaths, differenceArea, exToClipper, intersectionArea, toClipper } from '../geometry/clipper';
import { bboxOf } from '../geometry/polygon';
import type { BBox } from '../geometry/types';
import type { PreparedPart, SheetLayout, SheetSpec, ValidationIssue } from './types';

export const OVERLAP_AREA_EPS = 0.01; // mm²

export function placedShape(prep: PreparedPart, variant: number, x: number, y: number) {
  const sh = prep.variants[variant].shape;
  const move = (r: typeof sh.outer) => r.map((p) => ({ x: p.x + x, y: p.y + y }));
  return { outer: move(sh.outer), holes: sh.holes.map(move) };
}

export function validateLayout(sheets: SheetLayout[], prepared: Map<string, PreparedPart>, sheet: SheetSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const m = sheet.margin;
  const inner = { minX: m, minY: m, maxX: sheet.sizeX - m, maxY: sheet.sizeY - m };
  const innerPath: CPaths = [
    toClipper([
      { x: inner.minX, y: inner.minY },
      { x: inner.maxX, y: inner.minY },
      { x: inner.maxX, y: inner.maxY },
      { x: inner.minX, y: inner.maxY },
    ]),
  ];

  sheets.forEach((layout, si) => {
    const shapes = layout.placements.map((p) => {
      const prep = prepared.get(p.partId)!;
      const ex = placedShape(prep, p.variant, p.x, p.y);
      return { paths: exToClipper(ex), box: bboxOf(ex.outer) };
    });
    shapes.forEach((s, i) => {
      if (!boxInside(s.box, inner, 1e-3)) {
        const out = differenceArea(s.paths, innerPath);
        if (out > OVERLAP_AREA_EPS) issues.push({ code: 'OUT_OF_SHEET', sheet: si, index: i, area: out });
      }
    });
    for (let i = 0; i < shapes.length; i++) {
      for (let j = i + 1; j < shapes.length; j++) {
        if (!boxesOverlap(shapes[i].box, shapes[j].box)) continue;
        const a = intersectionArea(shapes[i].paths, shapes[j].paths);
        if (a > OVERLAP_AREA_EPS) issues.push({ code: 'OVERLAP', sheet: si, a: i, b: j, area: a });
      }
    }
  });
  return issues;
}

const boxInside = (b: BBox, o: BBox, tol: number) =>
  b.minX >= o.minX - tol && b.minY >= o.minY - tol && b.maxX <= o.maxX + tol && b.maxY <= o.maxY + tol;

const boxesOverlap = (a: BBox, b: BBox) => a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;
