/**
 * DXF okuma worker'ı. Büyük dosyalarda ayrıştırma + zincirleme saniyeler
 * sürebilir; ana thread'i bloklamamak için burada çalışır.
 */
import * as Comlink from 'comlink';
import { importDxf } from '../core/dxf/import';
import { DxfImportError, type DxfImportResult, type ImportErrorCode, type ImportOptions } from '../core/dxf/types';

export type ImportResponse =
  | { ok: true; result: DxfImportResult }
  | { ok: false; code: ImportErrorCode | 'UNKNOWN'; detail?: string };

const api = {
  importDxf(text: string, fileName: string, options?: Partial<ImportOptions>): ImportResponse {
    try {
      return { ok: true, result: importDxf(text, fileName, options) };
    } catch (err) {
      // Hataları yapılandırılmış döndür: mesajı arayüz Türkçeleştirir.
      if (err instanceof DxfImportError) return { ok: false, code: err.code, detail: err.detail };
      return { ok: false, code: 'UNKNOWN', detail: err instanceof Error ? err.message : String(err) };
    }
  },
};

export type ImportWorkerApi = typeof api;

Comlink.expose(api);
