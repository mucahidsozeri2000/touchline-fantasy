/**
 * Parça tipi renkleri: altın açı ile dağıtılmış tonlar → komşu indeksler
 * birbirinden belirgin farklı. Kırmızı tonlar (açık kontur/hata rengi) atlanır.
 */
export function partHue(index: number): number {
  let h = (index * 137.508 + 200) % 360;
  if (h < 20 || h > 340) h = (h + 40) % 360;
  return h;
}

export const partFill = (i: number, alpha = 0.35) => `hsla(${partHue(i)}, 70%, 55%, ${alpha})`;
export const partStroke = (i: number) => `hsl(${partHue(i)}, 70%, 35%)`;

export const ERROR_COLOR = '#dc2626';
