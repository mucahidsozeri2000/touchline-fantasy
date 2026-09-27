import { describe, expect, it } from 'vitest';
import { buildHierarchy } from '../../../src/core/dxf/hierarchy';
import type { Ring } from '../../../src/core/geometry';

const sq = (x: number, y: number, s: number): Ring => [
  { x, y },
  { x: x + s, y },
  { x: x + s, y: y + s },
  { x, y: y + s },
];

describe('buildHierarchy', () => {
  it('iç içe 5 seviye: derinlik 0..4, her biri bir üstünün çocuğu', () => {
    // Girdi sırası karışık olsun.
    const rings = [sq(20, 20, 60), sq(0, 0, 100), sq(40, 40, 20), sq(10, 10, 80), sq(30, 30, 40)];
    const nodes = buildHierarchy(rings, 0.01);
    const depthOf = (i: number) => nodes[i].depth;
    expect([1, 3, 0, 4, 2].map(depthOf)).toEqual([0, 1, 2, 3, 4]);
    expect(nodes[1].parent).toBe(-1);
    expect(nodes[3].parent).toBe(1);
    expect(nodes[0].parent).toBe(3);
    expect(nodes[4].parent).toBe(0);
    expect(nodes[2].parent).toBe(4);
  });

  it('yan yana ayrık konturlar kök seviyededir', () => {
    const nodes = buildHierarchy([sq(0, 0, 10), sq(20, 0, 10), sq(40, 0, 5)], 0.01);
    expect(nodes.every((n) => n.depth === 0)).toBe(true);
  });

  it('dış konturun kenarına değen delik yine içeride sayılır', () => {
    // Delik dış konturla ortak bir kenar parçası paylaşıyor (değme); içteki
    // noktalar karar verir.
    const outer = sq(0, 0, 100);
    const hole: Ring = [
      { x: 0, y: 40 },
      { x: 20, y: 40 },
      { x: 20, y: 60 },
      { x: 0, y: 60 },
      { x: 10, y: 50 },
    ];
    const nodes = buildHierarchy([outer, hole], 0.01);
    expect(nodes[1].parent).toBe(0);
  });

  it('bbox içinde ama poligon dışında kalan kontur çocuk değildir', () => {
    // L şekli ve L'nin iç köşesindeki boşlukta duran kare.
    const L: Ring = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 20 },
      { x: 20, y: 20 },
      { x: 20, y: 100 },
      { x: 0, y: 100 },
    ];
    const nodes = buildHierarchy([L, sq(50, 50, 20)], 0.01);
    expect(nodes[1].parent).toBe(-1);
  });
});
