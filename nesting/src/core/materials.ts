/**
 * Malzeme yoğunlukları (g/cm³). Şimdilik yalnızca rapor ve fire ağırlığı
 * için kullanılır. Görünen adlar i18n'dedir.
 */
export const MATERIALS = [
  { id: 'dkp', density: 7.85 },
  { id: 'galvaniz', density: 7.85 },
  { id: 'paslanmaz304', density: 7.93 },
  { id: 'aluminyum', density: 2.7 },
  { id: 'bakir', density: 8.96 },
  { id: 'pirinc', density: 8.5 },
] as const;

export type MaterialId = (typeof MATERIALS)[number]['id'];

export const densityOf = (id: MaterialId): number => MATERIALS.find((m) => m.id === id)?.density ?? 7.85;
