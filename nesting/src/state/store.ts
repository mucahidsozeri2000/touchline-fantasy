import { create } from 'zustand';
import type { DxfImportResult, ImportWarning, ImportedPart } from '../core/dxf/types';
import { DEFAULT_IMPORT_OPTIONS } from '../core/dxf/types';
import type { MaterialId } from '../core/materials';
import { type RotationMode, expandRotations } from '../core/placement/rotations';
import type { Gravity, NestInput, NestPart, NestResult } from '../core/placement/types';
import { tr } from '../i18n/tr';
import { sampleDxf } from '../samples/shapes';
import { importInWorker } from '../workers/importClient';
import { cancelNest, nestInWorker } from '../workers/nestClient';

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

export interface PartSettings {
  quantity: number;
  rotation: RotationMode;
  /** Serbest dönüşte adım açısı (derece). */
  rotationStep: number;
  mirror: boolean;
  /** 0 = normal, 1 = yüksek, 2 = acil. */
  priority: number;
}

export const DEFAULT_PART_SETTINGS: PartSettings = {
  quantity: 1,
  rotation: 'quarter',
  rotationStep: 15,
  mirror: false,
  priority: 0,
};

export type SheetTemplate = '1000x2000' | '1250x2500' | '1500x3000' | 'custom';

/** Şablon "genişlik × uzunluk": Y = genişlik, X = uzunluk. */
export const SHEET_TEMPLATES: Record<Exclude<SheetTemplate, 'custom'>, { sizeX: number; sizeY: number }> = {
  '1000x2000': { sizeX: 2000, sizeY: 1000 },
  '1250x2500': { sizeX: 2500, sizeY: 1250 },
  '1500x3000': { sizeX: 3000, sizeY: 1500 },
};

export interface SheetSettings {
  template: SheetTemplate;
  sizeX: number;
  sizeY: number;
  unlimited: boolean;
  count: number;
  margin: number;
  gap: number;
  kerf: number;
  material: MaterialId;
  thickness: number;
  gravity: Gravity;
  simplifyTolerance: number;
}

export const DEFAULT_SHEET: SheetSettings = {
  template: '1500x3000',
  ...SHEET_TEMPLATES['1500x3000'],
  unlimited: true,
  count: 5,
  margin: 10,
  gap: 5,
  kerf: 0.2,
  material: 'dkp',
  thickness: 2,
  gravity: 'left',
  simplifyTolerance: 0.1,
};

export interface NestState {
  status: 'idle' | 'running' | 'done' | 'error';
  result?: NestResult;
  error?: string;
  /** Sonucun hesaplandığı girdi sürümü; güncel sürümden farklıysa sonuç eskidir. */
  inputVersion?: number;
  /** Parça id → ad (sonuç, parçalar sonradan silinse de okunabilsin). */
  names?: Record<string, string>;
  /** Sonucun hesaplandığı sac (ayarlar sonradan değişse de doğru çizilsin). */
  sheet?: NestInput['sheet'];
  startedAt?: number;
}

export type ViewMode = 'parts' | 'sheets';

interface AppState {
  files: LoadedFile[];
  notices: string[];
  hoveredPartId: string | null;
  partSettings: Record<string, PartSettings>;
  sheet: SheetSettings;
  /** Nesting girdisini etkileyen her değişiklikte artar. */
  inputVersion: number;
  nest: NestState;
  view: ViewMode;
  activeSheet: number;
  showOffset: boolean;

  addFiles(files: File[]): Promise<void>;
  loadSample(): Promise<void>;
  removeFile(id: string): void;
  setFileUnits(id: string, code: number): Promise<void>;
  clearAll(): void;
  dismissNotice(i: number): void;
  setHoveredPart(id: string | null): void;
  updatePart(id: string, patch: Partial<PartSettings>): void;
  updateSheet(patch: Partial<SheetSettings>): void;
  runNest(): Promise<void>;
  stopNest(): void;
  setView(v: ViewMode): void;
  setActiveSheet(i: number): void;
  setShowOffset(v: boolean): void;
}

let seq = 0;
const newId = () => `f${++seq}`;

/** Dosya metinleri state dışında tutulur (büyük olabilir; birim değişince yeniden okunur). */
const texts = new Map<string, string>();

/** Rapor/ağırlık dışındaki sac ayarları nesting girdisini etkiler. */
const NON_INPUT_SHEET_KEYS: (keyof SheetSettings)[] = ['material', 'thickness'];

async function runImport(id: string, text: string, name: string, forceUnits?: number) {
  texts.set(id, text);
  const res = await importInWorker(text, name, forceUnits === undefined ? {} : { forceUnits });
  useApp.setState((s) => ({
    inputVersion: s.inputVersion + 1,
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

export const allParts = (files: LoadedFile[]): ImportedPart[] => files.flatMap((f) => f.result?.parts ?? []);

export const partSettingsOf = (s: Pick<AppState, 'partSettings'>, id: string): PartSettings =>
  s.partSettings[id] ?? DEFAULT_PART_SETTINGS;

export function buildNestInput(s: Pick<AppState, 'files' | 'partSettings' | 'sheet'>): NestInput {
  const parts: NestPart[] = allParts(s.files).map((p) => {
    const ps = partSettingsOf(s, p.id);
    return {
      id: p.id,
      name: p.name,
      outer: p.outer.ring,
      holes: p.holes.map((h) => h.ring),
      area: p.area,
      quantity: Math.max(0, Math.floor(ps.quantity)),
      rotations: expandRotations(ps.rotation, ps.rotationStep),
      allowMirror: ps.mirror,
      priority: ps.priority,
    };
  });
  const sh = s.sheet;
  return {
    parts,
    sheet: { sizeX: sh.sizeX, sizeY: sh.sizeY, count: sh.unlimited ? null : Math.max(1, Math.floor(sh.count)), margin: sh.margin },
    settings: {
      gap: sh.gap,
      kerf: sh.kerf,
      gravity: sh.gravity,
      simplifyTolerance: sh.simplifyTolerance,
      chordTolerance: DEFAULT_IMPORT_OPTIONS.chordTolerance,
    },
  };
}

export const useApp = create<AppState>((set, get) => ({
  files: [],
  notices: [],
  hoveredPartId: null,
  partSettings: {},
  sheet: DEFAULT_SHEET,
  inputVersion: 0,
  nest: { status: 'idle' },
  view: 'parts',
  activeSheet: 0,
  showOffset: false,

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
    set((s) => ({ files: s.files.filter((f) => f.id !== id), inputVersion: s.inputVersion + 1 }));
  },
  async setFileUnits(id, code) {
    const text = texts.get(id);
    const file = get().files.find((f) => f.id === id);
    if (!text || !file) return;
    set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, status: 'loading', forceUnits: code } : f)) }));
    await runImport(id, text, file.name, code);
  },
  clearAll() {
    texts.clear();
    if (get().nest.status === 'running') cancelNest();
    set((s) => ({
      files: [],
      notices: [],
      hoveredPartId: null,
      partSettings: {},
      nest: { status: 'idle' },
      view: 'parts',
      activeSheet: 0,
      inputVersion: s.inputVersion + 1,
    }));
  },
  dismissNotice(i) {
    set((s) => ({ notices: s.notices.filter((_, k) => k !== i) }));
  },
  setHoveredPart(id) {
    if (get().hoveredPartId !== id) set({ hoveredPartId: id });
  },
  updatePart(id, patch) {
    set((s) => ({
      partSettings: { ...s.partSettings, [id]: { ...partSettingsOf(s, id), ...patch } },
      inputVersion: s.inputVersion + 1,
    }));
  },
  updateSheet(patch) {
    const affectsInput = Object.keys(patch).some((k) => !NON_INPUT_SHEET_KEYS.includes(k as keyof SheetSettings));
    set((s) => ({ sheet: { ...s.sheet, ...patch }, inputVersion: s.inputVersion + (affectsInput ? 1 : 0) }));
  },

  async runNest() {
    const s = get();
    if (s.nest.status === 'running') return;
    const input = buildNestInput(s);
    const names = Object.fromEntries(input.parts.map((p) => [p.id, p.name]));
    const version = s.inputVersion;
    const startedAt = performance.now();
    set({ nest: { ...s.nest, status: 'running', error: undefined, startedAt } });
    const res = await nestInWorker(input);
    // Bu arada durdurulduysa sonucu yok say.
    if (get().nest.status !== 'running' || get().nest.startedAt !== startedAt) return;
    if (res.ok) {
      if (res.result.validation.length) console.error('Yerleşim doğrulaması başarısız', res.result.validation);
      set({
        nest: { status: 'done', result: res.result, inputVersion: version, names, sheet: input.sheet, startedAt },
        view: 'sheets',
        activeSheet: 0,
      });
    } else {
      set({ nest: { status: 'error', error: tr.nest.failed(res.detail) } });
    }
  },
  stopNest() {
    if (get().nest.status !== 'running') return;
    cancelNest();
    set((s) => ({ nest: { ...s.nest, status: s.nest.result ? 'done' : 'idle' } }));
  },
  setView(v) {
    set({ view: v });
  },
  setActiveSheet(i) {
    set({ activeSheet: i });
  },
  setShowOffset(v) {
    set({ showOffset: v });
  },
}));

export const allWarnings = (files: LoadedFile[]): ImportWarning[] => files.flatMap((f) => f.result?.warnings ?? []);
