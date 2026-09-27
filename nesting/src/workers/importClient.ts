import type { ImportOptions } from '../core/dxf/types';
import { createWorkerClient } from './client';
import type { ImportResponse, ImportWorkerApi } from './import.worker';

export type ClientResponse = ImportResponse | { ok: false; code: 'WORKER_CRASHED'; detail?: string };

const client = createWorkerClient<ImportWorkerApi>(
  () => new Worker(new URL('./import.worker.ts', import.meta.url), { type: 'module', name: 'dxf-import' }),
);

export async function importInWorker(text: string, fileName: string, options?: Partial<ImportOptions>): Promise<ClientResponse> {
  try {
    return await client.call((api) => api.importDxf(text, fileName, options) as Promise<ImportResponse>);
  } catch (err) {
    return { ok: false, code: 'WORKER_CRASHED', detail: err instanceof Error ? err.message : String(err) };
  }
}
