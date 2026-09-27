import { describe, expect, it } from 'vitest';
import { inflatePart, totalOffset } from '../../../src/core/geometry/offset';
import { simplifyRing } from '../../../src/core/geometry/simplify';
import { area, distToSegment, pointInRing, signedArea, type Ring } from '../../../src/core/geometry';
import { discretize } from '../../../src/core/dxf/segments';

const rect = (x: number, y: number, w: number, h: number): Ring => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

const circle = (r: number, cx = 0, cy = 0, chord = 0.05): Ring =>
  discretize({ kind: 'arc', source: 0, layer: '0', center: { x: cx, y: cy }, radius: r, start: 0, sweep: 2 * Math.PI }, chord).slice(0, -1);

const noTol = { chordTolerance: 0, simplifyTolerance: 0 };

describe('inflatePart — alan doğruluğu', () => {
  it('dikdörtgen: miter offset tam dikdörtgen verir', () => {
    const ex = inflatePart(rect(0, 0, 100, 50), [], { distance: 2, ...noTol });
    expect(area(ex.outer)).toBeCloseTo(104 * 54, 3);
    expect(ex.holes).toHaveLength(0);
    expect(signedArea(ex.outer)).toBeGreaterThan(0);
  });

  it('delik aynı miktarda daralır', () => {
    const hole = [...rect(20, 10, 40, 30)].reverse();
    const ex = inflatePart(rect(0, 0, 100, 50), [hole], { distance: 3, ...noTol });
    expect(ex.holes).toHaveLength(1);
    expect(area(ex.holes[0])).toBeCloseTo(34 * 24, 3);
    expect(signedArea(ex.holes[0])).toBeLessThan(0);
  });

  it('offsetten küçük delik kaybolur', () => {
    const hole = [...rect(20, 10, 4, 4)].reverse();
    const ex = inflatePart(rect(0, 0, 100, 50), [hole], { distance: 2.5, ...noTol });
    expect(ex.holes).toHaveLength(0);
  });

  it('daire R50, d=2: alan π(52)² ile uyumlu ve gerçek offset dairesini kapsar', () => {
    const ex = inflatePart(circle(50), [], { distance: 2, chordTolerance: 0.05, simplifyTolerance: 0.1 });
    const D = 2 + 0.05 + 0.1;
    // Kapsama: yarıçapı 50 + 2 olan gerçek dairenin tüm noktaları içeride.
    for (let i = 0; i < 720; i++) {
      const a = (i * Math.PI) / 360;
      expect(pointInRing({ x: 52 * Math.cos(a), y: 52 * Math.sin(a) }, ex.outer)).toBe(1);
    }
    // Alan: en fazla (50 + D) yarıçaplı çevrel çokgen kadar.
    expect(area(ex.outer)).toBeGreaterThan(Math.PI * 52 ** 2);
    expect(area(ex.outer)).toBeLessThan(Math.PI * (50 + D) ** 2 * 1.002);
  });

  it('delikli daire (flanş): delik güvenli tarafa daralır', () => {
    const hole = [...circle(20)].reverse();
    const ex = inflatePart(circle(50), [hole], { distance: 1, chordTolerance: 0.05, simplifyTolerance: 0.1 });
    expect(ex.holes).toHaveLength(1);
    // Deliğin tamamı gerçek "delik ⊖ d" dairesinin (R19) İÇİNDE olmalı.
    for (const p of ex.holes[0]) expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(19 + 1e-3);
  });

  it('totalOffset = d + c + s', () => {
    expect(totalOffset({ distance: 2, chordTolerance: 0.05, simplifyTolerance: 0.1 })).toBeCloseTo(2.15, 12);
  });
});

describe('simplifyRing', () => {
  it('köşe sayısını azaltır ve her orijinal nokta tol içinde kalır', () => {
    const ring = circle(200, 0, 0, 0.001);
    const s = simplifyRing(ring, 0.1);
    expect(s.length).toBeLessThan(ring.length / 5);
    for (const p of ring) {
      let best = Infinity;
      for (let i = 0; i < s.length; i++) best = Math.min(best, distToSegment(p, s[i], s[(i + 1) % s.length]));
      expect(best).toBeLessThanOrEqual(0.1 + 1e-9);
    }
  });

  it('kare gibi basit halkaları değiştirmez; küçük halkayı çöktürmez', () => {
    expect(simplifyRing(rect(0, 0, 10, 10), 0.1)).toHaveLength(4);
    expect(simplifyRing(circle(0.2), 1).length).toBeGreaterThanOrEqual(3);
  });

  it('sadeleştirilmiş + offset poligon orijinal ⊕ d\'yi kapsar (tırtıklı kenar)', () => {
    // Testere dişli kenar: DP dişleri siler, telafi offset'i kapsamayı korur.
    const ring: Ring = [];
    for (let i = 0; i <= 100; i++) ring.push({ x: i, y: i % 2 ? 0.08 : 0 });
    ring.push({ x: 100, y: 50 }, { x: 0, y: 50 });
    const ex = inflatePart(ring, [], { distance: 1, chordTolerance: 0, simplifyTolerance: 0.1 });
    for (let i = 0; i <= 100; i++) expect(pointInRing({ x: i, y: (i % 2 ? 0.08 : 0) - 1 }, ex.outer)).toBe(1);
  });
});
