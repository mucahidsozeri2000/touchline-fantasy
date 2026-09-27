import { SUPPORTED_UNIT_CODES } from '../core/dxf/units';
import type { ImportedPart } from '../core/dxf/types';
import { tr } from '../i18n/tr';
import type { LoadedFile } from '../state/store';
import { PartThumb } from './PartThumb';

interface Props {
  files: LoadedFile[];
  colorOf: Map<string, number>;
  hoveredPartId: string | null;
  onHoverPart(id: string | null): void;
  onRemoveFile(id: string): void;
  onSetUnits(id: string, code: number): void;
}

function PartRow({
  part,
  colorIndex,
  hot,
  onHover,
}: {
  part: ImportedPart;
  colorIndex: number;
  hot: boolean;
  onHover(id: string | null): void;
}) {
  return (
    <li
      onMouseEnter={() => onHover(part.id)}
      onMouseLeave={() => onHover(null)}
      className={`flex items-center gap-3 rounded-md px-2 py-1.5 ${hot ? 'bg-sky-50' : ''}`}
    >
      <PartThumb part={part} colorIndex={colorIndex} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-800" title={part.name}>
          {part.name}
        </div>
        <div className="text-xs text-slate-500">
          {tr.format.size(part.bbox.maxX, part.bbox.maxY)} mm · {tr.parts.holes(part.holes.length)}
        </div>
      </div>
      <div className="text-right text-xs tabular-nums text-slate-600">{tr.format.area(part.area)}</div>
    </li>
  );
}

export function PartList({ files, colorOf, hoveredPartId, onHoverPart, onRemoveFile, onSetUnits }: Props) {
  if (!files.length) return <p className="px-1 text-sm text-slate-500">{tr.parts.empty}</p>;
  return (
    <div className="flex flex-col gap-3">
      {files.map((f) => (
        <section key={f.id} className="rounded-lg border border-slate-200 bg-white">
          <header className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-800" title={f.name}>
                {f.name}
              </div>
              {f.status === 'ok' && f.result && (
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span>{tr.parts.partCount(f.result.parts.length)}</span>
                  {f.result.openContours.length > 0 && (
                    <span className="font-medium text-red-600">{tr.parts.openCount(f.result.openContours.length)}</span>
                  )}
                  <label className="flex items-center gap-1">
                    <span className="sr-only">Birim</span>
                    <select
                      className="rounded border border-slate-200 bg-white px-1 py-0 text-xs"
                      value={f.result.units.used}
                      onChange={(e) => onSetUnits(f.id, Number(e.target.value))}
                      title={tr.units.detected(f.result.units.used)}
                    >
                      {SUPPORTED_UNIT_CODES.map((c) => (
                        <option key={c} value={c}>
                          {tr.units.name(c)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              {f.status === 'loading' && <div className="text-xs text-sky-600">{tr.parts.loading}</div>}
            </div>
            <button
              type="button"
              onClick={() => onRemoveFile(f.id)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title={tr.parts.removeFile}
              aria-label={tr.parts.removeFile}
            >
              ✕
            </button>
          </header>
          {f.status === 'error' && <p className="px-3 py-2 text-sm text-red-700">{f.error}</p>}
          {f.result && f.result.warnings.length > 0 && (
            <ul className="space-y-1 border-b border-slate-100 px-3 py-2">
              {f.result.warnings.map((w, i) => (
                <li
                  key={i}
                  className={`text-xs ${
                    w.code === 'OPEN_CONTOURS' || w.code === 'NO_GEOMETRY' ? 'font-medium text-red-700' : 'text-amber-700'
                  }`}
                >
                  ⚠ {tr.warning(w)}
                </li>
              ))}
            </ul>
          )}
          {f.result && f.result.parts.length > 0 && (
            <ul className="p-1">
              {f.result.parts.map((p) => (
                <PartRow
                  key={p.id}
                  part={p}
                  colorIndex={colorOf.get(p.id) ?? 0}
                  hot={hoveredPartId === p.id}
                  onHover={onHoverPart}
                />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
