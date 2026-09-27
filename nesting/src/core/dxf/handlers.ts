/**
 * dxf-parser için özel entity okuyucuları.
 *
 * Neden: dxf-parser 1.1.2'nin yerleşik okuyucularında nesting için kritik
 * eksikler var:
 *  - CIRCLE ve ELLIPSE extrusion yönünü (210/220/230) okumuyor. AutoCAD'de
 *    aynalanmış (MIRROR) daireler/yaylar extrusion Z = -1 ile yazılır; bunu
 *    okumazsak daire merkezi yanlış tarafa düşer.
 *  - SPLINE ağırlıklarını (41) okumuyor → rasyonel NURBS'ler (bazı CAD'ler
 *    daireleri böyle yazar) yanlış şekilde çıkar.
 *  - LWPOLYLINE köşe okuyucusu, köşe grubunda bilinmeyen bir kod (ör. 91
 *    vertex id) görünce köşeleri erken kesiyor.
 * Bu yüzden bu dört entity'yi kendimiz okuyoruz; kalan her şey kütüphanede.
 *
 * Okuyucu sözleşmesi (dxf-parser): parseEntity, `curr` = {0, TİP} ile çağrılır;
 * dönüşte scanner.lastReadGroup bir sonraki entity'nin 0 grubunda olmalı.
 */

interface Group {
  code: number;
  value: number | string | boolean;
}

interface Scanner {
  next(): Group;
  isEOF(): boolean;
}

interface Point3 {
  x: number;
  y: number;
  z?: number;
}

/** Tüm özel entity'lerin ortak alanları. */
export interface CommonProps {
  type: string;
  layer?: string;
  handle?: string | number;
  inPaperSpace?: boolean;
}

export interface CircleEntity extends CommonProps {
  type: 'CIRCLE';
  center: Point3;
  radius: number;
  extrusionZ: number;
}

export interface EllipseEntity extends CommonProps {
  type: 'ELLIPSE';
  center: Point3;
  majorAxisEndPoint: Point3;
  axisRatio: number;
  startParam: number;
  endParam: number;
  extrusionZ: number;
}

export interface LwVertex {
  x: number;
  y: number;
  bulge: number;
}

export interface LwPolylineEntity extends CommonProps {
  type: 'LWPOLYLINE';
  vertices: LwVertex[];
  closed: boolean;
  extrusionZ: number;
}

export interface SplineEntity extends CommonProps {
  type: 'SPLINE';
  degree: number;
  knots: number[];
  controlPoints: Point3[];
  weights: number[];
  fitPoints: Point3[];
  closed: boolean;
  periodic: boolean;
  rational: boolean;
}

/** Bir entity'nin tüm gruplarını (sonlandıran 0 grubu hariç) okur. */
function readGroups(scanner: Scanner): Group[] {
  const groups: Group[] = [];
  let g = scanner.next();
  while (!scanner.isEOF() && g.code !== 0) {
    groups.push(g);
    g = scanner.next();
  }
  return groups;
}

function applyCommon(e: CommonProps, g: Group): boolean {
  switch (g.code) {
    case 8:
      e.layer = String(g.value);
      return true;
    case 5:
      e.handle = g.value as string;
      return true;
    case 67:
      e.inPaperSpace = g.value !== 0;
      return true;
    default:
      return false;
  }
}

const num = (g: Group): number => (typeof g.value === 'number' ? g.value : Number(g.value));

/**
 * Noktalar ayrı gruplar halinde gelir (10/20/30, 11/21/31 ...). Her X kodu
 * yeni bir nokta başlatır; Y/Z kodları son başlatılan noktaya yazılır.
 */
class PointCollector {
  readonly points: Point3[] = [];
  private current: Point3 | null = null;
  constructor(private readonly xCode: number) {}
  accept(g: Group): boolean {
    if (g.code === this.xCode) {
      this.current = { x: num(g), y: 0 };
      this.points.push(this.current);
      return true;
    }
    if (g.code === this.xCode + 10 && this.current) {
      this.current.y = num(g);
      return true;
    }
    if (g.code === this.xCode + 20 && this.current) {
      this.current.z = num(g);
      return true;
    }
    return false;
  }
}

export class CircleHandler {
  ForEntityName = 'CIRCLE' as const;
  parseEntity(scanner: Scanner): CircleEntity {
    const e: CircleEntity = { type: 'CIRCLE', center: { x: 0, y: 0 }, radius: 0, extrusionZ: 1 };
    const c = new PointCollector(10);
    for (const g of readGroups(scanner)) {
      if (c.accept(g)) continue;
      if (g.code === 40) e.radius = num(g);
      else if (g.code === 230) e.extrusionZ = num(g);
      else applyCommon(e, g);
    }
    if (c.points[0]) e.center = c.points[0];
    return e;
  }
}

export class EllipseHandler {
  ForEntityName = 'ELLIPSE' as const;
  parseEntity(scanner: Scanner): EllipseEntity {
    const e: EllipseEntity = {
      type: 'ELLIPSE',
      center: { x: 0, y: 0 },
      majorAxisEndPoint: { x: 1, y: 0 },
      axisRatio: 1,
      startParam: 0,
      endParam: 2 * Math.PI,
      extrusionZ: 1,
    };
    const c = new PointCollector(10);
    const m = new PointCollector(11);
    for (const g of readGroups(scanner)) {
      if (c.accept(g) || m.accept(g)) continue;
      if (g.code === 40) e.axisRatio = num(g);
      else if (g.code === 41) e.startParam = num(g);
      else if (g.code === 42) e.endParam = num(g);
      else if (g.code === 230) e.extrusionZ = num(g);
      else applyCommon(e, g);
    }
    if (c.points[0]) e.center = c.points[0];
    if (m.points[0]) e.majorAxisEndPoint = m.points[0];
    return e;
  }
}

export class LwPolylineHandler {
  ForEntityName = 'LWPOLYLINE' as const;
  parseEntity(scanner: Scanner): LwPolylineEntity {
    const e: LwPolylineEntity = { type: 'LWPOLYLINE', vertices: [], closed: false, extrusionZ: 1 };
    let v: LwVertex | null = null;
    for (const g of readGroups(scanner)) {
      switch (g.code) {
        case 10:
          v = { x: num(g), y: 0, bulge: 0 };
          e.vertices.push(v);
          break;
        case 20:
          if (v) v.y = num(g);
          break;
        case 42:
          // Bulge, ait olduğu köşeden bir sonrakine giden kenarı tanımlar.
          if (v) v.bulge = num(g);
          break;
        case 70:
          e.closed = (num(g) & 1) === 1;
          break;
        case 230:
          e.extrusionZ = num(g);
          break;
        default:
          applyCommon(e, g);
      }
    }
    return e;
  }
}

export class SplineHandler {
  ForEntityName = 'SPLINE' as const;
  parseEntity(scanner: Scanner): SplineEntity {
    const e: SplineEntity = {
      type: 'SPLINE',
      degree: 3,
      knots: [],
      controlPoints: [],
      weights: [],
      fitPoints: [],
      closed: false,
      periodic: false,
      rational: false,
    };
    const cp = new PointCollector(10);
    const fp = new PointCollector(11);
    for (const g of readGroups(scanner)) {
      if (cp.accept(g) || fp.accept(g)) continue;
      switch (g.code) {
        case 40:
          e.knots.push(num(g));
          break;
        case 41:
          e.weights.push(num(g));
          break;
        case 70: {
          const f = num(g);
          e.closed = (f & 1) !== 0;
          e.periodic = (f & 2) !== 0;
          e.rational = (f & 4) !== 0;
          break;
        }
        case 71:
          e.degree = num(g);
          break;
        default:
          applyCommon(e, g);
      }
    }
    e.controlPoints = cp.points;
    e.fitPoints = fp.points;
    return e;
  }
}

/**
 * Geometri taşımayan (veya nesting için anlamsız) entity'ler. Kütüphane bunları
 * sessizce atlıyor; biz sayabilmek ve kullanıcıya "N adet yazı/ölçü yok sayıldı"
 * diyebilmek için tip adıyla boş bir kayıt üretiyoruz.
 */
export const IGNORED_ENTITY_TYPES = [
  'HATCH',
  'LEADER',
  'MLEADER',
  'MULTILEADER',
  'IMAGE',
  'WIPEOUT',
  'RAY',
  'XLINE',
  'REGION',
  '3DSOLID',
  'BODY',
  'VIEWPORT',
  'ATTRIB',
  'TOLERANCE',
  'OLE2FRAME',
  'TRACE',
  'SHAPE',
] as const;

export function makeIgnoredHandler(typeName: string) {
  return class {
    ForEntityName = typeName;
    parseEntity(scanner: Scanner): CommonProps {
      const e: CommonProps = { type: typeName };
      for (const g of readGroups(scanner)) applyCommon(e, g);
      return e;
    }
  };
}
