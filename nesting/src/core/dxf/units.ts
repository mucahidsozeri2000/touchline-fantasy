/**
 * DXF $INSUNITS → milimetre çarpanı.
 * Kod tablosu: AutoCAD DXF Reference, HEADER section, $INSUNITS.
 */

const MM_PER_UNIT: Record<number, number> = {
  1: 25.4,
  2: 304.8,
  4: 1,
  5: 10,
  6: 1000,
  8: 25.4e-6,
  9: 0.0254,
  10: 914.4,
  13: 0.001,
  14: 100,
};

export interface UnitsInfo {
  /** Dosyadaki $INSUNITS değeri (yoksa null). */
  insunits: number | null;
  /** Kullanılan birim kodu (zorlanmışsa zorlanan değer). */
  used: number;
  /** Dosya birimi → mm çarpanı. */
  scale: number;
  /** Birim dosyadan okunamadı ve mm varsayıldı. */
  assumed: boolean;
  /** Dosyada tanımlı ama desteklenmeyen bir birim vardı. */
  unsupported: boolean;
}

export function resolveUnits(insunits: number | null, force?: number): UnitsInfo {
  if (force !== undefined && MM_PER_UNIT[force]) {
    return { insunits, used: force, scale: MM_PER_UNIT[force], assumed: false, unsupported: false };
  }
  if (insunits !== null && MM_PER_UNIT[insunits]) {
    return { insunits, used: insunits, scale: MM_PER_UNIT[insunits], assumed: false, unsupported: false };
  }
  // 0 = "birimsiz" ve tanımsız: mm varsay (spesifikasyon gereği) ve uyar.
  return {
    insunits,
    used: 4,
    scale: 1,
    assumed: true,
    unsupported: insunits !== null && insunits !== 0,
  };
}

export const SUPPORTED_UNIT_CODES = Object.keys(MM_PER_UNIT).map(Number);
