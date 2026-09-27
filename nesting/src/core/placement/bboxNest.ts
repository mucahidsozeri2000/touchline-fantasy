/**
 * M2 referans yerleştirme: şişirilmiş parçaların SINIRLAYICI KUTULARINI
 * skyline ile yerleştirir. Hızlı ve her zaman geçerli (kutular çakışmıyorsa
 * içlerindeki şekiller de çakışmaz) ama kutu içindeki boşlukları kullanamaz.
 * NFP tabanlı yerleştirme (M3) bununla kıyaslanacak.
 *
 * Yerçekimi "sola" ise problem transpoze edilir: çerçevede u = y, v = x,
 * böylece skyline'ın "en alçak" kuralı sacda "en sol"a karşılık gelir.
 * Transpoze yalnızca kutu boyutlarına uygulanır; şekillerin kendisi
 * aynalanmaz.
 */
import { compose, translation } from '../geometry/transform';
import { computeMetrics } from './metrics';
import { preparePart } from './prepare';
import { Skyline } from './skyline';
import type { NestInput, NestResult, Placement, PreparedPart, SheetLayout, Unplaced } from './types';
import { validateLayout } from './validate';

interface Item {
  prep: PreparedPart;
  copy: number;
}

/** Yerleştirme sırası: öncelik (büyük önce), sonra şişirilmiş alan (büyük önce). */
export function defaultOrder(prepared: PreparedPart[]): Item[] {
  const items: Item[] = [];
  for (const prep of prepared) for (let c = 1; c <= prep.part.quantity; c++) items.push({ prep, copy: c });
  const key = (p: PreparedPart) => {
    const b = p.variants[0].bbox;
    return b.maxX * b.maxY;
  };
  return items.sort((a, b) => b.prep.part.priority - a.prep.part.priority || key(b.prep) - key(a.prep));
}

export function bboxNest(input: NestInput, now: () => number = () => performance.now()): NestResult {
  const t0 = now();
  const { sheet, settings } = input;
  const prepared = new Map<string, PreparedPart>();
  for (const part of input.parts) if (part.quantity > 0) prepared.set(part.id, preparePart(part, settings));

  const m = sheet.margin;
  const usableX = sheet.sizeX - 2 * m;
  const usableY = sheet.sizeY - 2 * m;
  const left = settings.gravity === 'left';
  // Çerçeve boyutları: W = "yatay", H = yerçekimi ekseni.
  const W = left ? usableY : usableX;
  const H = left ? usableX : usableY;
  const frameDims = (w: number, h: number) => (left ? { fw: h, fh: w } : { fw: w, fh: h });

  const sheets: { layout: SheetLayout; sky: Skyline }[] = [];
  const unplaced: Unplaced[] = [];
  const items = defaultOrder([...prepared.values()]);

  const tryPlace = (sky: Skyline, prep: PreparedPart) => {
    let best: { v: number; fx: number; fy: number; top: number } | null = null;
    prep.variants.forEach((v, vi) => {
      const { fw, fh } = frameDims(v.bbox.maxX, v.bbox.maxY);
      const pos = sky.find(fw, fh);
      if (!pos) return;
      const top = pos.y + fh;
      if (!best || top < best.top - 1e-9 || (Math.abs(top - best.top) <= 1e-9 && pos.x < best.fx)) {
        best = { v: vi, fx: pos.x, fy: pos.y, top };
      }
    });
    return best as { v: number; fx: number; fy: number; top: number } | null;
  };

  const fitsEmpty = (prep: PreparedPart) =>
    prep.variants.some((v) => {
      const { fw, fh } = frameDims(v.bbox.maxX, v.bbox.maxY);
      return fw <= W + 1e-9 && fh <= H + 1e-9;
    });

  for (const { prep, copy } of items) {
    if (!fitsEmpty(prep)) {
      unplaced.push({ partId: prep.part.id, copy, reason: 'TOO_LARGE' });
      continue;
    }
    let target: { s: (typeof sheets)[number]; pos: NonNullable<ReturnType<typeof tryPlace>> } | null = null;
    for (const s of sheets) {
      const pos = tryPlace(s.sky, prep);
      if (pos) {
        target = { s, pos };
        break;
      }
    }
    if (!target) {
      if (sheet.count !== null && sheets.length >= sheet.count) {
        unplaced.push({ partId: prep.part.id, copy, reason: 'NO_SHEET_LEFT' });
        continue;
      }
      const s = { layout: { placements: [] }, sky: new Skyline(W, H) };
      sheets.push(s);
      target = { s, pos: tryPlace(s.sky, prep)! };
    }
    const { s, pos } = target;
    const v = prep.variants[pos.v];
    const { fw, fh } = frameDims(v.bbox.maxX, v.bbox.maxY);
    s.sky.place(pos.fx, pos.fy, fw, fh);
    const x = m + (left ? pos.fy : pos.fx);
    const y = m + (left ? pos.fx : pos.fy);
    const placement: Placement = {
      partId: prep.part.id,
      copy,
      variant: pos.v,
      rotation: v.rotation,
      mirrored: v.mirrored,
      x,
      y,
      transform: compose(translation(x, y), v.transform),
    };
    s.layout.placements.push(placement);
  }

  const layouts = sheets.map((s) => s.layout);
  const totalCount = items.length;
  return {
    sheets: layouts,
    unplaced,
    metrics: computeMetrics(layouts, prepared, sheet, settings.gravity, totalCount),
    validation: validateLayout(layouts, prepared, sheet),
    elapsedMs: now() - t0,
    variantShapes: Object.fromEntries([...prepared].map(([id, p]) => [id, p.variants.map((v) => v.shape)])),
  };
}
