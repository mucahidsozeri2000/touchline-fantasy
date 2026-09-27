import { describe, expect, it } from 'vitest';
import { importDxf } from '../../../src/core/dxf';
import { area, signedArea } from '../../../src/core/geometry';
import {
  arcEdgeDxf,
  blocksDxf,
  curvesDxf,
  flangeDxf,
  inchRectDxf,
  lProfileDxf,
  messyChainDxf,
  noUnitsDxf,
  openContourDxf,
  plateWithInnerPartDxf,
  rectangleDxf,
} from '../../../src/samples/shapes';
import { DxfBuilder } from '../../../src/core/export/dxfBuilder';

const CHORD = 0.05;

/**
 * Kiriş yaklaşımında noktalar eğri üzerinde olduğundan, dışbükey eğrilerde
 * poligon gerçek şeklin içinde kalır; alan farkı ≤ (eğri çevresi × sapma).
 * `sign` = +1: yaklaşık alan gerçekten küçük olmalı; −1: büyük olmalı (delikler).
 */
function expectChordArea(approx: number, exact: number, curvedLength: number, sign: 1 | -1 = 1) {
  const diff = (exact - approx) * sign;
  expect(diff).toBeGreaterThanOrEqual(-1e-6);
  expect(diff).toBeLessThanOrEqual(curvedLength * CHORD);
}

describe('importDxf — temel parçalar', () => {
  it('LINE dikdörtgeni tek parça olarak okur, yerel koordinata taşır', () => {
    const r = importDxf(rectangleDxf(), 'dikdortgen.dxf');
    expect(r.parts).toHaveLength(1);
    const p = r.parts[0];
    expect(p.name).toBe('dikdortgen');
    expect(p.holes).toHaveLength(0);
    expect(p.area).toBeCloseTo(20000, 6);
    expect(p.bbox).toEqual({ minX: 0, minY: 0, maxX: 200, maxY: 100 });
    expect(signedArea(p.outer.ring)).toBeGreaterThan(0); // dış kontur CCW
    expect(r.warnings).toEqual([]);
  });

  it('L profil (kapalı LWPOLYLINE)', () => {
    const r = importDxf(lProfileDxf(), 'l.dxf');
    expect(r.parts).toHaveLength(1);
    expect(r.parts[0].area).toBeCloseTo(150 * 30 + 30 * 70, 6);
  });

  it('delikli flanş: 1 parça, 7 delik, delikler CW', () => {
    const r = importDxf(flangeDxf(), 'flans.dxf');
    expect(r.parts).toHaveLength(1);
    const p = r.parts[0];
    expect(p.holes).toHaveLength(7);
    for (const h of p.holes) expect(signedArea(h.ring)).toBeLessThan(0);
    const exact = Math.PI * (100 ** 2 - 40 ** 2 - 6 * 6 ** 2);
    // Kiriş yaklaşımı: dış kontur biraz küçülür, delikler biraz küçülür.
    expect(Math.abs(p.area - exact) / exact).toBeLessThan(0.002);
    // Orijinal yaylar saklanmış olmalı (çıktı kalitesi için).
    expect(p.outer.segments).toHaveLength(1);
    expect(p.outer.segments[0].kind).toBe('arc');
  });

  it('yay kenarlı parça: bulge yayları ve ARC+LINE oluk', () => {
    const r = importDxf(arcEdgeDxf(), 'yay.dxf');
    expect(r.parts).toHaveLength(1);
    const p = r.parts[0];
    expect(p.holes).toHaveLength(1);
    const outerExact = 160 * 80 - (4 - Math.PI) * 10 ** 2;
    const slotExact = 40 * 16 + Math.PI * 8 ** 2;
    expectChordArea(area(p.outer.ring), outerExact, 2 * Math.PI * 10);
    expectChordArea(area(p.holes[0].ring), slotExact, 2 * Math.PI * 8);
    expect(p.outer.segments.filter((s) => s.kind === 'arc')).toHaveLength(4);
    expect(p.bbox.maxX).toBeCloseTo(160, 9);
    expect(p.bbox.maxY).toBeCloseTo(80, 9);
  });
});

describe('importDxf — hiyerarşi', () => {
  it('delik içindeki parça ayrı parça olarak çıkar', () => {
    const r = importDxf(plateWithInnerPartDxf(), 'plaka.dxf');
    expect(r.parts).toHaveLength(2);
    const [plate, inner] = [...r.parts].sort((a, b) => b.area - a.area);
    expect(plate.holes).toHaveLength(1);
    expect(plate.area).toBeCloseTo(400 * 300 - 300 * 200, 6);
    expect(inner.holes).toHaveLength(1);
    expect(inner.bbox.maxX).toBeCloseTo(120, 9);
    expect(inner.origin).toEqual({ x: 140, y: 110 });
    expect(r.parts.map((p) => p.name).sort()).toEqual(['plaka_1', 'plaka_2']);
  });
});

describe('importDxf — zincirleme ve hatalar', () => {
  it('sırasız, ters yönlü, toleranslı uçlu altıgeni kapatır ve kopyayı atar', () => {
    const r = importDxf(messyChainDxf(), 'z.dxf');
    expect(r.parts).toHaveLength(1);
    expect(r.openContours).toHaveLength(0);
    expect(r.parts[0].outer.segments).toHaveLength(6);
    expect(r.parts[0].area).toBeCloseTo((3 * Math.sqrt(3) * 50 ** 2) / 2, 0);
    expect(r.warnings).toContainEqual({ code: 'DUPLICATES_REMOVED', count: 1 });
  });

  it('açık konturu raporlar, sağlam parçayı yine okur, çökmez', () => {
    const r = importDxf(openContourDxf(), 'a.dxf');
    expect(r.parts).toHaveLength(1);
    expect(r.openContours).toHaveLength(1);
    const oc = r.openContours[0];
    // Uçlar (0,0) ve (0,50) — yön fark etmez.
    const ends = [oc.start, oc.end].map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).sort();
    expect(ends).toEqual(['0,0', '0,50']);
    expect(r.warnings).toContainEqual({ code: 'OPEN_CONTOURS', count: 1 });
  });

  it('tolerans dışındaki kopukluk kapatılmaz', () => {
    const b = new DxfBuilder().headerVar('$INSUNITS', 70, 4);
    b.line({ x: 0, y: 0 }, { x: 10, y: 0 })
      .line({ x: 10, y: 0 }, { x: 10, y: 10 })
      .line({ x: 10, y: 10 }, { x: 0, y: 10 })
      .line({ x: 0, y: 10 }, { x: 0, y: 0.02 }); // 0.02 > 0.01
    const r = importDxf(b.toString(), 'k.dxf');
    expect(r.parts).toHaveLength(0);
    expect(r.openContours).toHaveLength(1);
    // Tolerans büyütülünce kapanır.
    expect(importDxf(b.toString(), 'k.dxf', { pointTolerance: 0.05 }).parts).toHaveLength(1);
  });

  it('bozuk metin anlaşılır hata kodu verir', () => {
    expect(() => importDxf('', 'x.dxf')).toThrowError(/EMPTY_FILE/);
    expect(() => importDxf('0\nSECTION\n2\nENTITIES\n0\nLINE\n10\nabc', 'x.dxf')).toThrowError(/PARSE_FAILED/);
  });

  it('T kavşağını belirsiz kavşak olarak raporlar', () => {
    const b = new DxfBuilder().headerVar('$INSUNITS', 70, 4);
    b.line({ x: 0, y: 0 }, { x: 10, y: 0 })
      .line({ x: 10, y: 0 }, { x: 10, y: 10 })
      .line({ x: 10, y: 10 }, { x: 0, y: 10 })
      .line({ x: 0, y: 10 }, { x: 0, y: 0 })
      .line({ x: 10, y: 0 }, { x: 20, y: 0 });
    const r = importDxf(b.toString(), 't.dxf');
    const w = r.warnings.find((x) => x.code === 'AMBIGUOUS_JUNCTIONS');
    expect(w).toBeDefined();
    expect(r.parts).toHaveLength(1);
  });
});

describe('importDxf — birimler', () => {
  it('inç dosyasını mm\'ye çevirir', () => {
    const r = importDxf(inchRectDxf(), 'i.dxf');
    expect(r.units.scale).toBe(25.4);
    expect(r.parts[0].bbox.maxX).toBeCloseTo(50.8, 9);
    expect(r.parts[0].bbox.maxY).toBeCloseTo(25.4, 9);
    expect(r.warnings).toEqual([]);
  });

  it('birimsiz dosyada mm varsayar ve uyarır', () => {
    const r = importDxf(noUnitsDxf(), 'b.dxf');
    expect(r.units.assumed).toBe(true);
    expect(r.parts[0].bbox.maxX).toBe(10);
    expect(r.warnings).toContainEqual({ code: 'UNITS_ASSUMED_MM' });
  });

  it('kullanıcı birimi zorlayabilir', () => {
    const r = importDxf(noUnitsDxf(), 'b.dxf', { forceUnits: 1 });
    expect(r.parts[0].bbox.maxX).toBeCloseTo(254, 9);
    expect(r.warnings).toEqual([]);
  });
});

describe('importDxf — INSERT/BLOCK', () => {
  it('dönmüş, aynalı ve dizi INSERT\'leri doğru yere koyar', () => {
    const r = importDxf(blocksDxf(), 'blok.dxf');
    // 1 düz + 1 dönmüş + 1 aynalı + 4 dizi = 7 parça, her biri 1 delikli.
    expect(r.parts).toHaveLength(7);
    for (const p of r.parts) {
      expect(p.holes).toHaveLength(1);
      // Delik poligonu küçük kalır → net alan biraz büyük çıkar.
      expectChordArea(p.area, 50 * 30 - Math.PI * 25, 2 * Math.PI * 5, -1);
    }
    const origins = r.parts.map((p) => `${Math.round(p.origin.x)},${Math.round(p.origin.y)}`).sort();
    expect(origins).toEqual(['0,0', '0,200', '0,300', '100,200', '100,300', '170,0', '250,0']);

    const byOrigin = (x: number, y: number) =>
      r.parts.find((p) => Math.abs(p.origin.x - x) < 1e-6 && Math.abs(p.origin.y - y) < 1e-6);
    // 90° dönmüş: (200,0) etrafında → x ∈ [170,200], y ∈ [0,50]
    const rot = byOrigin(170, 0)!;
    expect(rot).toBeDefined();
    expect(rot.bbox.maxX).toBeCloseTo(30, 9);
    expect(rot.bbox.maxY).toBeCloseTo(50, 9);
    // Delik merkezi dönmüş konumda: blok (15,15) → dünya (200−15, 15) = (185, 15) → yerel (15, 15)
    // Aynalı: x ∈ [250,300], delik merkezi 300−15 = 285 → yerel 35
    const mir = byOrigin(250, 0)!;
    expect(mir).toBeDefined();
    const hole = mir.holes[0].segments[0];
    expect(hole.kind).toBe('arc');
    if (hole.kind === 'arc') {
      expect(hole.center.x).toBeCloseTo(35, 9);
      expect(hole.center.y).toBeCloseTo(15, 9);
    }
    // Dizi: (0,200), (100,200), (0,300), (100,300)
    for (const [x, y] of [
      [0, 200],
      [100, 200],
      [0, 300],
      [100, 300],
    ]) {
      expect(byOrigin(x, y)).toBeDefined();
    }
  });

  it('extrusion Z = −1 olan (aynalanmış) daire ve yay doğru tarafa düşer', () => {
    // OCS'de merkez (−50, 0) → WCS (50, 0).
    const b = new DxfBuilder().headerVar('$INSUNITS', 70, 4).circle({ x: -50, y: 0 }, 10, '0', -1);
    // OCS'de (−100,0) merkezli, 0°→180° üst yarım yay → WCS'de (100,0) merkezli
    // üst yarım yay; yön CW olur. Kapatmak için çap çizgisi.
    b.arc({ x: -100, y: 0 }, 10, 0, 180, '0', -1).line({ x: 90, y: 0 }, { x: 110, y: 0 });
    const r = importDxf(b.toString(), 'ayna.dxf');
    expect(r.parts).toHaveLength(2);
    const origins = r.parts.map((p) => [Math.round(p.origin.x), Math.round(p.origin.y)]).sort((a, c) => a[0] - c[0]);
    expect(origins).toEqual([
      [40, -10],
      [90, 0],
    ]);
  });

  it('bulunamayan blok uyarı verir, çökmez', () => {
    const b = new DxfBuilder().headerVar('$INSUNITS', 70, 4).insert('YOK', { x: 0, y: 0 });
    const r = importDxf(b.toString(), 'x.dxf');
    expect(r.warnings).toContainEqual({ code: 'BLOCK_NOT_FOUND', name: 'YOK' });
    expect(r.warnings).toContainEqual({ code: 'NO_GEOMETRY' });
  });
});

describe('importDxf — eğriler', () => {
  it('ELLIPSE ve iki SPLINE\'dan kapalı konturlar', () => {
    const r = importDxf(curvesDxf(), 'e.dxf', { chordTolerance: CHORD });
    expect(r.parts).toHaveLength(2);
    const ell = r.parts.find((p) => p.outer.segments[0].kind === 'ellipse')!;
    expect(ell).toBeDefined();
    // Elips çevresi (Ramanujan) ≈ 290.6 mm
    expectChordArea(ell.area, Math.PI * 60 * 30, 291);
    // bbox ayrıklaştırılmış halkadan hesaplanır → en fazla kiriş sapması kadar küçük.
    expect(120 - ell.bbox.maxX).toBeLessThanOrEqual(CHORD);
    expect(60 - ell.bbox.maxY).toBeLessThanOrEqual(CHORD);
    const drop = r.parts.find((p) => p !== ell)!;
    expect(drop.outer.segments).toHaveLength(2);
    expect(drop.outer.segments.every((s) => s.kind === 'poly')).toBe(true);
  });

  it('yazı ve ölçüleri yok sayar ve sayar', () => {
    const b = new DxfBuilder().headerVar('$INSUNITS', 70, 4).text({ x: 0, y: 0 }, 'Parça 1').circle({ x: 0, y: 0 }, 5);
    const r = importDxf(b.toString(), 't.dxf');
    expect(r.parts).toHaveLength(1);
    expect(r.warnings).toContainEqual({ code: 'IGNORED_ENTITIES', counts: { TEXT: 1 } });
  });
});
