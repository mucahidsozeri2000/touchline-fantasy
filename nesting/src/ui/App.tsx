import { useMemo } from 'react';
import type { ImportedPart, OpenContour } from '../core/dxf/types';
import { tr } from '../i18n/tr';
import { useApp } from '../state/store';
import { CanvasView } from './CanvasView';
import { DropZone } from './DropZone';
import { PartList } from './PartList';
import { SummaryPanel } from './SummaryPanel';
import { layoutGallery } from './canvas/gallery';

export function App() {
  const files = useApp((s) => s.files);
  const notices = useApp((s) => s.notices);
  const hoveredPartId = useApp((s) => s.hoveredPartId);
  const { addFiles, loadSample, removeFile, clearAll, dismissNotice, setHoveredPart, setFileUnits } = useApp.getState();

  // Her parça tipine kalıcı bir renk indeksi (tüm dosyalar boyunca sıra).
  const { colorOf, gallery } = useMemo(() => {
    const colorOf = new Map<string, number>();
    const parts: { part: ImportedPart; colorIndex: number }[] = [];
    const openGroups: { fileName: string; contours: OpenContour[] }[] = [];
    for (const f of files) {
      if (!f.result) continue;
      for (const p of f.result.parts) {
        colorOf.set(p.id, colorOf.size);
        parts.push({ part: p, colorIndex: colorOf.get(p.id)! });
      }
      if (f.result.openContours.length) openGroups.push({ fileName: f.name, contours: f.result.openContours });
    }
    return { colorOf, gallery: layoutGallery({ parts, openGroups }) };
  }, [files]);

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
              <button type="button" onClick={() => dismissNotice(i)} className="text-amber-600 hover:text-amber-900" aria-label="Kapat">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {!hasFiles ? (
        <main className="flex-1 p-4 sm:p-8">
          <DropZone compact={false} onFiles={addFiles} onSample={loadSample} />
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="flex max-h-[45vh] w-full shrink-0 flex-col gap-3 overflow-y-auto border-b border-slate-200 bg-slate-50 p-3 lg:max-h-none lg:w-96 lg:border-b-0 lg:border-r">
            <DropZone compact onFiles={addFiles} onSample={loadSample} />
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{tr.parts.heading}</h2>
              <button type="button" onClick={clearAll} className="text-xs text-slate-500 hover:text-red-600">
                {tr.parts.clearAll}
              </button>
            </div>
            <PartList
              files={files}
              colorOf={colorOf}
              hoveredPartId={hoveredPartId}
              onHoverPart={setHoveredPart}
              onRemoveFile={removeFile}
              onSetUnits={setFileUnits}
            />
          </aside>
          <section className="relative min-h-[300px] flex-1">
            <CanvasView
              items={gallery.items}
              bounds={gallery.bounds}
              hoveredPartId={hoveredPartId}
              onHoverPart={setHoveredPart}
            />
          </section>
          <aside className="w-full shrink-0 border-t border-slate-200 bg-slate-50 p-3 lg:w-64 lg:border-l lg:border-t-0">
            <SummaryPanel files={files} />
          </aside>
        </main>
      )}
    </div>
  );
}
