import { useRef, useState } from 'react';
import { tr } from '../i18n/tr';

interface Props {
  compact: boolean;
  onFiles(files: File[]): void;
  onSample(): void;
}

/**
 * Sürükle-bırak alanı. Dosyalar yalnızca FileReader/Blob.text() ile yerelde
 * okunur; hiçbir yere yüklenmez.
 */
export function DropZone({ compact, onFiles, onSample }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      const files = [...e.dataTransfer.files];
      if (files.length) onFiles(files);
    },
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept=".dxf,.DXF"
      multiple
      className="hidden"
      onChange={(e) => {
        const files = [...(e.target.files ?? [])];
        e.target.value = '';
        if (files.length) onFiles(files);
      }}
    />
  );

  if (compact) {
    return (
      <button
        type="button"
        {...handlers}
        onClick={() => inputRef.current?.click()}
        className={`w-full rounded-lg border-2 border-dashed px-3 py-3 text-sm font-medium transition ${
          over ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-300 text-slate-600 hover:border-sky-400 hover:bg-slate-50'
        }`}
      >
        {over ? tr.drop.dragging : tr.drop.compact}
        {input}
      </button>
    );
  }

  return (
    <div
      {...handlers}
      className={`flex h-full w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-8 text-center transition ${
        over ? 'border-sky-500 bg-sky-50' : 'border-slate-300 bg-white'
      }`}
    >
      <svg viewBox="0 0 48 48" className="h-14 w-14 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M14 30 24 20l10 10M24 20v20" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 34a8 8 0 0 1 1-16 11 11 0 0 1 21-3 9 9 0 0 1 6 17" strokeLinecap="round" />
      </svg>
      <div>
        <p className="text-lg font-semibold text-slate-800">{over ? tr.drop.dragging : tr.drop.title}</p>
        <p className="text-sm text-slate-500">{tr.drop.subtitle}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-sky-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-sky-700"
        >
          {tr.drop.choose}
        </button>
        <button
          type="button"
          onClick={onSample}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
        >
          {tr.drop.sample}
        </button>
      </div>
      <p className="max-w-sm text-xs text-slate-500">🔒 {tr.privacyTooltip}</p>
      {input}
    </div>
  );
}
