/**
 * DXF içe aktarma giriş noktası:
 *   metin → dxf-parser → segmentler (mm, WCS) → zincirleme → hiyerarşi → parçalar
 */
import DxfParser from 'dxf-parser';
import type { IDxf } from 'dxf-parser';
import type { Vec2 } from '../geometry/types';
import { bboxOf, dedupeRing, signedArea, area as ringArea } from '../geometry/polygon';
import { translation } from '../geometry/transform';
import { chainSegments, chainToPoints } from './chain';
import {
  CircleHandler,
  EllipseHandler,
  IGNORED_ENTITY_TYPES,
  LwPolylineHandler,
  SplineHandler,
  makeIgnoredHandler,
} from './handlers';
import { buildHierarchy } from './hierarchy';
import { normalizeDxf } from './normalize';
import { type Segment, reverseSeg, segEnd, segStart, transformSeg } from './segments';
import { resolveUnits } from './units';
import {
  type Contour,
  DEFAULT_IMPORT_OPTIONS,
  DxfImportError,
  type DxfImportResult,
  type ImportOptions,
  type ImportWarning,
  type ImportedPart,
  type OpenContour,
} from './types';

function createParser(): DxfParser {
  const parser = new DxfParser();
  // Özel okuyucular yerleşikleri geçersiz kılar (bkz. handlers.ts).
  // dxf-parser'ın tip tanımı yalnızca bilinen entity adlarını kabul ediyor;
  // çalışma zamanında herhangi bir ad geçerli.
  const register = (h: unknown) => parser.registerEntityHandler(h as Parameters<DxfParser['registerEntityHandler']>[0]);
  register(CircleHandler);
  register(EllipseHandler);
  register(LwPolylineHandler);
  register(SplineHandler);
  for (const t of IGNORED_ENTITY_TYPES) register(makeIgnoredHandler(t));
  return parser;
}

export function parseDxfText(text: string): IDxf {
  if (!text || !text.trim()) throw new DxfImportError('EMPTY_FILE');
  if (text.startsWith('AutoCAD Binary DXF')) throw new DxfImportError('BINARY_DXF');
  let dxf: IDxf | null;
  try {
    dxf = createParser().parseSync(text);
  } catch (err) {
    throw new DxfImportError('PARSE_FAILED', err instanceof Error ? err.message : String(err));
  }
  if (!dxf) throw new DxfImportError('PARSE_FAILED');
  return dxf;
}

/** Konturu istenen yöne çevirir (segmentler dahil). */
function orient(segs: Segment[], ring: Vec2[], ccw: boolean): Contour {
  const isCcw = signedArea(ring) > 0;
  if (isCcw === ccw) return { segments: segs, ring };
  return { segments: segs.map(reverseSeg).reverse(), ring: [...ring].reverse() };
}

function baseName(fileName: string): string {
  const slash = Math.max(fileName.lastIndexOf('/'), fileName.lastIndexOf('\\'));
  const name = fileName.slice(slash + 1);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

export function importDxf(text: string, fileName: string, options: Partial<ImportOptions> = {}): DxfImportResult {
  const opts: ImportOptions = { ...DEFAULT_IMPORT_OPTIONS, ...options };
  const dxf = parseDxfText(text);
  const warnings: ImportWarning[] = [];

  const rawUnits = dxf.header?.['$INSUNITS'];
  const units = resolveUnits(typeof rawUnits === 'number' ? rawUnits : null, opts.forceUnits);
  if (units.unsupported) warnings.push({ code: 'UNITS_UNSUPPORTED', insunits: units.insunits! });
  else if (units.assumed) warnings.push({ code: 'UNITS_ASSUMED_MM' });

  const norm = normalizeDxf(dxf, units.scale, opts.chordTolerance);
  warnings.push(...norm.warnings);

  const chains = chainSegments(norm.segments, opts.pointTolerance, opts.chordTolerance);
  if (chains.duplicatesRemoved) warnings.push({ code: 'DUPLICATES_REMOVED', count: chains.duplicatesRemoved });
  if (chains.ambiguousPoints.length) {
    warnings.push({ code: 'AMBIGUOUS_JUNCTIONS', count: chains.ambiguousPoints.length, points: chains.ambiguousPoints });
  }

  // Kapalı zincirler → halkalar. Uç uca yapışmadan kalan mikro kopuklukları
  // (≤ tolerans) dedupe ile yok ediyoruz.
  const closed = chains.closed
    .map((segs) => ({ segs, ring: dedupeRing(chainToPoints(segs, opts.chordTolerance), opts.pointTolerance / 2) }))
    .filter((c) => c.ring.length >= 3 && ringArea(c.ring) > opts.pointTolerance ** 2);

  const nodes = buildHierarchy(
    closed.map((c) => c.ring),
    opts.pointTolerance,
  );

  const base = baseName(fileName);
  const rawParts: { outer: Contour; holes: Contour[] }[] = [];
  const partOf = new Map<number, number>();
  for (const n of nodes) {
    if (n.depth % 2 === 0) {
      partOf.set(n.index, rawParts.length);
      rawParts.push({ outer: orient(closed[n.index].segs, closed[n.index].ring, true), holes: [] });
    }
  }
  for (const n of nodes) {
    if (n.depth % 2 === 1) {
      const pi = partOf.get(n.parent);
      if (pi !== undefined) rawParts[pi].holes.push(orient(closed[n.index].segs, closed[n.index].ring, false));
    }
  }

  // Parça sırası çizimdeki okuma sırasına yakın olsun: üst kenarı yüksek olan
  // önce, eşitlikte soldaki önce.
  const withBox = rawParts.map((p) => ({ ...p, bbox: bboxOf(p.outer.ring) }));
  withBox.sort((a, b) => b.bbox.maxY - a.bbox.maxY || a.bbox.minX - b.bbox.minX);

  const parts: ImportedPart[] = withBox.map((p, i) => {
    // Yerel koordinatlar: bbox'ın sol-alt köşesi orijin. Nesting parçayı bu
    // çerçevede döndürüp öteleyecek; `origin` DXF'teki gerçek konumu saklar.
    const origin = { x: p.bbox.minX, y: p.bbox.minY };
    const t = translation(-origin.x, -origin.y);
    const move = (c: Contour): Contour => ({
      segments: c.segments.map((s) => transformSeg(s, t)),
      ring: c.ring.map((q) => ({ x: q.x - origin.x, y: q.y - origin.y })),
    });
    const outer = move(p.outer);
    const holes = p.holes.map(move);
    const area = ringArea(outer.ring) - holes.reduce((s, h) => s + ringArea(h.ring), 0);
    return {
      id: `${base}#${i + 1}`,
      name: withBox.length === 1 ? base : `${base}_${i + 1}`,
      outer,
      holes,
      bbox: bboxOf(outer.ring),
      area,
      origin,
    };
  });

  const openContours: OpenContour[] = chains.open.map((segs) => ({
    segments: segs,
    points: chainToPoints(segs, opts.chordTolerance),
    start: segStart(segs[0]),
    end: segEnd(segs[segs.length - 1]),
  }));
  if (openContours.length) warnings.push({ code: 'OPEN_CONTOURS', count: openContours.length });
  if (!parts.length && !openContours.length) warnings.push({ code: 'NO_GEOMETRY' });

  return {
    parts,
    openContours,
    warnings,
    units,
    stats: {
      entityCount: norm.entityCount,
      segmentCount: norm.segments.length,
      closedContourCount: closed.length,
    },
  };
}
