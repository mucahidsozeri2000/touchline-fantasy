/**
 * Kapalı halkalar için Douglas–Peucker sadeleştirme.
 *
 * Garanti: orijinal halkanın her noktası, sadeleştirilmiş halkanın bir
 * kenarına en fazla `tol` uzaklıktadır (Hausdorff yönü: orijinal → sade).
 * Nokta-doğru parçası uzaklığı dışbükey bir fonksiyon olduğundan bu, yalnız
 * köşeler için değil orijinal kenarların tamamı için de geçerlidir.
 *
 * Sonuç: sade poligon orijinali İÇERMEYEBİLİR (kirişler içeri kesebilir),
 * ama  orijinal ⊆ sade ⊕ disk(tol). Bu yüzden nesting'de sadeleştirme
 * offset'ten ÖNCE yapılır ve `tol` offset miktarına eklenir (bkz. offset.ts).
 */
import type { Ring, Vec2 } from './types';
import { distToSegment } from './vec';

function dpOpen(pts: Vec2[], tol: number, keep: boolean[], i0: number, i1: number) {
  // Yığın taşmasını önlemek için özyineleme yerine açık yığın.
  const stack: [number, number][] = [[i0, i1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let worst = -1;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = distToSegment(pts[i], pts[a], pts[b]);
      if (d > worst) {
        worst = d;
        idx = i;
      }
    }
    if (idx >= 0 && worst > tol) {
      keep[idx] = true;
      stack.push([a, idx], [idx, b]);
    }
  }
}

export function simplifyRing(ring: Ring, tol: number): Ring {
  const n = ring.length;
  if (n <= 4 || tol <= 0) return ring.slice();
  // Kapalı halka için iki sabit nokta: ilk nokta ve ona en uzak nokta.
  let far = 0;
  let farD = -1;
  for (let i = 1; i < n; i++) {
    const d = Math.hypot(ring[i].x - ring[0].x, ring[i].y - ring[0].y);
    if (d > farD) {
      farD = d;
      far = i;
    }
  }
  const pts = [...ring, ring[0]];
  const keep = new Array<boolean>(n + 1).fill(false);
  keep[0] = keep[far] = keep[n] = true;
  dpOpen(pts, tol, keep, 0, far);
  dpOpen(pts, tol, keep, far, n);
  const out: Ring = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(ring[i]);
  // Çok küçük halkalar (delikler) üçgenin altına inmesin.
  return out.length >= 3 ? out : ring.slice();
}
