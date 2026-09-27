import type { NestInput } from '../core/placement/types';
import { WorkerCrashed, createWorkerClient } from './client';
import type { NestResponse, NestWorkerApi } from './nest.worker';

const client = createWorkerClient<NestWorkerApi>(
  () => new Worker(new URL('./nest.worker.ts', import.meta.url), { type: 'module', name: 'nest' }),
);

export type NestClientResponse = NestResponse | { ok: false; crashed: true; detail: string };

export async function nestInWorker(input: NestInput): Promise<NestClientResponse> {
  try {
    return await client.call((api) => api.nest(input) as Promise<NestResponse>);
  } catch (err) {
    return { ok: false, crashed: true, detail: err instanceof WorkerCrashed ? err.message : String(err) };
  }
}

export const cancelNest = () => client.terminate();
