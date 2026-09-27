import type { NestMetrics, PreparedPart, SheetLayout, SheetSpec, Gravity } from './types';

export function computeMetrics(
  sheets: SheetLayout[],
  prepared: Map<string, PreparedPart>,
  sheet: SheetSpec,
  gravity: Gravity,
  totalCount: number,
): NestMetrics {
  const sheetArea = sheet.sizeX * sheet.sizeY;
  const partAreaOf = (layout: SheetLayout) =>
    layout.placements.reduce((s, p) => s + prepared.get(p.partId)!.part.area, 0);

  const placedPartArea = sheets.reduce((s, l) => s + partAreaOf(l), 0);
  const usedSheetArea = sheets.length * sheetArea;
  const last = sheets[sheets.length - 1];
  let lastSheetUsedLength = 0;
  if (last) {
    for (const p of last.placements) {
      const b = prepared.get(p.partId)!.variants[p.variant].bbox;
      lastSheetUsedLength = Math.max(lastSheetUsedLength, gravity === 'left' ? p.x + b.maxX : p.y + b.maxY);
    }
  }
  return {
    sheetCount: sheets.length,
    placedCount: sheets.reduce((s, l) => s + l.placements.length, 0),
    totalCount,
    placedPartArea,
    usedSheetArea,
    efficiency: usedSheetArea > 0 ? placedPartArea / usedSheetArea : 0,
    lastSheetEfficiency: last ? partAreaOf(last) / sheetArea : 0,
    lastSheetUsedLength,
    scrapArea: usedSheetArea - placedPartArea,
  };
}

/** Fire ağırlığı (kg): alan (mm²) × kalınlık (mm) × yoğunluk (g/cm³) / 10⁶. */
export const scrapWeightKg = (scrapAreaMm2: number, thicknessMm: number, densityGcm3: number): number =>
  (scrapAreaMm2 * thicknessMm * densityGcm3) / 1e6;
