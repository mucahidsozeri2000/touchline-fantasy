/**
 * dxf-parser çıktısını dünya koordinatlarında (mm) segmentlere çevirir.
 *
 * Koordinat sistemleri:
 *  - LINE, SPLINE, ELLIPSE, 3D POLYLINE: WCS (dünya) koordinatlarında yazılır.
 *  - ARC, CIRCLE, LWPOLYLINE, 2D POLYLINE, INSERT: OCS (nesne koordinat
 *    sistemi) içindedir. Düz 2B çizimlerde OCS normali (0,0,±1)'dir.
 *    "Arbitrary axis" algoritmasına göre N = (0,0,−1) için OCS x ekseni
 *    dünya −x'e denk gelir: (x, y)_OCS → (−x, y)_WCS. Aynalanmış parçalar
 *    AutoCAD'de tam olarak böyle yazılır; bunu atlamak klasik bir hatadır.
 *    Normali Z'ye dik olmayan (eğik düzlemdeki) entity'ler yalnızca XY'ye
 *    izdüşürülür ve uyarı verilir.
 */
import type { IDxf, IBlock } from 'dxf-parser';
import type { Affine, Vec2 } from '../geometry/types';
import { IDENTITY, compose, rotation, scaling, translation } from '../geometry/transform';
import { type Segment, transformSeg, ccwSweep } from './segments';
import { discretizeNurbs, isValidNurbs } from './spline';
import { IGNORED_ENTITY_TYPES, type CircleEntity, type EllipseEntity, type LwPolylineEntity, type SplineEntity } from './handlers';
import type { ImportWarning } from './types';

/** dxf-parser'ın (ve bizim özel okuyucularımızın) ürettiği gevşek entity biçimi. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEntity = Record<string, any> & { type: string; layer?: string; inPaperSpace?: boolean };

const OCS_MIRROR: Affine = scaling(-1, 1);
const MAX_INSERT_DEPTH = 16;

export interface NormalizeResult {
  segments: Segment[];
  warnings: ImportWarning[];
  entityCount: number;
}

interface Ctx {
  dxf: IDxf;
  chordTol: number;
  segments: Segment[];
  nextSource: number;
  ignored: Record<string, number>;
  invalid: Record<string, number>;
  nonPlanar: number;
  fitOnly: number;
  entityCount: number;
  warnings: ImportWarning[];
  blockStack: string[];
  reportedBlocks: Set<string>;
}

/** Geometri taşımayan (yazı, ölçü, tarama...) entity tipleri — sayılıp atlanır. */
const IGNORED = new Set<string>(['TEXT', 'MTEXT', 'DIMENSION', 'POINT', 'SOLID', '3DFACE', 'ATTDEF', ...IGNORED_ENTITY_TYPES]);

export function normalizeDxf(dxf: IDxf, unitScale: number, chordTol: number): NormalizeResult {
  const ctx: Ctx = {
    dxf,
    chordTol,
    segments: [],
    nextSource: 1,
    ignored: {},
    invalid: {},
    nonPlanar: 0,
    fitOnly: 0,
    entityCount: 0,
    warnings: [],
    blockStack: [],
    reportedBlocks: new Set(),
  };
  const world = scaling(unitScale, unitScale);
  for (const e of (dxf.entities ?? []) as unknown as AnyEntity[]) {
    if (e.inPaperSpace) continue;
    processEntity(ctx, e, world, unitScale);
  }
  if (Object.keys(ctx.ignored).length) ctx.warnings.push({ code: 'IGNORED_ENTITIES', counts: ctx.ignored });
  if (Object.keys(ctx.invalid).length) ctx.warnings.push({ code: 'INVALID_ENTITIES', counts: ctx.invalid });
  if (ctx.nonPlanar) ctx.warnings.push({ code: 'NON_PLANAR', count: ctx.nonPlanar });
  if (ctx.fitOnly) ctx.warnings.push({ code: 'SPLINE_FIT_POINTS_ONLY', count: ctx.fitOnly });
  return { segments: ctx.segments, warnings: ctx.warnings, entityCount: ctx.entityCount };
}

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const validPt = (p: unknown): p is Vec2 =>
  !!p && isFiniteNum((p as Vec2).x) && isFiniteNum((p as Vec2).y);

function markInvalid(ctx: Ctx, type: string) {
  ctx.invalid[type] = (ctx.invalid[type] ?? 0) + 1;
}

/**
 * OCS normalinin Z bileşenine göre OCS→WCS dönüşümü. Z negatifse x aynalanır.
 * Normal Z eksenine paralel değilse sadece izdüşüm yapılır (uyarı sayılır).
 */
function ocs(ctx: Ctx, nz: number | undefined, nx = 0, ny = 0): Affine {
  if (Math.abs(nx) > 1e-6 || Math.abs(ny) > 1e-6) ctx.nonPlanar++;
  return nz !== undefined && nz < 0 ? OCS_MIRROR : IDENTITY;
}

function emit(ctx: Ctx, segs: Segment[], m: Affine) {
  for (const s of segs) ctx.segments.push(transformSeg(s, m));
}

/**
 * @param m    bu entity'nin koordinatlarından mm-WCS'ye tam dönüşüm
 * @param unitScale sadece tolerans çevirmek için (m içinde zaten var)
 */
function processEntity(ctx: Ctx, e: AnyEntity, m: Affine, unitScale: number): void {
  ctx.entityCount++;
  const layer = e.layer ?? '0';
  const source = ctx.nextSource++;
  const type = e.type;

  if (IGNORED.has(type)) {
    ctx.ignored[type] = (ctx.ignored[type] ?? 0) + 1;
    return;
  }

  switch (type) {
    case 'LINE': {
      const [a, b] = e.vertices ?? [];
      if (!validPt(a) || !validPt(b)) return markInvalid(ctx, type);
      emit(ctx, [{ kind: 'line', source, layer, a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } }], m);
      return;
    }
    case 'ARC': {
      if (!validPt(e.center) || !isFiniteNum(e.radius) || e.radius <= 0) return markInvalid(ctx, type);
      const o = ocs(ctx, e.extrusionDirectionZ, e.extrusionDirectionX, e.extrusionDirectionY);
      emit(
        ctx,
        [
          {
            kind: 'arc',
            source,
            layer,
            center: { x: e.center.x, y: e.center.y },
            radius: e.radius,
            start: e.startAngle ?? 0,
            // DXF yayları her zaman OCS'de start→end CCW'dir.
            sweep: ccwSweep(e.startAngle ?? 0, e.endAngle ?? 2 * Math.PI),
          },
        ],
        compose(m, o),
      );
      return;
    }
    case 'CIRCLE': {
      const c = e as unknown as CircleEntity;
      if (!validPt(c.center) || !isFiniteNum(c.radius) || c.radius <= 0) return markInvalid(ctx, type);
      const o = ocs(ctx, c.extrusionZ);
      emit(
        ctx,
        [{ kind: 'arc', source, layer, center: { x: c.center.x, y: c.center.y }, radius: c.radius, start: 0, sweep: 2 * Math.PI }],
        compose(m, o),
      );
      return;
    }
    case 'ELLIPSE': {
      const el = e as unknown as EllipseEntity;
      if (!validPt(el.center) || !validPt(el.majorAxisEndPoint) || !(el.axisRatio > 0)) return markInvalid(ctx, type);
      const u = { x: el.majorAxisEndPoint.x, y: el.majorAxisEndPoint.y };
      // Küçük eksen = oran · (N × büyük eksen). N = (0,0,±1) için:
      // N × (ux,uy,0) = ±(−uy, ux, 0). Merkez/eksen zaten WCS'dedir.
      const sgn = el.extrusionZ < 0 ? -1 : 1;
      const v = { x: -u.y * el.axisRatio * sgn, y: u.x * el.axisRatio * sgn };
      emit(
        ctx,
        [
          {
            kind: 'ellipse',
            source,
            layer,
            center: { x: el.center.x, y: el.center.y },
            u,
            v,
            start: el.startParam,
            sweep: ccwSweep(el.startParam, el.endParam),
          },
        ],
        m,
      );
      return;
    }
    case 'LWPOLYLINE': {
      const p = e as unknown as LwPolylineEntity;
      const verts = p.vertices.filter((v) => isFiniteNum(v.x) && isFiniteNum(v.y));
      if (verts.length < 2) return markInvalid(ctx, type);
      emit(ctx, bulgePolyline(verts, p.closed, source, layer), compose(m, ocs(ctx, p.extrusionZ)));
      return;
    }
    case 'POLYLINE': {
      if (e.isPolyfaceMesh || e.is3dPolygonMesh) {
        ctx.ignored[type + ' (mesh)'] = (ctx.ignored[type + ' (mesh)'] ?? 0) + 1;
        return;
      }
      // Eğri uydurmalı polyline'larda (flag 16) kontrol çerçevesi köşeleri de
      // listede bulunur; yalnızca eğri üzerindeki köşeleri alıyoruz.
      const verts = ((e.vertices ?? []) as AnyEntity[])
        .filter((v) => !v.splineControlPoint && isFiniteNum(v.x) && isFiniteNum(v.y))
        .map((v) => ({ x: v.x as number, y: v.y as number, bulge: e.is3dPolyline ? 0 : ((v.bulge as number) ?? 0) }));
      if (verts.length < 2) return markInvalid(ctx, type);
      const dir = e.extrusionDirection as { x?: number; y?: number; z?: number } | undefined;
      const o = e.is3dPolyline ? IDENTITY : ocs(ctx, dir?.z, dir?.x, dir?.y);
      emit(ctx, bulgePolyline(verts, !!e.shape, source, layer), compose(m, o));
      return;
    }
    case 'SPLINE': {
      const sp = e as unknown as SplineEntity;
      const cps = sp.controlPoints.map((p) => ({ x: p.x, y: p.y }));
      const curve = { degree: sp.degree, knots: sp.knots, controlPoints: cps, weights: sp.weights };
      let pts: Vec2[];
      if (cps.length >= 2 && isValidNurbs(curve)) {
        // Spline dosya biriminde ayrıklaştırılıyor → toleransı dosya birimine çevir.
        // (Düzgün olmayan INSERT ölçeği varsa en büyük ölçeğe göre güvenli taraf.)
        const s = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d)) || unitScale;
        pts = discretizeNurbs(curve, ctx.chordTol / s);
      } else if (sp.fitPoints.length >= 2) {
        // Yalnızca fit noktalı spline: gerçek eğri için teğet/knot bilgisi yok.
        // Fit noktalarından geçen çoklu çizgi en makul yaklaşım; uyarılır.
        ctx.fitOnly++;
        pts = sp.fitPoints.map((p) => ({ x: p.x, y: p.y }));
      } else if (cps.length >= 2) {
        markInvalid(ctx, type);
        pts = cps;
      } else {
        return markInvalid(ctx, type);
      }
      if (sp.closed && pts.length > 2) {
        const f = pts[0];
        const l = pts[pts.length - 1];
        if (f.x !== l.x || f.y !== l.y) pts = [...pts, f];
      }
      emit(ctx, [{ kind: 'poly', source, layer, points: pts }], m);
      return;
    }
    case 'INSERT': {
      processInsert(ctx, e, m, unitScale);
      return;
    }
    default:
      ctx.ignored[type] = (ctx.ignored[type] ?? 0) + 1;
  }
}

/**
 * Bulge'lı köşe listesinden segmentler.
 * Bulge b = tan(θ/4), θ = yayın işaretli merkez açısı (+ CCW).
 * Kiriş uzunluğu L için: r = L / (2·sin(|θ|/2)); merkez, kirişin orta
 * noktasından kirişin SOL normali boyunca d = (L/2)/tan(θ/2) kadar ötededir
 * (θ<0 ya da |θ|>π olduğunda d negatifleşir → merkez sağa düşer).
 */
export function bulgePolyline(
  verts: { x: number; y: number; bulge: number }[],
  closed: boolean,
  source: number,
  layer: string,
): Segment[] {
  const out: Segment[] = [];
  const n = verts.length;
  const count = closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    const p0 = verts[i];
    const p1 = verts[(i + 1) % n];
    const a = { x: p0.x, y: p0.y };
    const b = { x: p1.x, y: p1.y };
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L === 0) continue;
    const bulge = p0.bulge || 0;
    if (Math.abs(bulge) < 1e-12) {
      out.push({ kind: 'line', source, layer, a, b });
      continue;
    }
    const theta = 4 * Math.atan(bulge);
    const d = L / 2 / Math.tan(theta / 2);
    const nx = -(b.y - a.y) / L;
    const ny = (b.x - a.x) / L;
    const center = { x: (a.x + b.x) / 2 + nx * d, y: (a.y + b.y) / 2 + ny * d };
    const radius = L / (2 * Math.abs(Math.sin(theta / 2)));
    out.push({
      kind: 'arc',
      source,
      layer,
      center,
      radius,
      start: Math.atan2(a.y - center.y, a.x - center.x),
      sweep: theta,
    });
  }
  return out;
}

/**
 * INSERT: dünya = T(konum) · R(dönüş) · T(dizi ofseti) · S(ölçek) · T(−taban noktası).
 * Dizi (MINSERT) ofseti bloğun dönmüş eksenleri boyunca ama ÖLÇEKSİZ uygulanır.
 * Tümü OCS içindedir → en dışta OCS dönüşümü.
 */
function processInsert(ctx: Ctx, e: AnyEntity, m: Affine, unitScale: number) {
  const name = String(e.name ?? '');
  const block: IBlock | undefined = ctx.dxf.blocks?.[name];
  if (!block) {
    if (!ctx.reportedBlocks.has('nf:' + name)) {
      ctx.reportedBlocks.add('nf:' + name);
      ctx.warnings.push({ code: 'BLOCK_NOT_FOUND', name });
    }
    return;
  }
  if (block.xrefPath) {
    if (!ctx.reportedBlocks.has('x:' + name)) {
      ctx.reportedBlocks.add('x:' + name);
      ctx.warnings.push({ code: 'XREF_SKIPPED', name });
    }
    return;
  }
  if (ctx.blockStack.includes(name) || ctx.blockStack.length >= MAX_INSERT_DEPTH) {
    if (!ctx.reportedBlocks.has('r:' + name)) {
      ctx.reportedBlocks.add('r:' + name);
      ctx.warnings.push({ code: 'BLOCK_RECURSION', name });
    }
    return;
  }
  const pos = validPt(e.position) ? e.position : { x: 0, y: 0 };
  const base = validPt(block.position) ? block.position : { x: 0, y: 0 };
  const sx = isFiniteNum(e.xScale) && e.xScale !== 0 ? e.xScale : 1;
  const sy = isFiniteNum(e.yScale) && e.yScale !== 0 ? e.yScale : 1;
  const rot = ((isFiniteNum(e.rotation) ? e.rotation : 0) * Math.PI) / 180;
  const cols = Math.max(1, Math.floor(isFiniteNum(e.columnCount) ? e.columnCount : 1));
  const rows = Math.max(1, Math.floor(isFiniteNum(e.rowCount) ? e.rowCount : 1));
  const cs = isFiniteNum(e.columnSpacing) ? e.columnSpacing : 0;
  const rs = isFiniteNum(e.rowSpacing) ? e.rowSpacing : 0;
  const dir = e.extrusionDirection as { x?: number; y?: number; z?: number } | undefined;
  const o = ocs(ctx, dir?.z, dir?.x, dir?.y);

  ctx.blockStack.push(name);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let local = translation(-base.x, -base.y);
      local = compose(scaling(sx, sy), local);
      local = compose(translation(c * cs, r * rs), local);
      local = compose(rotation(rot), local);
      local = compose(translation(pos.x, pos.y), local);
      const full = compose(m, compose(o, local));
      for (const be of (block.entities ?? []) as unknown as AnyEntity[]) {
        processEntity(ctx, be, full, unitScale);
      }
    }
  }
  ctx.blockStack.pop();
}
