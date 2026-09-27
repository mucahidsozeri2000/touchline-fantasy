import { useEffect, useState } from 'react';
import { densityOf } from '../core/materials';
import { scrapWeightKg } from '../core/placement/metrics';
import { tr } from '../i18n/tr';
import { type LoadedFile, type NestState, type SheetSettings, type PartSettings, DEFAULT_PART_SETTINGS } from '../state/store';

interface Props {
  files: LoadedFile[];
  nest: NestState;
  stale: boolean;
  sheet: SheetSettings;
  partSettings: Record<string, PartSettings>;
  onStart(): void;
  onStop(): void;
}

function Stat({ label, value, tone = 'normal' }: { label: string; value: string; tone?: 'normal' | 'bad' | 'good' }) {
  const box = tone === 'bad' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white';
  const text = tone === 'bad' ? 'text-red-700' : tone === 'good' ? 'text-emerald-700' : 'text-slate-800';
  return (
    <div className={`rounded-lg border px-3 py-2 ${box}`}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`text-lg font-semibold tabular-nums ${text}`}>{value}</dd>
    </div>
  );
}

function useElapsed(running: boolean, startedAt?: number) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, [running]);
  return running && startedAt !== undefined ? now - startedAt : 0;
}

export function MetricsPanel({ files, nest, stale, sheet, partSettings, onStart, onStop }: Props) {
  const running = nest.status === 'running';
  const elapsed = useElapsed(running, nest.startedAt);
  const parts = files.flatMap((f) => f.result?.parts ?? []);
  const totalCopies = parts.reduce((s, p) => s + Math.max(0, Math.floor((partSettings[p.id] ?? DEFAULT_PART_SETTINGS).quantity)), 0);
  const open = files.reduce((s, f) => s + (f.result?.openContours.length ?? 0), 0);
  const canStart = totalCopies > 0 && !files.some((f) => f.status === 'loading');
  const r = nest.result;
  const m = r?.metrics;

  return (
    <div className="flex flex-col gap-3">
      {running ? (
        <button
          type="button"
          onClick={onStop}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-lg font-bold text-white shadow hover:bg-red-700"
        >
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
          {tr.nest.stop}
        </button>
      ) : (
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-lg font-bold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          ▶ {tr.nest.start}
        </button>
      )}
      {running && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-full overflow-hidden rounded bg-slate-200">
            <div className="h-full w-1/3 animate-pulse rounded bg-emerald-500" />
          </div>
          <p className="text-xs text-slate-600">
            {tr.nest.running} {tr.format.seconds(elapsed)}
          </p>
        </div>
      )}
      {!canStart && !running && parts.length > 0 && totalCopies === 0 && <p className="text-xs text-amber-700">{tr.nest.noParts}</p>}
      {nest.status === 'error' && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{nest.error}</p>}
      {r && stale && !running && <p className="rounded bg-amber-50 p-2 text-xs text-amber-800">{tr.nest.stale}</p>}
      {r && r.validation.length > 0 && <p className="rounded bg-red-50 p-2 text-sm font-medium text-red-700">{tr.nest.validationFailed}</p>}

      {m && r && (
        <>
          <h2 className="mt-1 text-sm font-semibold uppercase tracking-wide text-slate-500">{tr.metrics.heading}</h2>
          {r.unplaced.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-2 text-sm text-red-800">
              <p className="font-semibold">
                ⚠ {tr.metrics.unplaced}: {r.unplaced.length}
              </p>
              <ul className="mt-1 max-h-32 overflow-y-auto text-xs">
                {summarizeUnplaced(r.unplaced, nest.names ?? {}).map((u) => (
                  <li key={u.key}>
                    {u.name} × {u.count} — {tr.metrics.unplacedReason[u.reason]}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <Stat label={tr.metrics.sheetsUsed} value={String(m.sheetCount)} />
            <Stat label={tr.metrics.efficiency} value={tr.format.percent(m.efficiency)} tone="good" />
            <Stat label={tr.metrics.lastSheetEfficiency} value={tr.format.percent(m.lastSheetEfficiency)} />
            <Stat label={tr.metrics.lastSheetLength} value={`${tr.format.mm(m.lastSheetUsedLength)} mm`} />
            <Stat label={tr.metrics.scrapArea} value={tr.format.m2(m.scrapArea)} />
            <Stat
              label={tr.metrics.scrapWeight}
              value={tr.format.kg(scrapWeightKg(m.scrapArea, sheet.thickness, densityOf(sheet.material)))}
            />
            <Stat label={tr.metrics.elapsed} value={tr.format.seconds(r.elapsedMs)} />
          </dl>
          <p className="text-xs text-slate-500">{tr.metrics.placed(m.placedCount, m.totalCount)}</p>
          <p className="text-xs text-slate-400">{tr.nest.method}</p>
        </>
      )}

      <h2 className="mt-1 text-sm font-semibold uppercase tracking-wide text-slate-500">{tr.metrics.importHeading}</h2>
      <dl className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        <Stat label={tr.metrics.partTypes} value={String(parts.length)} />
        <Stat label={tr.metrics.totalCopies} value={String(totalCopies)} />
        <Stat label={tr.metrics.totalArea} value={tr.format.area(parts.reduce((s, p) => s + p.area, 0))} />
        {open > 0 && <Stat label={tr.metrics.openContours} value={String(open)} tone="bad" />}
      </dl>
    </div>
  );
}

function summarizeUnplaced(list: { partId: string; reason: 'TOO_LARGE' | 'NO_SHEET_LEFT' }[], names: Record<string, string>) {
  const map = new Map<string, { key: string; name: string; count: number; reason: 'TOO_LARGE' | 'NO_SHEET_LEFT' }>();
  for (const u of list) {
    const key = `${u.partId}|${u.reason}`;
    const e = map.get(key);
    if (e) e.count++;
    else map.set(key, { key, name: names[u.partId] ?? u.partId, count: 1, reason: u.reason });
  }
  return [...map.values()];
}
