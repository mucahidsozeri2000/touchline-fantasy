import { describe, expect, it } from 'vitest';
import {
  applyPoint,
  bboxOf,
  compose,
  dedupeRing,
  pointInRing,
  rotation,
  scaling,
  signedArea,
  translation,
  uniformScale,
} from '../../../src/core/geometry';
import { resolveUnits } from '../../../src/core/dxf/units';

const square = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

describe('polygon', () => {
  it('işaretli alan: CCW pozitif, CW negatif', () => {
    expect(signedArea(square)).toBe(100);
    expect(signedArea([...square].reverse())).toBe(-100);
  });

  it('pointInRing: içeride / dışarıda / sınırda', () => {
    expect(pointInRing({ x: 5, y: 5 }, square, 0.01)).toBe(1);
    expect(pointInRing({ x: 15, y: 5 }, square, 0.01)).toBe(-1);
    expect(pointInRing({ x: 10.005, y: 5 }, square, 0.01)).toBe(0);
  });

  it('dedupeRing ardışık yakın noktaları ve kapanış tekrarını atar', () => {
    const r = dedupeRing([...square, { x: 0.001, y: 0 }], 0.01);
    expect(r).toHaveLength(4);
  });

  it('bboxOf', () => {
    expect(bboxOf(square)).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 10 });
  });
});

describe('transform', () => {
  it('compose(m1, m2) önce m2 sonra m1 uygular', () => {
    const m = compose(translation(10, 0), rotation(Math.PI / 2));
    const p = applyPoint(m, { x: 1, y: 0 });
    expect(p.x).toBeCloseTo(10, 12);
    expect(p.y).toBeCloseTo(1, 12);
  });

  it('uniformScale: benzerlik dönüşümlerini tanır', () => {
    expect(uniformScale(compose(rotation(0.3), scaling(2, 2)))).toBeCloseTo(2, 12);
    expect(uniformScale(scaling(-3, 3))).toBeCloseTo(3, 12);
    expect(uniformScale(scaling(2, 1))).toBeNull();
  });
});

describe('units', () => {
  it('$INSUNITS çevrimleri', () => {
    expect(resolveUnits(1).scale).toBe(25.4);
    expect(resolveUnits(4).scale).toBe(1);
    expect(resolveUnits(6).scale).toBe(1000);
    expect(resolveUnits(null)).toMatchObject({ scale: 1, assumed: true, unsupported: false });
    expect(resolveUnits(0)).toMatchObject({ scale: 1, assumed: true, unsupported: false });
    expect(resolveUnits(7)).toMatchObject({ scale: 1, assumed: true, unsupported: true });
  });
});
