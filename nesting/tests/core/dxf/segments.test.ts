import { describe, expect, it } from 'vitest';
import {
  type ArcSeg,
  type EllipseSeg,
  type Segment,
  discretize,
  reverseSeg,
  segEnd,
  segStart,
  transformSeg,
} from '../../../src/core/dxf/segments';
import { bulgePolyline } from '../../../src/core/dxf/normalize';
import { compose, dist, distToSegment, rotation, scaling, translation, type Vec2 } from '../../../src/core/geometry';

const base = { source: 1, layer: '0' };

/** Gerçek eğri üzerindeki yoğun örneklerin, poligon kirişlerine en büyük uzaklığı. */
function maxDeviation(pts: Vec2[], exact: (t: number) => Vec2, samples = 4000): number {
  let worst = 0;
  for (let i = 0; i <= samples; i++) {
    const p = exact(i / samples);
    let best = Infinity;
    for (let k = 1; k < pts.length; k++) best = Math.min(best, distToSegment(p, pts[k - 1], pts[k]));
    worst = Math.max(worst, best);
  }
  return worst;
}

describe('discretize — kiriş sapması sınırı', () => {
  for (const r of [0.5, 3, 10, 100, 1500]) {
    it(`R${r} tam daire: sapma ≤ 0.05 mm`, () => {
      const arc: ArcSeg = { ...base, kind: 'arc', center: { x: 0, y: 0 }, radius: r, start: 0, sweep: 2 * Math.PI };
      const pts = discretize(arc, 0.05);
      const dev = maxDeviation(pts, (t) => ({ x: r * Math.cos(2 * Math.PI * t), y: r * Math.sin(2 * Math.PI * t) }));
      expect(dev).toBeLessThanOrEqual(0.05 + 1e-9);
      expect(pts.length).toBeGreaterThanOrEqual(9);
    });
  }

  it('segment sayısı yarıçapla dinamik artar', () => {
    const n = (r: number) =>
      discretize({ ...base, kind: 'arc', center: { x: 0, y: 0 }, radius: r, start: 0, sweep: 2 * Math.PI }, 0.05).length;
    expect(n(10)).toBeLessThan(n(100));
    expect(n(100)).toBeLessThan(n(1000));
  });

  it('eğik eşlenik çaplı elips: sapma ≤ 0.05 mm', () => {
    const e: EllipseSeg = {
      ...base,
      kind: 'ellipse',
      center: { x: 5, y: 5 },
      u: { x: 80, y: 20 },
      v: { x: -10, y: 30 },
      start: 0.3,
      sweep: 4,
    };
    const pts = discretize(e, 0.05);
    const at = (t: number) => {
      const a = e.start + e.sweep * t;
      return { x: 5 + 80 * Math.cos(a) - 10 * Math.sin(a), y: 5 + 20 * Math.cos(a) + 30 * Math.sin(a) };
    };
    expect(maxDeviation(pts, at)).toBeLessThanOrEqual(0.05 + 1e-9);
    expect(dist(pts[0], at(0))).toBeLessThan(1e-9);
    expect(dist(pts[pts.length - 1], at(1))).toBeLessThan(1e-9);
  });
});

describe('segment yön ve dönüşüm', () => {
  it('reverseSeg uçları yer değiştirir', () => {
    const segs: Segment[] = [
      { ...base, kind: 'line', a: { x: 0, y: 0 }, b: { x: 1, y: 2 } },
      { ...base, kind: 'arc', center: { x: 0, y: 0 }, radius: 2, start: 0.2, sweep: 1.3 },
      { ...base, kind: 'ellipse', center: { x: 0, y: 0 }, u: { x: 3, y: 0 }, v: { x: 0, y: 1 }, start: 0, sweep: -2 },
      { ...base, kind: 'poly', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }] },
    ];
    for (const s of segs) {
      const r = reverseSeg(s);
      expect(dist(segStart(r), segEnd(s))).toBeLessThan(1e-12);
      expect(dist(segEnd(r), segStart(s))).toBeLessThan(1e-12);
    }
  });

  it('aynalama yayın yönünü çevirir, yay olarak kalır', () => {
    const arc: ArcSeg = { ...base, kind: 'arc', center: { x: 10, y: 0 }, radius: 5, start: 0, sweep: Math.PI / 2 };
    const m = scaling(-1, 1);
    const t = transformSeg(arc, m);
    expect(t.kind).toBe('arc');
    if (t.kind !== 'arc') return;
    expect(t.sweep).toBeCloseTo(-Math.PI / 2, 12);
    expect(dist(segStart(t), { x: -15, y: 0 })).toBeLessThan(1e-12);
    expect(dist(segEnd(t), { x: -10, y: 5 })).toBeLessThan(1e-12);
  });

  it('dönüş + düzgün ölçek + öteleme: yay yarıçapı ölçeklenir', () => {
    const arc: ArcSeg = { ...base, kind: 'arc', center: { x: 0, y: 0 }, radius: 1, start: 0, sweep: Math.PI };
    const m = compose(translation(5, 5), compose(rotation(Math.PI / 2), scaling(3, 3)));
    const t = transformSeg(arc, m);
    expect(t.kind).toBe('arc');
    if (t.kind !== 'arc') return;
    expect(t.radius).toBeCloseTo(3, 12);
    expect(dist(segStart(t), { x: 5, y: 8 })).toBeLessThan(1e-12);
    expect(dist(segEnd(t), { x: 5, y: 2 })).toBeLessThan(1e-12);
  });

  it('düzgün olmayan ölçek daireyi elipse çevirir (tam)', () => {
    const arc: ArcSeg = { ...base, kind: 'arc', center: { x: 0, y: 0 }, radius: 10, start: 0, sweep: 2 * Math.PI };
    const t = transformSeg(arc, scaling(2, 1));
    expect(t.kind).toBe('ellipse');
    const pts = discretize(t, 0.05);
    for (const p of pts) expect((p.x / 20) ** 2 + (p.y / 10) ** 2).toBeCloseTo(1, 9);
  });
});

describe('bulge', () => {
  it('bulge=1 → yarım daire, CCW, merkez kirişin solunda', () => {
    const [s] = bulgePolyline(
      [
        { x: 0, y: 0, bulge: 1 },
        { x: 10, y: 0, bulge: 0 },
      ],
      false,
      1,
      '0',
    );
    expect(s.kind).toBe('arc');
    if (s.kind !== 'arc') return;
    expect(s.radius).toBeCloseTo(5, 12);
    expect(dist(s.center, { x: 5, y: 0 })).toBeLessThan(1e-12);
    expect(s.sweep).toBeCloseTo(Math.PI, 12);
    // CCW yarım daire (0,0)→(10,0): alttan geçer.
    const mid = discretize(s, 0.01)[Math.floor(discretize(s, 0.01).length / 2)];
    expect(mid.y).toBeLessThan(-4.9);
  });

  it('negatif bulge → CW yay, uçlar tam', () => {
    const q = -Math.tan(Math.PI / 8); // −90°
    const [s] = bulgePolyline(
      [
        { x: 0, y: 0, bulge: q },
        { x: 10, y: 10, bulge: 0 },
      ],
      false,
      1,
      '0',
    );
    expect(s.kind).toBe('arc');
    if (s.kind !== 'arc') return;
    expect(s.sweep).toBeCloseTo(-Math.PI / 2, 12);
    expect(dist(segStart(s), { x: 0, y: 0 })).toBeLessThan(1e-9);
    expect(dist(segEnd(s), { x: 10, y: 10 })).toBeLessThan(1e-9);
    expect(s.radius).toBeCloseTo(10, 9);
  });

  it('kapalı polyline son köşeden ilk köşeye kenar ekler', () => {
    const segs = bulgePolyline(
      [
        { x: 0, y: 0, bulge: 0 },
        { x: 1, y: 0, bulge: 0 },
        { x: 1, y: 1, bulge: 0 },
      ],
      true,
      1,
      '0',
    );
    expect(segs).toHaveLength(3);
    expect(dist(segEnd(segs[2]), { x: 0, y: 0 })).toBe(0);
  });
});
