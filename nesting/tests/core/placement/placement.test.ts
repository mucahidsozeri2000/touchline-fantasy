import { describe, expect, it } from 'vitest';
import { bboxNest } from '../../../src/core/placement/bboxNest';
import { expandRotations, preparePart } from '../../../src/core/placement/prepare';
import { Skyline } from '../../../src/core/placement/skyline';
import { validateLayout } from '../../../src/core/placement/validate';
import { scrapWeightKg } from '../../../src/core/placement/metrics';
import type { NestInput, NestPart, NestSettings, PreparedPart } from '../../../src/core/placement/types';
import { applyPoint, pointInRing, type Ring } from '../../../src/core/geometry';
import { importDxf } from '../../../src/core/dxf';
import { sampleDxf } from '../../../src/samples/shapes';

const rect = (w: number, h: number): Ring => [
  { x: 0, y: 0 },
  { x: w, y: 0 },
  { x: w, y: h },
  { x: 0, y: h },
];

const settings: NestSettings = { gap: 4, kerf: 0.2, gravity: 'left', simplifyTolerance: 0.1, chordTolerance: 0.05 };

const part = (id: string, w: number, h: number, extra: Partial<NestPart> = {}): NestPart => ({
  id,
  name: id,
  outer: rect(w, h),
  holes: [],
  area: w * h,
  quantity: 1,
  rotations: [0, 90, 180, 270],
  allowMirror: false,
  priority: 0,
  ...extra,
});

describe('expandRotations', () => {
  it('modlar', () => {
    expect(expandRotations('none')).toEqual([0]);
    expect(expandRotations('half')).toEqual([0, 180]);
    expect(expandRotations('quarter')).toEqual([0, 90, 180, 270]);
    expect(expandRotations('free', 15)).toHaveLength(24);
    expect(expandRotations('free', 0)).toHaveLength(360);
  });
});

describe('preparePart', () => {
  it('her dönüş ve ayna için varyant; bbox orijinde; dönüşüm parçayı bölgenin içine taşır', () => {
    const L: Ring = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 20 },
      { x: 20, y: 20 },
      { x: 20, y: 60 },
      { x: 0, y: 60 },
    ];
    const prep = preparePart(part('L', 0, 0, { outer: L, rotations: [0, 45, 90], allowMirror: true }), settings);
    expect(prep.variants).toHaveLength(6);
    const D = 0.1 + 2 + 0.05 + 0.1;
    expect(prep.offset).toBeCloseTo(D, 12);
    for (const v of prep.variants) {
      expect(v.bbox.minX).toBeCloseTo(0, 9);
      expect(v.bbox.minY).toBeCloseTo(0, 9);
      // Gerçek parçanın her köşesi şişirilmiş bölgenin içinde (ve kenardan ≥ ~D uzakta).
      for (const p of L) expect(pointInRing(applyPoint(v.transform, p), v.shape.outer, D * 0.9)).toBe(1);
    }
    // 90°: bbox boyutları yer değiştirir.
    const v90 = prep.variants.find((v) => v.rotation === 90 && !v.mirrored)!;
    expect(v90.bbox.maxX).toBeCloseTo(60 + 2 * D, 2);
    expect(v90.bbox.maxY).toBeCloseTo(100 + 2 * D, 2);
  });
});

describe('Skyline', () => {
  it('en alçak konuma, sonra en sola yerleştirir', () => {
    const s = new Skyline(100, 100);
    expect(s.find(60, 10)).toEqual({ x: 0, y: 0 });
    s.place(0, 0, 60, 10);
    expect(s.find(30, 10)).toEqual({ x: 60, y: 0 });
    s.place(60, 0, 30, 10);
    expect(s.find(20, 10)).toEqual({ x: 0, y: 10 });
    expect(s.find(101, 1)).toBeNull();
    expect(s.find(10, 95)).toEqual({ x: 90, y: 0 });
  });
});

const base = (parts: NestPart[], extra: Partial<NestInput['sheet']> = {}): NestInput => ({
  parts,
  sheet: { sizeX: 2000, sizeY: 1000, count: null, margin: 10, ...extra },
  settings,
});

describe('bboxNest', () => {
  it('çakışmasız ve sac içinde; doğrulama boş', () => {
    const parts = [part('a', 300, 200, { quantity: 10 }), part('b', 120, 80, { quantity: 25 }), part('c', 500, 90, { quantity: 4 })];
    const r = bboxNest(base(parts));
    expect(r.validation).toEqual([]);
    expect(r.unplaced).toEqual([]);
    expect(r.metrics.placedCount).toBe(39);
    expect(r.metrics.sheetCount).toBe(1);
    expect(r.metrics.efficiency).toBeCloseTo((10 * 300 * 200 + 25 * 120 * 80 + 4 * 500 * 90) / (2000 * 1000), 9);
    for (const p of r.sheets[0].placements) {
      expect(p.x).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(p.y).toBeGreaterThanOrEqual(10 - 1e-9);
    }
  });

  it('yer kalmayınca yeni sac açar; sac limiti dolunca yerleşmeyenleri raporlar', () => {
    const many = [part('a', 900, 450, { quantity: 9, rotations: [0] })];
    const r = bboxNest(base(many));
    expect(r.metrics.sheetCount).toBe(3); // sac başına 2×2 = 4
    expect(r.validation).toEqual([]);
    const limited = bboxNest(base(many, { count: 1 }));
    expect(limited.metrics.sheetCount).toBe(1);
    expect(limited.unplaced).toHaveLength(5);
    expect(limited.unplaced.every((u) => u.reason === 'NO_SHEET_LEFT')).toBe(true);
  });

  it('sacdan büyük parça TOO_LARGE; dönünce sığan parça sığar', () => {
    const r = bboxNest(base([part('big', 2100, 50, { rotations: [0, 90] }), part('tall', 50, 1500, { rotations: [0, 90] })]));
    expect(r.unplaced).toEqual([{ partId: 'big', copy: 1, reason: 'TOO_LARGE' }]);
    const tall = r.sheets[0].placements.find((p) => p.partId === 'tall')!;
    expect(tall.rotation).toBe(90);
  });

  it('yerçekimi "sola": parçalar X ekseninde sola yığılır', () => {
    const r = bboxNest(base([part('a', 100, 100, { quantity: 5, rotations: [0] })]));
    const xs = r.sheets[0].placements.map((p) => Math.round(p.x));
    // 5 × ~104 mm = 520 < 980 → tek sütun (Y boyunca) — hepsi en solda.
    expect(new Set(xs).size).toBe(1);
    const down = bboxNest({ ...base([part('a', 100, 100, { quantity: 5, rotations: [0] })]), settings: { ...settings, gravity: 'down' } });
    expect(new Set(down.sheets[0].placements.map((p) => Math.round(p.y))).size).toBe(1);
  });

  it('öncelikli parça önce yerleşir', () => {
    const r = bboxNest(base([part('small', 50, 50), part('vip', 40, 40, { priority: 2 })]));
    expect(r.sheets[0].placements[0].partId).toBe('vip');
  });

  it('örnek DXF parçaları: gerçek konturlarla çakışmasız', () => {
    const imp = importDxf(sampleDxf(), 'ornek.dxf');
    const parts: NestPart[] = imp.parts.map((p) => ({
      id: p.id,
      name: p.name,
      outer: p.outer.ring,
      holes: p.holes.map((h) => h.ring),
      area: p.area,
      quantity: 12,
      rotations: [0, 90, 180, 270],
      allowMirror: true,
      priority: 0,
    }));
    const r = bboxNest(base(parts));
    expect(r.validation).toEqual([]);
    expect(r.metrics.placedCount).toBe(72);
  });
});

describe('validateLayout', () => {
  it('çakışmayı ve sac dışına taşmayı yakalar', () => {
    const prep: PreparedPart = preparePart(part('a', 100, 100, { rotations: [0] }), settings);
    const prepared = new Map([['a', prep]]);
    const sheet = { sizeX: 500, sizeY: 500, count: null, margin: 10 };
    const mk = (x: number, y: number) => ({
      partId: 'a',
      copy: 1,
      variant: 0,
      rotation: 0,
      mirrored: false,
      x,
      y,
      transform: prep.variants[0].transform,
    });
    expect(validateLayout([{ placements: [mk(10, 10), mk(200, 10)] }], prepared, sheet)).toEqual([]);
    const overlap = validateLayout([{ placements: [mk(10, 10), mk(60, 10)] }], prepared, sheet);
    expect(overlap.map((i) => i.code)).toEqual(['OVERLAP']);
    const out = validateLayout([{ placements: [mk(450, 10)] }], prepared, sheet);
    expect(out.map((i) => i.code)).toEqual(['OUT_OF_SHEET']);
    // Tam değme çakışma değildir.
    const w = prep.variants[0].bbox.maxX;
    expect(validateLayout([{ placements: [mk(10, 10), mk(10 + w, 10)] }], prepared, sheet)).toEqual([]);
  });
});

describe('metrics', () => {
  it('fire ağırlığı', () => {
    // 1 m² × 2 mm × 7,85 g/cm³ = 15,7 kg
    expect(scrapWeightKg(1e6, 2, 7.85)).toBeCloseTo(15.7, 9);
  });
});
