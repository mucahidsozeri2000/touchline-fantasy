/**
 * Dönüş seçenekleri. Ayrı modül: arayüz bunu kullanır ve clipper-lib'i
 * (yalnızca worker'da gereken ağır kütüphane) ana bundle'a çekmemelidir.
 */
export type RotationMode = 'none' | 'half' | 'quarter' | 'free';

/** Arayüzdeki dönüş seçeneğini açı listesine çevirir. */
export function expandRotations(mode: RotationMode, stepDeg = 15): number[] {
  switch (mode) {
    case 'none':
      return [0];
    case 'half':
      return [0, 180];
    case 'quarter':
      return [0, 90, 180, 270];
    case 'free': {
      const step = Math.min(180, Math.max(1, stepDeg));
      const out: number[] = [];
      for (let a = 0; a < 360 - 1e-9; a += step) out.push(Math.round(a * 1e6) / 1e6);
      return out;
    }
  }
}
