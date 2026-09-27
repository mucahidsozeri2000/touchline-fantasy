/**
 * Düşük seviyeli DXF metin üreticisi (grup kodu / değer çiftleri).
 *
 * Şu an test fixture'ları ve arayüzdeki örnek dosya için kullanılıyor; M6'da
 * R12 çıktısının temeli olacak. Bu sınıf sürüm kısıtı UYGULAMAZ: LWPOLYLINE,
 * SPLINE, ELLIPSE gibi R13+ entity'leri de yazabilir (içe aktarma testleri
 * için gerekli). R12 uyumlu çıktı katmanı M6'da bunun üzerine kurulacak.
 */

export interface P {
  x: number;
  y: number;
}

const fmt = (n: number): string => {
  // Gereksiz uzun ondalıklardan kaçın ama hassasiyeti koru (1e-9 mm).
  const r = Math.round(n * 1e9) / 1e9;
  return Object.is(r, -0) ? '0' : String(r);
};

export class DxfBuilder {
  private readonly header: string[] = [];
  private readonly blocks: string[] = [];
  private readonly entities: string[] = [];
  private target: string[] = this.entities;

  /** Aktif hedefe (ENTITIES ya da o an açık BLOCK) bir grup yazar. */
  private g(code: number, value: string | number) {
    this.target.push(String(code), typeof value === 'number' ? fmt(value) : value);
  }

  headerVar(name: string, code: number, value: number | string): this {
    this.header.push('9', name, String(code), typeof value === 'number' ? fmt(value) : value);
    return this;
  }

  /** `fn` içinde eklenen entity'ler blok tanımına gider. */
  block(name: string, base: P, fn: (b: this) => void): this {
    this.target = this.blocks;
    this.g(0, 'BLOCK');
    this.g(8, '0');
    this.g(2, name);
    this.g(70, 0);
    this.pt(10, base);
    this.g(3, name);
    fn(this);
    this.g(0, 'ENDBLK');
    this.g(8, '0');
    this.target = this.entities;
    return this;
  }

  private pt(code: number, p: P) {
    this.g(code, p.x);
    this.g(code + 10, p.y);
    this.g(code + 20, 0);
  }

  private start(type: string, layer: string) {
    this.g(0, type);
    this.g(8, layer);
  }

  private extrusion(z: number) {
    if (z !== 1) {
      this.g(210, 0);
      this.g(220, 0);
      this.g(230, z);
    }
  }

  line(a: P, b: P, layer = '0'): this {
    this.start('LINE', layer);
    this.pt(10, a);
    this.pt(11, b);
    return this;
  }

  /** Açılar derece, DXF kuralı: start→end CCW (OCS'de). */
  arc(c: P, r: number, startDeg: number, endDeg: number, layer = '0', extrusionZ = 1): this {
    this.start('ARC', layer);
    this.pt(10, c);
    this.g(40, r);
    this.g(50, startDeg);
    this.g(51, endDeg);
    this.extrusion(extrusionZ);
    return this;
  }

  circle(c: P, r: number, layer = '0', extrusionZ = 1): this {
    this.start('CIRCLE', layer);
    this.pt(10, c);
    this.g(40, r);
    this.extrusion(extrusionZ);
    return this;
  }

  /** R12 uyumlu 2B POLYLINE (VERTEX ... SEQEND), bulge destekli. */
  polyline(pts: (P & { bulge?: number })[], closed: boolean, layer = '0'): this {
    this.start('POLYLINE', layer);
    this.g(66, 1);
    this.pt(10, { x: 0, y: 0 });
    this.g(70, closed ? 1 : 0);
    for (const p of pts) {
      this.start('VERTEX', layer);
      this.pt(10, p);
      if (p.bulge) this.g(42, p.bulge);
    }
    this.start('SEQEND', layer);
    return this;
  }

  lwpolyline(pts: (P & { bulge?: number })[], closed: boolean, layer = '0', extrusionZ = 1): this {
    this.start('LWPOLYLINE', layer);
    this.g(100, 'AcDbEntity');
    this.g(100, 'AcDbPolyline');
    this.g(90, pts.length);
    this.g(70, closed ? 1 : 0);
    for (const p of pts) {
      this.g(10, p.x);
      this.g(20, p.y);
      if (p.bulge) this.g(42, p.bulge);
    }
    this.extrusion(extrusionZ);
    return this;
  }

  /** Parametreler radyan (DXF ELLIPSE kuralı). */
  ellipse(c: P, majorEnd: P, ratio: number, startParam = 0, endParam = Math.PI * 2, layer = '0'): this {
    this.start('ELLIPSE', layer);
    this.pt(10, c);
    this.pt(11, majorEnd);
    this.g(40, ratio);
    this.g(41, startParam);
    this.g(42, endParam);
    return this;
  }

  spline(degree: number, knots: number[], controlPoints: P[], opts: { weights?: number[]; closed?: boolean; layer?: string } = {}): this {
    this.start('SPLINE', opts.layer ?? '0');
    const flags = (opts.closed ? 1 : 0) | (opts.weights ? 4 : 0) | 8;
    this.g(70, flags);
    this.g(71, degree);
    this.g(72, knots.length);
    this.g(73, controlPoints.length);
    this.g(74, 0);
    for (const k of knots) this.g(40, k);
    if (opts.weights) for (const w of opts.weights) this.g(41, w);
    for (const p of controlPoints) this.pt(10, p);
    return this;
  }

  insert(
    name: string,
    pos: P,
    opts: { sx?: number; sy?: number; rotDeg?: number; cols?: number; rows?: number; colSpacing?: number; rowSpacing?: number; layer?: string } = {},
  ): this {
    this.start('INSERT', opts.layer ?? '0');
    this.g(2, name);
    this.pt(10, pos);
    if (opts.sx !== undefined) this.g(41, opts.sx);
    if (opts.sy !== undefined) this.g(42, opts.sy);
    if (opts.rotDeg !== undefined) this.g(50, opts.rotDeg);
    if (opts.cols !== undefined) this.g(70, opts.cols);
    if (opts.rows !== undefined) this.g(71, opts.rows);
    if (opts.colSpacing !== undefined) this.g(44, opts.colSpacing);
    if (opts.rowSpacing !== undefined) this.g(45, opts.rowSpacing);
    return this;
  }

  text(p: P, value: string, layer = '0'): this {
    this.start('TEXT', layer);
    this.pt(10, p);
    this.g(40, 5);
    this.g(1, value);
    return this;
  }

  toString(): string {
    // Büyük çizimlerde yüz binlerce satır olabilir: spread (...) yığın taşırır,
    // bu yüzden parçalar ayrı ayrı birleştirilir.
    const parts: string[] = [];
    const section = (name: string, body: string[]) => {
      parts.push(['0', 'SECTION', '2', name].join('\n'));
      if (body.length) parts.push(body.join('\n'));
      parts.push('0\nENDSEC');
    };
    section('HEADER', ['9', '$ACADVER', '1', 'AC1009'].concat(this.header));
    if (this.blocks.length) section('BLOCKS', this.blocks);
    section('ENTITIES', this.entities);
    parts.push('0\nEOF');
    return parts.join('\n') + '\n';
  }
}
