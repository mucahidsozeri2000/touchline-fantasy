import { tr } from '../i18n/tr';
import type { LoadedFile } from '../state/store';

/** M1: içe aktarma özeti. Nesting metrikleri M3/M4'te buraya eklenecek. */
export function SummaryPanel({ files }: { files: LoadedFile[] }) {
  const ok = files.filter((f) => f.result);
  const parts = ok.flatMap((f) => f.result!.parts);
  const open = ok.reduce((s, f) => s + f.result!.openContours.length, 0);
  const warnings = ok.reduce((s, f) => s + f.result!.warnings.length, 0);
  const area = parts.reduce((s, p) => s + p.area, 0);

  const rows: [string, string, boolean?][] = [
    [tr.metrics.fileCount, String(files.length)],
    [tr.metrics.partTypes, String(parts.length)],
    [tr.metrics.totalArea, tr.format.area(area)],
    [tr.metrics.openContours, String(open), open > 0],
    [tr.metrics.warnings, String(warnings)],
  ];

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{tr.metrics.heading}</h2>
      <dl className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        {rows.map(([k, v, bad]) => (
          <div key={k} className={`rounded-lg border px-3 py-2 ${bad ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
            <dt className="text-xs text-slate-500">{k}</dt>
            <dd className={`text-lg font-semibold tabular-nums ${bad ? 'text-red-700' : 'text-slate-800'}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-slate-400">{tr.metrics.nestingSoon}</p>
    </div>
  );
}
