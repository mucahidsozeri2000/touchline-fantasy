/**
 * Kontur hiyerarşisi.
 *
 * Her kapalı kontur, kendisini içeren EN KÜÇÜK konturun çocuğu olur.
 * Derinlik çiftse (0, 2, 4...) kontur bir parçanın dış sınırıdır; tekse
 * (1, 3...) ebeveyn parçanın deliğidir. Böylece "delik içinde ayrı parça"
 * (derinlik 2) kendiliğinden ayrı bir parça olarak çıkar.
 *
 * Varsayım: konturlar birbirini KESMEZ (ya iç içe ya ayrık). Kesişen
 * konturlar için sonuç tanımsızdır (README → Bilinen Kısıtlar).
 */
import type { BBox, Ring } from '../geometry/types';
import { area, bboxContains, bboxOf, pointInRing } from '../geometry/polygon';

export interface HierarchyNode {
  index: number;
  parent: number;
  depth: number;
}

/** Halka `inner`, halka `outer`'ın içinde mi? Sınırdaki noktalar karar vermez. */
function ringInside(inner: Ring, outer: Ring, tol: number): boolean {
  // Tüm noktaları denemek pahalı olabilir; eşit aralıklı en fazla ~32 nokta,
  // hepsi sınırdaysa (çakışık konturlar) "içinde değil" kabul edilir.
  const step = Math.max(1, Math.floor(inner.length / 32));
  for (let i = 0; i < inner.length; i += step) {
    const r = pointInRing(inner[i], outer, tol);
    if (r !== 0) return r === 1;
  }
  return false;
}

export function buildHierarchy(rings: Ring[], tol: number): HierarchyNode[] {
  const meta = rings.map((ring, index) => ({ index, ring, area: area(ring), bbox: bboxOf(ring) as BBox }));
  const order = [...meta].sort((a, b) => b.area - a.area);
  const nodes: HierarchyNode[] = rings.map((_, index) => ({ index, parent: -1, depth: 0 }));

  for (let oi = 0; oi < order.length; oi++) {
    const cur = order[oi];
    // Kendinden büyük konturları küçükten büyüğe tara → ilk içeren en küçüğüdür.
    for (let oj = oi - 1; oj >= 0; oj--) {
      const cand = order[oj];
      if (cand.area <= cur.area) continue;
      if (!bboxContains(cand.bbox, cur.bbox, tol)) continue;
      if (ringInside(cur.ring, cand.ring, tol)) {
        nodes[cur.index].parent = cand.index;
        break;
      }
    }
  }
  // Ebeveynler her zaman daha büyük alanlı → alan sırasıyla derinlik hesaplanabilir.
  for (const m of order) {
    const n = nodes[m.index];
    n.depth = n.parent < 0 ? 0 : nodes[n.parent].depth + 1;
  }
  return nodes;
}
