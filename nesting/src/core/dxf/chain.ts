/**
 * Segment zincirleme: sırasız, ters yönlü ve uçları tolerans içinde
 * birbirine değen segmentlerden kapalı konturlar ve açık zincirler üretir.
 *
 * Yöntem:
 *  1. Dejenere (tolerans altı boyutlu) segmentler atılır.
 *  2. Üst üste binen kopya segmentler ayıklanır (DXF'lerde çok yaygın).
 *  3. Uç noktalar, hücre boyu = tolerans olan bir ızgaraya konur; bir noktanın
 *     tolerans içindeki komşuları 3×3 hücrede aranır → toplam O(n).
 *  4. Açgözlü yürüyüş: her serbest segmentten başlayıp ucuna değen serbest
 *     segmenti ekle (gerekirse ters çevir). Aday seçiminde önce aynı kaynak
 *     entity'den gelen segment (bir polyline'ın kendi devamı), sonra en yakın
 *     uç tercih edilir. Uç başlangıca geri değince kontur kapanır.
 *  5. İkiden fazla ucun buluştuğu düğümler "belirsiz kavşak" olarak raporlanır:
 *     açgözlü seçim burada tahmindir, kullanıcı çizimi kontrol etmelidir.
 */
import type { Vec2 } from '../geometry/types';
import { dist } from '../geometry/vec';
import { type Segment, discretize, reverseSeg, segEnd, segMid, segStart } from './segments';

export interface ChainResult {
  /** Kapalı zincirler (segmentler uç uca yönlendirilmiş). */
  closed: Segment[][];
  open: Segment[][];
  duplicatesRemoved: number;
  ambiguousPoints: Vec2[];
}

/** Tolerans boyutlu hücrelere sahip uzamsal hash. */
export class PointGrid<T> {
  private readonly cells = new Map<string, { p: Vec2; item: T }[]>();
  constructor(private readonly cell: number) {}
  private key(ix: number, iy: number) {
    return `${ix},${iy}`;
  }
  insert(p: Vec2, item: T) {
    const k = this.key(Math.floor(p.x / this.cell), Math.floor(p.y / this.cell));
    let arr = this.cells.get(k);
    if (!arr) this.cells.set(k, (arr = []));
    arr.push({ p, item });
  }
  /** p'ye `radius` (≤ hücre boyu) içindeki tüm öğeler. */
  query(p: Vec2, radius: number): { p: Vec2; item: T; d: number }[] {
    const ix = Math.floor(p.x / this.cell);
    const iy = Math.floor(p.y / this.cell);
    const out: { p: Vec2; item: T; d: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const arr = this.cells.get(this.key(ix + dx, iy + dy));
        if (!arr) continue;
        for (const e of arr) {
          const d = dist(p, e.p);
          if (d <= radius) out.push({ ...e, d });
        }
      }
    }
    return out;
  }
}

interface Info {
  seg: Segment;
  start: Vec2;
  end: Vec2;
  selfClosed: boolean;
}

export function chainSegments(input: Segment[], tol: number, chordTol: number): ChainResult {
  // Izgara hücresi toleranstan küçük olamaz; sıfır toleransta bile sayısal
  // gürültüyü yakalamak için alt sınır.
  const cell = Math.max(tol, 1e-9);

  // 1. Dejenere segmentleri at, kendi üzerine kapanan (tam daire vb.) olanları işaretle.
  const infos: Info[] = [];
  for (const seg of input) {
    const pts = discretize(seg, chordTol);
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    if (Math.hypot(maxX - minX, maxY - minY) <= tol) continue;
    const start = segStart(seg);
    const end = segEnd(seg);
    infos.push({ seg, start, end, selfClosed: dist(start, end) <= tol });
  }

  // 2. Kopyaları ayıkla: aynı tip, aynı orta nokta ve aynı uç çifti (her iki yön).
  const midGrid = new PointGrid<number>(cell);
  const unique: Info[] = [];
  let duplicatesRemoved = 0;
  for (const info of infos) {
    const mid = segMid(info.seg);
    const dup = midGrid.query(mid, tol).some(({ item }) => {
      const o = unique[item];
      if (o.seg.kind !== info.seg.kind) return false;
      const same = dist(o.start, info.start) <= tol && dist(o.end, info.end) <= tol;
      const rev = dist(o.start, info.end) <= tol && dist(o.end, info.start) <= tol;
      return same || rev;
    });
    if (dup) {
      duplicatesRemoved++;
      continue;
    }
    midGrid.insert(mid, unique.length);
    unique.push(info);
  }

  const closed: Segment[][] = [];
  const open: Segment[][] = [];
  const used = new Array<boolean>(unique.length).fill(false);

  // 3. Uç noktaları ızgaraya koy. item = segIndex*2 + (0: başlangıç, 1: bitiş)
  const endGrid = new PointGrid<number>(cell);
  unique.forEach((info, i) => {
    if (info.selfClosed) {
      used[i] = true;
      closed.push([info.seg]);
      return;
    }
    endGrid.insert(info.start, i * 2);
    endGrid.insert(info.end, i * 2 + 1);
  });

  // 5. Kavşak tespiti (zincirlemeden bağımsız, düğüm derecesine göre).
  const ambiguousPoints: Vec2[] = [];
  const reportGrid = new PointGrid<true>(cell);
  for (const info of unique) {
    if (info.selfClosed) continue;
    for (const p of [info.start, info.end]) {
      if (endGrid.query(p, tol).length > 2 && reportGrid.query(p, tol).length === 0) {
        reportGrid.insert(p, true);
        ambiguousPoints.push(p);
      }
    }
  }

  // 4. Açgözlü yürüyüş.
  const pickNext = (p: Vec2, preferSource: number): { idx: number; reversed: boolean } | null => {
    let best: { idx: number; reversed: boolean; d: number; same: boolean } | null = null;
    for (const c of endGrid.query(p, tol)) {
      const idx = c.item >> 1;
      if (used[idx]) continue;
      const same = unique[idx].seg.source === preferSource;
      if (!best || (same && !best.same) || (same === best.same && c.d < best.d)) {
        // Uç "bitiş" ucuysa segmenti ters çevirerek ekleriz.
        best = { idx, reversed: (c.item & 1) === 1, d: c.d, same };
      }
    }
    return best ? { idx: best.idx, reversed: best.reversed } : null;
  };

  for (let i = 0; i < unique.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const chain: Segment[] = [unique[i].seg];
    const chainStart = () => segStart(chain[0]);
    const chainEnd = () => segEnd(chain[chain.length - 1]);
    let isClosed = false;

    // İleri yönde uzat.
    for (;;) {
      if (chain.length >= 2 && dist(chainEnd(), chainStart()) <= tol) {
        isClosed = true;
        break;
      }
      const nx = pickNext(chainEnd(), chain[chain.length - 1].source);
      if (!nx) break;
      used[nx.idx] = true;
      const s = unique[nx.idx].seg;
      // pickNext'in "reversed" bayrağı: değen uç segmentin bitişi → ters çevir.
      chain.push(nx.reversed ? reverseSeg(s) : s);
    }

    // Kapanmadıysa geri yönde uzat (başlangıç ucundan).
    if (!isClosed) {
      for (;;) {
        const nx = pickNext(chainStart(), chain[0].source);
        if (!nx) break;
        used[nx.idx] = true;
        const s = unique[nx.idx].seg;
        // Başa ekliyoruz: değen uç segmentin BİTİŞİ olmalı → bitişse olduğu gibi.
        chain.unshift(nx.reversed ? s : reverseSeg(s));
        if (dist(chainEnd(), chainStart()) <= tol) {
          isClosed = true;
          break;
        }
      }
    }
    (isClosed ? closed : open).push(chain);
  }

  return { closed, open, duplicatesRemoved, ambiguousPoints };
}

/**
 * Zincirden kapalı halka noktaları: her segmentin ilk noktası bir öncekinin
 * son noktasıyla (tolerans içinde) çakıştığından atlanır → uçlar "yapışır".
 */
export function chainToPoints(chain: Segment[], chordTol: number): Vec2[] {
  const out: Vec2[] = [];
  chain.forEach((s, i) => {
    const pts = discretize(s, chordTol);
    for (let k = i === 0 ? 0 : 1; k < pts.length; k++) out.push(pts[k]);
  });
  return out;
}
