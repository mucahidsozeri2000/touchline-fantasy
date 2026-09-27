import { useMemo, useState } from 'react';
import type { ImportedPart, OpenContour } from '../core/dxf/types';
import { tr } from '../i18n/tr';
import { useApp } from '../state/store';
import { CanvasView } from './CanvasView';
import { DropZone } from './DropZone';
import { MetricsPanel } from './MetricsPanel';
import { PartList } from './PartList';
import { SheetSettingsPanel } from './SheetSettingsPanel';
import { galleryScene, sheetScene } from './canvas/scene';

type LeftTab = 'parts' | 'sheet';

function Tabs<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange(v: T): void }) {
  return (
    <div className="flex gap-1 rounded-lg bg-slate-200 p-1" role="tablist">
      {options.map(([k, label]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={`flex-1 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ${
            value === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function App() {
  const files = useApp((s) => s.files);
  const notices = useApp((s) => s.notices);
  const hoveredPartId = useApp((s) => s.hoveredPartId);
  const partSettings = useApp((s) => s.partSettings);
  const sheet = useApp((s) => s.sheet);
  const nest = useApp((s) => s.nest);
  const inputVersion = useApp((s) => s.inputVersion);
  const view = useApp((s) => s.view);
  const activeSheet = useApp((s) => s.activeSheet);
  const showOffset = useApp((s) => s.showOffset);
  const actions = useApp.getState();
  const [leftTab, setLeftTab] = useState<LeftTab>('parts');

  // Her parça tipine kalıcı bir renk indeksi (tüm dosyalar boyunca sıra).
  const { colorOf, partsById, gallery } = useMemo(() => {
    const colorOf = new Map<string, number>();
    const partsById = new Map<string, ImportedPart>();
    const parts: { part: ImportedPart; colorIndex: number }[] = [];
    const openGroups: { fileName: string; contours: OpenContour[] }[] = [];
    for (const f of files) {
      if (!f.result) continue;
      for (const p of f.result.parts) {
        colorOf.set(p.id, colorOf.size);
        partsById.set(p.id, p);
        parts.push({ part: p, colorIndex: colorOf.get(p.id)! });
      }
      if (f.result.openContours.length) openGroups.push({ fileName: f.name, contours: f.result.openContours });
    }
    return { colorOf, partsById, gallery: galleryScene(parts, openGroups, tr.canvas.openContour) };
  }, [files]);

  const result = nest.result;
  const sheetCount = result?.sheets.length ?? 0;
  const sheetIdx = Math.min(activeSheet, Math.max(0, sheetCount - 1));
  const scene = useMemo(() => {
    if (view === 'sheets' && result && nest.sheet) {
      return sheetScene(result, sheetIdx, nest.sheet, partsById, colorOf, nest.names ?? {});
    }
    return gallery;
  }, [view, result, nest.sheet, sheetIdx, partsById, colorOf, nest.names, gallery]);

  const fitKey =
    view === 'sheets' && result ? `sheet:${sheetIdx}:${nest.startedAt}` : `parts:${files.map((f) => f.id + f.status).join(',')}`;
  const stale = !!result && nest.inputVersion !== inputVersion;
  const hasFiles = files.length > 0;

  return (
    <div className="flex h-full flex-col bg-slate-100 text-slate-900">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <h1 className="whitespace-nowrap text-lg font-bold text-slate-800">{tr.appTitle}</h1>
        <span
          className="truncate rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200"
          title={tr.privacyTooltip}
        >
          🔒 {tr.privacyBadge}
        </span>
      </header>

      {notices.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-sm text-amber-800">
          {notices.map((n, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1">{n}</span>
              <button type="button" onClick={() => actions.dismissNotice(i)} className="text-amber-600 hover:text-amber-900" aria-label="Kapat">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {!hasFiles ? (
        <main className="flex-1 p-4 sm:p-8">
          <DropZone compact={false} onFiles={actions.addFiles} onSample={actions.loadSample} />
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="flex max-h-[50vh] w-full shrink-0 flex-col gap-3 overflow-y-auto border-b border-slate-200 bg-slate-50 p-3 lg:max-h-none lg:w-[26rem] lg:border-b-0 lg:border-r">
            <Tabs<LeftTab>
              value={leftTab}
              onChange={setLeftTab}
              options={[
                ['parts', tr.tabs.parts],
                ['sheet', tr.tabs.sheet],
              ]}
            />
            {leftTab === 'parts' ? (
              <>
                <DropZone compact onFiles={actions.addFiles} onSample={actions.loadSample} />
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{tr.parts.heading}</h2>
                  <button type="button" onClick={actions.clearAll} className="text-xs text-slate-500 hover:text-red-600">
                    {tr.parts.clearAll}
                  </button>
                </div>
                <PartList
                  files={files}
                  colorOf={colorOf}
                  partSettings={partSettings}
                  hoveredPartId={hoveredPartId}
                  onHoverPart={actions.setHoveredPart}
                  onRemoveFile={actions.removeFile}
                  onSetUnits={actions.setFileUnits}
                  onUpdatePart={actions.updatePart}
                />
              </>
            ) : (
              <SheetSettingsPanel sheet={sheet} onChange={actions.updateSheet} />
            )}
          </aside>

          <section className="relative flex min-h-[320px] flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-2 py-1.5">
              <div className="w-56">
                <Tabs
                  value={view}
                  onChange={actions.setView}
                  options={[
                    ['parts', tr.view.parts],
                    ['sheets', tr.view.sheets],
                  ]}
                />
              </div>
              {view === 'sheets' && sheetCount > 1 && (
                <div className="flex max-w-full gap-1 overflow-x-auto">
                  {result!.sheets.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => actions.setActiveSheet(i)}
                      className={`whitespace-nowrap rounded px-2.5 py-1 text-sm ${
                        i === sheetIdx ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {tr.view.sheetTab(i + 1)}
                    </button>
                  ))}
                </div>
              )}
              {view === 'sheets' && result && (
                <label className="ml-auto flex items-center gap-1 text-xs text-slate-600">
                  <input type="checkbox" checked={showOffset} onChange={(e) => actions.setShowOffset(e.target.checked)} />
                  {tr.view.showOffset}
                </label>
              )}
            </div>
            <div className="relative min-h-0 flex-1">
              {view === 'sheets' && !result ? (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">{tr.view.noResult}</div>
              ) : (
                <CanvasView
                  scene={scene}
                  fitKey={fitKey}
                  hoveredPartId={hoveredPartId}
                  showOffset={showOffset}
                  onHoverPart={actions.setHoveredPart}
                />
              )}
            </div>
          </section>

          <aside className="w-full shrink-0 overflow-y-auto border-t border-slate-200 bg-slate-50 p-3 lg:w-72 lg:border-l lg:border-t-0">
            <MetricsPanel
              files={files}
              nest={nest}
              stale={stale}
              sheet={sheet}
              partSettings={partSettings}
              onStart={actions.runNest}
              onStop={actions.stopNest}
            />
          </aside>
        </main>
      )}
    </div>
  );
}
