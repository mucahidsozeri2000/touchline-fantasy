/**
 * Nesting worker'ı. M2: referans bounding-box yerleştirme.
 * M4'te bu worker havuzlaşacak ve GA değerlendirmelerini paralel yapacak.
 */
import * as Comlink from 'comlink';
import { bboxNest } from '../core/placement/bboxNest';
import type { NestInput, NestResult } from '../core/placement/types';

export type NestResponse = { ok: true; result: NestResult } | { ok: false; detail: string };

const api = {
  nest(input: NestInput): NestResponse {
    try {
      return { ok: true, result: bboxNest(input) };
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : String(err) };
    }
  },
};

export type NestWorkerApi = typeof api;

Comlink.expose(api);
