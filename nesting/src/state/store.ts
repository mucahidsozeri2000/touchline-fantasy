import { create } from 'zustand';
import type { DxfImportResult, ImportWarning } from '../core/dxf/types';
import { importInWorker } from '../workers/importClient';
import { sampleDxf } from '../samples/shapes';
import { tr } from '../i18n/tr';

export interface LoadedFile {
  id: string;
  name: string;
  status: 'loading' | 'ok' | 'error';
  result?: DxfImportResult;
  /** Kullanıcının elle seçtiği $INSUNITS kodu (dosyadakini geçersiz kılar). */
  forceUnits?: number;
  /** Türkçe hata mesajı (status === 'error'). */
  error?: string;
}

interface AppState {
  files: LoadedFile[];
  /** Dosya seçimi sırasında atlanan (DXF olmayan) dosyalar için bildirimler. */
  notices: string[];
  hoveredPartId: string | null;
  addFiles(files: File[]): Promise<void>;
  loadSample(): Promise<void>;
  removeFile(id: string): void;
  setFileUnits(id: string, code: number): Promise<void>;
  clearAll(): void;
  dismissNotice(i: number): void;
  setHoveredPart(id: string | null): void;
}

let seq = 0;
const newId = () => `f${++seq}`;

/** Dosya metinleri state dışında tutulur (büyük olabilir; birim değişince yeniden okunur). */
const texts = new Map<string, string>();

async function runImport(id: string, text: string, name: string, forceUnits?: number) {
  texts.set(id, text);
  const res = await importInWorker(text, name, forceUnits === undefined ? {} : { forceUnits });
  useApp.setState((s) => ({
    files: s.files.map((f) =>
      f.id !== id
        ? f
        : res.ok
          ? { ...f, status: 'ok', result: prefixIds(res.result, id) }
          : { ...f, status: 'error', error: tr.importError(res.code, res.detail) },
    ),
  }));
}

/** Aynı dosya iki kez yüklenirse parça kimlikleri çakışmasın. */
function prefixIds(r: DxfImportResult, fileId: string): DxfImportResult {
  return { ...r, parts: r.parts.map((p) => ({ ...p, id: `${fileId}:${p.id}` })) };
}

export const useApp = create<AppState>((set) => ({
  files: [],
  notices: [],
  hoveredPartId: null,

  async addFiles(list) {
    const dxfs: File[] = [];
    const notices: string[] = [];
    for (const f of list) {
      if (/\.dxf$/i.test(f.name)) dxfs.push(f);
      else notices.push(tr.drop.notDxf(f.name));
    }
    if (notices.length) set((s) => ({ notices: [...s.notices, ...notices] }));
    const entries = dxfs.map((file) => ({ file, id: newId() }));
    set((s) => ({
      files: [...s.files, ...entries.map(({ file, id }) => ({ id, name: file.name, status: 'loading' as const }))],
    }));
    await Promise.all(
      entries.map(async ({ file, id }) => {
        let text: string;
        try {
          text = await file.text();
        } catch {
          set((s) => ({
            files: s.files.map((f) => (f.id === id ? { ...f, status: 'error', error: tr.importError('READ_FAILED') } : f)),
          }));
          return;
        }
        await runImport(id, text, file.name);
      }),
    );
  },

  async loadSample() {
    const id = newId();
    const name = 'ornek-parcalar.dxf';
    set((s) => ({ files: [...s.files, { id, name, status: 'loading' }] }));
    await runImport(id, sampleDxf(), name);
  },

  removeFile(id) {
    texts.delete(id);
    set((s) => ({ files: s.files.filter((f) => f.id !== id) }));
  },
  async setFileUnits(id, code) {
    const text = texts.get(id);
    const file = useApp.getState().files.find((f) => f.id === id);
    if (!text || !file) return;
    set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, status: 'loading', forceUnits: code } : f)) }));
    await runImport(id, text, file.name, code);
  },
  clearAll() {
    texts.clear();
    set({ files: [], notices: [], hoveredPartId: null });
  },
  dismissNotice(i) {
    set((s) => ({ notices: s.notices.filter((_, k) => k !== i) }));
  },
  setHoveredPart(id) {
    set({ hoveredPartId: id });
  },
}));

export const allWarnings = (files: LoadedFile[]): ImportWarning[] => files.flatMap((f) => f.result?.warnings ?? []);
