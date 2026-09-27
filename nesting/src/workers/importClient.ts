/**
 * Import worker'ı için ana thread istemcisi. Worker çökerse (ör. bellek
 * yetersizliği) bekleyen istek anlaşılır bir hata koduyla sonlanır ve bir
 * sonraki istekte worker yeniden oluşturulur.
 */
import * as Comlink from 'comlink';
import type { ImportOptions } from '../core/dxf/types';
import type { ImportResponse, ImportWorkerApi } from './import.worker';

export type ClientResponse = ImportResponse | { ok: false; code: 'WORKER_CRASHED'; detail?: string };

let worker: Worker | null = null;
let remote: Comlink.Remote<ImportWorkerApi> | null = null;
let crashListeners: ((detail: string) => void)[] = [];

function ensureWorker(): Comlink.Remote<ImportWorkerApi> {
  if (remote) return remote;
  worker = new Worker(new URL('./import.worker.ts', import.meta.url), { type: 'module', name: 'dxf-import' });
  worker.addEventListener('error', (e) => {
    const detail = e.message || 'worker error';
    const listeners = crashListeners;
    crashListeners = [];
    listeners.forEach((l) => l(detail));
    worker?.terminate();
    worker = null;
    remote = null;
  });
  remote = Comlink.wrap<ImportWorkerApi>(worker);
  return remote;
}

export function importInWorker(text: string, fileName: string, options?: Partial<ImportOptions>): Promise<ClientResponse> {
  const api = ensureWorker();
  return new Promise<ClientResponse>((resolve) => {
    const onCrash = (detail: string) => resolve({ ok: false, code: 'WORKER_CRASHED', detail });
    crashListeners.push(onCrash);
    api
      .importDxf(text, fileName, options)
      .then(resolve, (err: unknown) =>
        resolve({ ok: false, code: 'WORKER_CRASHED', detail: err instanceof Error ? err.message : String(err) }),
      )
      .finally(() => {
        crashListeners = crashListeners.filter((l) => l !== onCrash);
      });
  });
}
