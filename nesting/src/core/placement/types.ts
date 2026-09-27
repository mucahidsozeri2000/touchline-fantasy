/**
 * Nesting girdi/çıktı tipleri. Tüm aşamalar (M2 bbox yerleştirme, M3 NFP,
 * M4 GA) aynı sözleşmeyi kullanır.
 *
 * Sac koordinatları: sol-alt köşe (0,0); X ekseni sacın UZUNLUĞU (sizeX),
 * Y ekseni GENİŞLİĞİ (sizeY). "1000 × 2000" şablonu = genişlik 1000, uzunluk
 * 2000. Varsayılan yerçekimi "sola" (önce en küçük x): parçalar X ekseni
 * boyunca birikir, artan kısım sacın sağ ucunda tek parça şerit olarak kalır.
 */
import type { ExPolygon } from '../geometry/clipper';
import type { Affine, BBox, Ring } from '../geometry/types';

export type Gravity = 'left' | 'down';

export interface SheetSpec {
  /** Uzunluk (X), mm. */
  sizeX: number;
  /** Genişlik (Y), mm. */
  sizeY: number;
  /** Kullanılabilir sac adedi; null = sınırsız. */
  count: number | null;
  /** Kenar payı (mm): sac her kenardan bu kadar içe daraltılır. */
  margin: number;
}

export interface NestPart {
  id: string;
  name: string;
  /** Parça yerel koordinatlarında gerçek (şişirilmemiş) geometri. */
  outer: Ring;
  holes: Ring[];
  /** Net alan (mm²). */
  area: number;
  quantity: number;
  /** İzin verilen dönüş açıları (derece). */
  rotations: number[];
  allowMirror: boolean;
  /** Büyük olan önce yerleşir. */
  priority: number;
}

export interface NestSettings {
  /** Parçalar arası boşluk (mm). */
  gap: number;
  /** Kesim genişliği (mm). */
  kerf: number;
  gravity: Gravity;
  /** Douglas–Peucker toleransı (mm). */
  simplifyTolerance: number;
  /** İçe aktarmadaki kiriş toleransı (mm) — güvenlik payına eklenir. */
  chordTolerance: number;
}

export interface NestInput {
  parts: NestPart[];
  sheet: SheetSpec;
  settings: NestSettings;
}

export interface PartVariant {
  rotation: number;
  mirrored: boolean;
  /** Şişirilmiş bölge, bbox sol-alt = (0,0). */
  shape: ExPolygon;
  bbox: BBox;
  /** Parça yerel koordinatı → varyant koordinatı. */
  transform: Affine;
}

export interface PreparedPart {
  part: NestPart;
  variants: PartVariant[];
  /** Uygulanan toplam offset D (mm). */
  offset: number;
}

export interface Placement {
  partId: string;
  /** 1'den başlayan kopya numarası. */
  copy: number;
  variant: number;
  rotation: number;
  mirrored: boolean;
  /** Varyant koordinatının sacdaki ötelemesi. */
  x: number;
  y: number;
  /** Parça yerel koordinatı → sac koordinatı (çizim ve DXF çıktısı için). */
  transform: Affine;
}

export interface SheetLayout {
  placements: Placement[];
}

export type UnplacedReason = 'TOO_LARGE' | 'NO_SHEET_LEFT';

export interface Unplaced {
  partId: string;
  copy: number;
  reason: UnplacedReason;
}

export interface NestMetrics {
  sheetCount: number;
  placedCount: number;
  totalCount: number;
  /** Yerleşen parçaların net alan toplamı (mm²). */
  placedPartArea: number;
  /** Kullanılan sacların toplam alanı (mm²). */
  usedSheetArea: number;
  /** placedPartArea / usedSheetArea (0..1). */
  efficiency: number;
  /** Son sacdaki parça alanı / sac alanı (0..1). */
  lastSheetEfficiency: number;
  /** Son sacta yerçekimi yönünde kullanılan uzunluk (mm, sac kenarından). */
  lastSheetUsedLength: number;
  /** usedSheetArea − placedPartArea (mm²). */
  scrapArea: number;
}

export type ValidationIssue =
  | { code: 'OVERLAP'; sheet: number; a: number; b: number; area: number }
  | { code: 'OUT_OF_SHEET'; sheet: number; index: number; area: number };

export interface NestResult {
  sheets: SheetLayout[];
  unplaced: Unplaced[];
  metrics: NestMetrics;
  /** Boş olmalı; doluysa yerleştirme algoritmasında hata vardır. */
  validation: ValidationIssue[];
  elapsedMs: number;
  /** Çizim için: parça id → varyant şişirilmiş bölgeleri (Placement.variant ile indekslenir). */
  variantShapes: Record<string, ExPolygon[]>;
}
