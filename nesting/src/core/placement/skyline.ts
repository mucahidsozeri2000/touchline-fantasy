/**
 * Skyline dikdörtgen yerleştirici ("aşağı" yerçekimli çerçevede).
 * Genişlik W, yükseklik H olan bir şeritte her dikdörtgen, üst kenarı en
 * alçakta kalacak konuma (eşitlikte en solda) yerleşir. Skyline'ın altında
 * kalan boşluklar bir daha kullanılmaz — bu referans algoritmanın bilinen
 * zayıflığı; NFP tabanlı yerleştirme (M3) bunları değerlendirir.
 */

interface Seg {
  x: number;
  y: number;
  w: number;
}

const EPS = 1e-9;

export class Skyline {
  private segs: Seg[];
  constructor(
    readonly W: number,
    readonly H: number,
  ) {
    this.segs = [{ x: 0, y: 0, w: W }];
  }

  /** w×h için en iyi konum; sığmıyorsa null. */
  find(w: number, h: number): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    for (let i = 0; i < this.segs.length; i++) {
      const x = this.segs[i].x;
      if (x + w > this.W + EPS) break;
      let y = 0;
      let covered = 0;
      for (let j = i; j < this.segs.length && covered < w - EPS; j++) {
        y = Math.max(y, this.segs[j].y);
        covered = this.segs[j].x + this.segs[j].w - x;
      }
      if (y + h > this.H + EPS) continue;
      if (!best || y < best.y - EPS || (Math.abs(y - best.y) <= EPS && x < best.x)) best = { x, y };
    }
    return best;
  }

  place(x: number, y: number, w: number, h: number): void {
    const top = y + h;
    const next: Seg[] = [];
    for (const s of this.segs) {
      const s0 = s.x;
      const s1 = s.x + s.w;
      if (s1 <= x + EPS || s0 >= x + w - EPS) {
        next.push(s);
        continue;
      }
      if (s0 < x) next.push({ x: s0, y: s.y, w: x - s0 });
      if (s1 > x + w) next.push({ x: x + w, y: s.y, w: s1 - (x + w) });
    }
    next.push({ x, y: top, w });
    next.sort((a, b) => a.x - b.x);
    // Aynı yükseklikteki komşuları birleştir.
    const merged: Seg[] = [];
    for (const s of next) {
      const last = merged[merged.length - 1];
      if (last && Math.abs(last.y - s.y) <= EPS && Math.abs(last.x + last.w - s.x) <= EPS) last.w += s.w;
      else merged.push({ ...s });
    }
    this.segs = merged;
  }
}
