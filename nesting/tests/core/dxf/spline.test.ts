import { describe, expect, it } from 'vitest';
import { discretizeNurbs, evalNurbs, isValidNurbs } from '../../../src/core/dxf/spline';
import { distToSegment } from '../../../src/core/geometry';

describe('NURBS', () => {
  it('rasyonel ikinci derece çeyrek daire tam daire üzerindedir', () => {
    const w = Math.SQRT1_2;
    const c = {
      degree: 2,
      knots: [0, 0, 0, 1, 1, 1],
      controlPoints: [
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      weights: [1, w, 1],
    };
    expect(isValidNurbs(c)).toBe(true);
    for (let i = 0; i <= 20; i++) {
      const p = evalNurbs(c, i / 20);
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(10, 10);
    }
  });

  it('kübik Bezier uç noktaları ve orta noktası', () => {
    const c = {
      degree: 3,
      knots: [0, 0, 0, 0, 1, 1, 1, 1],
      controlPoints: [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 0 },
      ],
      weights: [],
    };
    expect(evalNurbs(c, 0)).toEqual({ x: 0, y: 0 });
    expect(evalNurbs(c, 1)).toEqual({ x: 10, y: 0 });
    const m = evalNurbs(c, 0.5);
    expect(m.x).toBeCloseTo(5, 12);
    expect(m.y).toBeCloseTo(7.5, 12);
  });

  it('uyarlamalı ayrıklaştırma sapması ≤ tolerans (çok aralıklı)', () => {
    const c = {
      degree: 3,
      knots: [0, 0, 0, 0, 1, 2, 3, 3, 3, 3],
      controlPoints: [
        { x: 0, y: 0 },
        { x: 20, y: 80 },
        { x: 60, y: -40 },
        { x: 100, y: 90 },
        { x: 140, y: -10 },
        { x: 170, y: 30 },
      ],
      weights: [],
    };
    const pts = discretizeNurbs(c, 0.05);
    let worst = 0;
    for (let i = 0; i <= 3000; i++) {
      const p = evalNurbs(c, (3 * i) / 3000);
      let best = Infinity;
      for (let k = 1; k < pts.length; k++) best = Math.min(best, distToSegment(p, pts[k - 1], pts[k]));
      worst = Math.max(worst, best);
    }
    expect(worst).toBeLessThanOrEqual(0.05 + 1e-9);
  });

  it('tutarsız knot vektörünü reddeder', () => {
    expect(
      isValidNurbs({ degree: 3, knots: [0, 1], controlPoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }, { x: 3, y: 1 }], weights: [] }),
    ).toBe(false);
  });
});
