/**
 * M1 önizleme düzeni: içe aktarılan parçaları (ve açık kontur gruplarını)
 * canvas'ta üst üste binmeden görmek için basit raf (shelf) dizilimi.
 * Bu bir nesting DEĞİLDİR — yalnızca görüntüleme içindir.
 */
import type { ImportedPart, OpenContour } from '../../core/dxf/types';
import type { BBox, Vec2 } from '../../core/geometry/types';
import { bboxOf } from '../../core/geometry/polygon';

export type GalleryItem =
  | { kind: 'part'; part: ImportedPart; colorIndex: number; offset: Vec2; box: BBox }
  | { kind: 'open'; fileName: string; contours: OpenContour[]; offset: Vec2; box: BBox };

export interface GalleryInput {
  parts: { part: ImportedPart; colorIndex: number }[];
  openGroups: { fileName: string; contours: OpenContour[] }[];
}

export function layoutGallery(input: GalleryInput): { items: GalleryItem[]; bounds: BBox } {
  type Pre = { w: number; h: number; make: (offset: Vec2, box: BBox) => GalleryItem; local: BBox };
  const pre: Pre[] = [];
  for (const { part, colorIndex } of input.parts) {
    const b = part.bbox;
    pre.push({
      w: b.maxX - b.minX,
      h: b.maxY - b.minY,
      local: b,
      make: (offset, box) => ({ kind: 'part', part, colorIndex, offset, box }),
    });
  }
  for (const g of input.openGroups) {
    const b = bboxOf(g.contours.flatMap((c) => c.points));
    pre.push({
      w: b.maxX - b.minX,
      h: b.maxY - b.minY,
      local: b,
      make: (offset, box) => ({ kind: 'open', fileName: g.fileName, contours: g.contours, offset, box }),
    });
  }
  if (!pre.length) return { items: [], bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 } };

  const totalArea = pre.reduce((s, p) => s + (p.w + 1) * (p.h + 1), 0);
  const maxW = Math.max(...pre.map((p) => p.w));
  const sizes = pre.map((p) => Math.max(p.w, p.h)).sort((a, b) => a - b);
  const gap = Math.max(5, sizes[Math.floor(sizes.length / 2)] * 0.15);
  // Yaklaşık 16:10 bir alan hedefle.
  const rowWidth = Math.max(maxW, Math.sqrt(totalArea * 1.6) * 1.2);

  const items: GalleryItem[] = [];
  let x = 0;
  let y = 0; // satırın üst kenarı (aşağı doğru ilerler → negatif y)
  let rowH = 0;
  for (const p of pre) {
    if (x > 0 && x + p.w > rowWidth) {
      y -= rowH + gap;
      x = 0;
      rowH = 0;
    }
    // Öğenin yerel bbox'ının sol-üst köşesini (x, y)'ye getir.
    const offset = { x: x - p.local.minX, y: y - p.local.maxY };
    const box = { minX: x, minY: y - p.h, maxX: x + p.w, maxY: y };
    items.push(p.make(offset, box));
    x += p.w + gap;
    rowH = Math.max(rowH, p.h);
  }
  const bounds = items.reduce<BBox>(
    (b, it) => ({
      minX: Math.min(b.minX, it.box.minX),
      minY: Math.min(b.minY, it.box.minY),
      maxX: Math.max(b.maxX, it.box.maxX),
      maxY: Math.max(b.maxY, it.box.maxY),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
  return { items, bounds };
}
