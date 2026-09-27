import { describe, expect, it } from 'vitest';
import { chainSegments } from '../../../src/core/dxf/chain';
import { type Segment, segEnd, segStart } from '../../../src/core/dxf/segments';
import { dist } from '../../../src/core/geometry';

let src = 0;
const L = (ax: number, ay: number, bx: number, by: number): Segment => ({
  kind: 'line',
  source: ++src,
  layer: '0',
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
});

function expectContinuousClosed(chain: Segment[], tol: number) {
  for (let i = 0; i < chain.length; i++) {
    const next = chain[(i + 1) % chain.length];
    expect(dist(segEnd(chain[i]), segStart(next))).toBeLessThanOrEqual(tol);
  }
}

describe('chainSegments', () => {
  it('sırasız ve ters yönlü segmentlerden kapalı, sürekli kontur', () => {
    const segs = [L(10, 10, 0, 10), L(0, 0, 10, 0), L(0, 0, 0, 10), L(10, 10, 10, 0)];
    const r = chainSegments(segs, 0.01, 0.05);
    expect(r.closed).toHaveLength(1);
    expect(r.open).toHaveLength(0);
    expect(r.closed[0]).toHaveLength(4);
    expectContinuousClosed(r.closed[0], 1e-12);
  });

  it('tolerans içindeki kopuklukları birleştirir', () => {
    const segs = [L(0, 0, 10, 0.006), L(10, 0, 10, 10), L(10.007, 10, 0, 10), L(0, 10, 0.003, -0.004)];
    const r = chainSegments(segs, 0.01, 0.05);
    expect(r.closed).toHaveLength(1);
    expectContinuousClosed(r.closed[0], 0.01);
  });

  it('ortadan başlayan açık zinciri iki yöne de uzatır', () => {
    const segs = [L(10, 0, 20, 0), L(0, 0, 10, 0), L(30, 0, 20, 0)];
    const r = chainSegments(segs, 0.01, 0.05);
    expect(r.open).toHaveLength(1);
    const ch = r.open[0];
    expect(ch).toHaveLength(3);
    const ends = [segStart(ch[0]).x, segEnd(ch[2]).x].sort((a, b) => a - b);
    expect(ends).toEqual([0, 30]);
    for (let i = 1; i < ch.length; i++) expect(dist(segEnd(ch[i - 1]), segStart(ch[i]))).toBe(0);
  });

  it('iki ayrı kontur + tam daire', () => {
    const segs: Segment[] = [
      L(0, 0, 1, 0),
      L(1, 0, 0, 1),
      L(0, 1, 0, 0),
      L(5, 5, 6, 5),
      L(6, 5, 5, 6),
      L(5, 6, 5, 5),
      { kind: 'arc', source: 99, layer: '0', center: { x: 20, y: 20 }, radius: 3, start: 0, sweep: 2 * Math.PI },
    ];
    const r = chainSegments(segs, 0.01, 0.05);
    expect(r.closed).toHaveLength(3);
  });

  it('dejenere (sıfır boylu) segmentleri atar, kopyaları sayar', () => {
    const segs = [L(0, 0, 0.001, 0), L(0, 0, 1, 0), L(1, 0, 0, 0), L(1, 0, 0, 1), L(0, 1, 0, 0)];
    const r = chainSegments(segs, 0.01, 0.05);
    expect(r.duplicatesRemoved).toBe(1);
    expect(r.closed).toHaveLength(1);
    expect(r.closed[0]).toHaveLength(3);
  });

  it('aynı kaynak entity\'nin devamını tercih eder', () => {
    // Kare (kaynak 500) ve köşesine değen başka bir kare (kaynak 600).
    const a = (ax: number, ay: number, bx: number, by: number, s: number): Segment => ({
      kind: 'line',
      source: s,
      layer: '0',
      a: { x: ax, y: ay },
      b: { x: bx, y: by },
    });
    const segs = [
      a(0, 0, 10, 0, 500),
      a(10, 0, 10, 10, 500),
      a(10, 10, 0, 10, 500),
      a(0, 10, 0, 0, 500),
      a(10, 10, 20, 10, 600),
      a(20, 10, 20, 20, 600),
      a(20, 20, 10, 20, 600),
      a(10, 20, 10, 10, 600),
    ];
    const r = chainSegments(segs, 0.01, 0.05);
    expect(r.closed).toHaveLength(2);
    for (const c of r.closed) expect(new Set(c.map((s) => s.source)).size).toBe(1);
    expect(r.ambiguousPoints).toHaveLength(1);
  });
});
