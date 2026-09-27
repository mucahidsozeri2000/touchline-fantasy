import type { BBox, Ring, Vec2 } from '../geometry/types';
import type { Segment } from './segments';
import type { UnitsInfo } from './units';

export interface ImportOptions {
  /** Uç nokta birleştirme toleransı (mm). */
  pointTolerance: number;
  /** Yay/eğri ayrıklaştırmada en büyük kiriş sapması (mm). */
  chordTolerance: number;
  /** $INSUNITS yerine zorla kullanılacak birim kodu (kullanıcı seçimi). */
  forceUnits?: number;
}

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  pointTolerance: 0.01,
  chordTolerance: 0.05,
};

/** Kapalı kontur: yönlendirilmiş segmentler + bunlardan türetilmiş poligon. */
export interface Contour {
  segments: Segment[];
  /** Ayrıklaştırılmış halka. Dış kontur CCW, delik CW. */
  ring: Ring;
}

export interface ImportedPart {
  /** Dosya içinde benzersiz (dosya adı + sıra). */
  id: string;
  name: string;
  /** Dış kontur. Parça yerel koordinatlarında: bbox sol-alt köşesi (0,0). */
  outer: Contour;
  holes: Contour[];
  bbox: BBox;
  /** Net alan (dış − delikler), mm². */
  area: number;
  /** Yerel (0,0) noktasının DXF'teki (mm'ye çevrilmiş) konumu. */
  origin: Vec2;
}

export interface OpenContour {
  /** DXF koordinatlarında (mm). */
  segments: Segment[];
  points: Vec2[];
  start: Vec2;
  end: Vec2;
}

/**
 * Uyarılar metin değil kod olarak döner; metinler arayüzde (i18n) üretilir.
 * core/ böylece dil bağımsız kalır.
 */
export type ImportWarning =
  | { code: 'UNITS_ASSUMED_MM' }
  | { code: 'UNITS_UNSUPPORTED'; insunits: number }
  | { code: 'OPEN_CONTOURS'; count: number }
  | { code: 'AMBIGUOUS_JUNCTIONS'; count: number; points: Vec2[] }
  | { code: 'DUPLICATES_REMOVED'; count: number }
  | { code: 'IGNORED_ENTITIES'; counts: Record<string, number> }
  | { code: 'SPLINE_FIT_POINTS_ONLY'; count: number }
  | { code: 'INVALID_ENTITIES'; counts: Record<string, number> }
  | { code: 'NON_PLANAR'; count: number }
  | { code: 'BLOCK_NOT_FOUND'; name: string }
  | { code: 'BLOCK_RECURSION'; name: string }
  | { code: 'XREF_SKIPPED'; name: string }
  | { code: 'NO_GEOMETRY' };

export interface DxfImportResult {
  parts: ImportedPart[];
  openContours: OpenContour[];
  warnings: ImportWarning[];
  units: UnitsInfo;
  stats: {
    entityCount: number;
    segmentCount: number;
    closedContourCount: number;
  };
}

export type ImportErrorCode = 'EMPTY_FILE' | 'PARSE_FAILED' | 'BINARY_DXF';

export class DxfImportError extends Error {
  constructor(
    readonly code: ImportErrorCode,
    readonly detail?: string,
  ) {
    super(`${code}${detail ? `: ${detail}` : ''}`);
    this.name = 'DxfImportError';
  }
}
